// src/features/proyectos/components/MiembrosProyectoModal.tsx
/**
 * Modal para gestionar los miembros de un proyecto.
 *
 * - Lista los miembros actuales con su rol (nombre/email resueltos por
 *   el backend desde la Tanda B23: MiembroProyecto trae nombre_usuario
 *   y email_usuario).
 * - Permite al PROPIETARIO cambiar roles y quitar miembros.
 * - Permite agregar un miembro con BUSCADOR (Tanda B23): consulta
 *   GET /proyectos/{id}/candidatos?buscar= (usuarios activos que aún no
 *   son miembros) con debounce de 300 ms.
 *
 * ⚠️ YA NO se llama `usuariosApi.listar` (GET /usuarios): ese endpoint
 * es solo-ADMIN y un PROPIETARIO con rol global DESARROLLADOR recibía
 * 403 (punto 4 del reporte de pruebas del 2026-11-07). Si el endpoint
 * de candidatos falla igualmente (backend viejo, red), cae al input
 * manual del id para no bloquear el flujo.
 *
 * Contrato Ciclo 2 (proyecto_schema.py):
 * - MiembroProyecto es EMBEBIDO: solo trae id_usuario + rol_en_proyecto
 *   + joined_at (+ datos visuales B23) — SIN id propio. El miembro se
 *   identifica por id_usuario en los endpoints de miembros.
 */

import { useEffect, useState, type FormEvent } from 'react';

import Avatar from '@/components/Avatar';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { proyectosApi } from '@/api';
import { useAuthStore, useProyectoStore, toast } from '@/store';
import type {
  Id,
  MiembroProyecto,
  RolEnProyecto,
  UsuarioCandidato,
} from '@/types';

// ======================================================================
// Tipos
// ======================================================================
interface MiembrosProyectoModalProps {
  open: boolean;
  onClose: () => void;
  proyectoId: Id;
}

const ROLES: RolEnProyecto[] = ['PROPIETARIO', 'EDITOR', 'LECTOR'];

const ROL_LABEL: Record<RolEnProyecto, string> = {
  PROPIETARIO: 'Propietario',
  EDITOR: 'Editor',
  LECTOR: 'Lector',
};

/** Milisegundos de espera tras la última tecla antes de buscar. */
const DEBOUNCE_MS = 300;
/** Límite del backend para candidatos (1..50). */
const LIMIT_CANDIDATOS = 50;

// ======================================================================
// Componente
// ======================================================================
export function MiembrosProyectoModal({
  open,
  onClose,
  proyectoId,
}: MiembrosProyectoModalProps) {
  const proyectoActivo = useProyectoStore((s) => s.proyectoActivo);
  const cargarProyectoActivo = useProyectoStore((s) => s.cargarProyectoActivo);
  const agregarMiembro = useProyectoStore((s) => s.agregarMiembro);
  const cambiarRolMiembro = useProyectoStore((s) => s.cambiarRolMiembro);
  const quitarMiembro = useProyectoStore((s) => s.quitarMiembro);

  const usuarioActual = useAuthStore((s) => s.usuario);

  const [idUsuarioNuevo, setIdUsuarioNuevo] = useState('');
  const [rolNuevo, setRolNuevo] = useState<RolEnProyecto>('EDITOR');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Tanda B23: buscador de candidatos -------------------------------
  const [busqueda, setBusqueda] = useState('');
  const [candidatos, setCandidatos] = useState<UsuarioCandidato[]>([]);
  const [cargandoCandidatos, setCargandoCandidatos] = useState(false);
  const [errorCandidatos, setErrorCandidatos] = useState<string | null>(null);
  // Modo degradado: si /candidatos falla, se habilita el input manual.
  const [usarInputManual, setUsarInputManual] = useState(false);

  const miembros = proyectoActivo?.miembros ?? [];

  // Rol del usuario actual en este proyecto
  const miMiembro = miembros.find((m) => m.id_usuario === usuarioActual?.id);
  const puedoGestionar = miMiembro?.rol_en_proyecto === 'PROPIETARIO';

  // Cargar miembros al abrir (el store protege contra recargas del
  // mismo id con `idCargado`) + resetear el buscador al cerrar.
  useEffect(() => {
    if (!open || !proyectoId) return;
    void cargarProyectoActivo(proyectoId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, proyectoId]);

  useEffect(() => {
    if (!open) {
      setBusqueda('');
      setCandidatos([]);
      setErrorCandidatos(null);
      setUsarInputManual(false);
      setIdUsuarioNuevo('');
      setRolNuevo('EDITOR');
      setError(null);
    }
  }, [open]);

  // ------------------------------------------------------------------
  // Búsqueda de candidatos con debounce (solo si puedoGestionar: el
  // endpoint exige PROPIETARIO o ADMIN — para el resto daría 403).
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!open || !puedoGestionar || usarInputManual) return;

    let vigente = true;
    const temporizador = setTimeout(() => {
      setCargandoCandidatos(true);
      setErrorCandidatos(null);
      proyectosApi
        .listarCandidatos(proyectoId, {
          buscar: busqueda.trim() || undefined,
          limit: LIMIT_CANDIDATOS,
        })
        .then((items) => {
          if (vigente) setCandidatos(items);
        })
        .catch(() => {
          if (vigente) {
            setErrorCandidatos(
              'No se pudo cargar la lista de usuarios; ingresá el ID manualmente.'
            );
            setUsarInputManual(true);
            setCandidatos([]);
          }
        })
        .finally(() => {
          if (vigente) setCargandoCandidatos(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      vigente = false;
      clearTimeout(temporizador);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, proyectoId, busqueda, puedoGestionar, usarInputManual]);

  // ------------------------------------------------------------------
  // Nombre visible de un miembro: el backend B23 lo resuelve; si no
  // pudo (usuario borrado), cae al usuario de la sesión o al id.
  // ------------------------------------------------------------------
  function nombreDeMiembro(m: MiembroProyecto): string {
    if (m.nombre_usuario) return m.nombre_usuario;
    if (m.id_usuario === usuarioActual?.id) {
      return usuarioActual?.nombre_completo ?? 'Vos';
    }
    return `Usuario ${m.id_usuario}`;
  }

  // ------------------------------------------------------------------
  // Agregar miembro (firma del store: agregarMiembro(proyectoId,
  // idUsuario, rol?) — el id va como string hex, sin parseInt)
  // ------------------------------------------------------------------
  async function handleAgregar(e: FormEvent) {
    e.preventDefault();
    if (isLoading) return;

    const id = idUsuarioNuevo.trim();
    if (!id) {
      setError('Seleccioná un usuario de la lista');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await agregarMiembro(proyectoId, id, rolNuevo);
      toast.success('Miembro agregado');
      setIdUsuarioNuevo('');
      setRolNuevo('EDITOR');
      // Refrescar la lista para que el nuevo miembro aparezca con su
      // nombre (y los candidatos se recargan: ya no es candidato).
      await cargarProyectoActivo(proyectoId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo agregar el miembro'
      );
    } finally {
      setIsLoading(false);
    }
  }

  // ------------------------------------------------------------------
  // Cambiar rol ({miembro_id} de la ruta == id_usuario)
  // ------------------------------------------------------------------
  async function handleCambiarRol(idUsuario: Id, nuevoRol: RolEnProyecto) {
    try {
      await cambiarRolMiembro(proyectoId, idUsuario, nuevoRol);
      toast.success('Rol actualizado');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo cambiar el rol'
      );
    }
  }

  // ------------------------------------------------------------------
  // Quitar miembro (por id_usuario)
  // ------------------------------------------------------------------
  async function handleQuitar(miembro: MiembroProyecto) {
    const esYoMismo = miembro.id_usuario === usuarioActual?.id;
    const nombre = nombreDeMiembro(miembro);
    const mensaje = esYoMismo
      ? '¿Seguro que querés salir del proyecto?'
      : `¿Quitar a ${nombre} del proyecto?`;

    if (!window.confirm(mensaje)) return;

    try {
      await quitarMiembro(proyectoId, miembro.id_usuario);
      toast.success(esYoMismo ? 'Saliste del proyecto' : 'Miembro quitado');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo quitar al miembro'
      );
    }
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Miembros del proyecto"
      description="Gestioná quién puede colaborar en este proyecto."
      size="lg"
    >
      {/* -------- Lista de miembros -------- */}
      <div className="space-y-2">
        {miembros.length === 0 && (
          <p className="text-sm text-surface-400">Sin miembros cargados…</p>
        )}

        {miembros.map((m) => {
          const esYo = m.id_usuario === usuarioActual?.id;
          const esPropietario = m.rol_en_proyecto === 'PROPIETARIO';
          const nombre = nombreDeMiembro(m);
          const email = m.email_usuario ?? (esYo ? usuarioActual?.email : null);

          return (
            <div
              key={m.id_usuario}
              className="flex items-center gap-3 rounded-md border border-surface-800 bg-surface-900/40 p-3"
            >
              <Avatar id={m.id_usuario} nombre={nombre} size="md" />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-surface-100">
                  {nombre}{' '}
                  {esYo && <span className="text-surface-500">(vos)</span>}
                </p>
                {email && (
                  <p className="truncate text-xs text-surface-500">{email}</p>
                )}
              </div>

              {/* Rol: select si puedo gestionar, texto si no */}
              {puedoGestionar && !esPropietario ? (
                <select
                  value={m.rol_en_proyecto}
                  onChange={(e) =>
                    void handleCambiarRol(m.id_usuario, e.target.value as RolEnProyecto)
                  }
                  className="input-base h-8 w-32 py-0 text-xs"
                >
                  {ROLES.filter((r) => r !== 'PROPIETARIO').map((r) => (
                    <option key={r} value={r}>
                      {ROL_LABEL[r]}
                    </option>
                  ))}
                </select>
              ) : (
                <span
                  className={[
                    'rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                    esPropietario
                      ? 'bg-brand-600/20 text-brand-300'
                      : 'bg-surface-700 text-surface-300',
                  ].join(' ')}
                >
                  {ROL_LABEL[m.rol_en_proyecto]}
                </span>
              )}

              {/* Quitar: PROPIETARIO solo si no es el propietario; otros
                  siempre si puedo gestionar o soy yo */}
              {!esPropietario && (puedoGestionar || esYo) && (
                <button
                  type="button"
                  onClick={() => void handleQuitar(m)}
                  className="flex-shrink-0 rounded-md p-1.5 text-surface-500 hover:bg-danger/10 hover:text-danger"
                  aria-label="Quitar miembro"
                  title={esYo ? 'Salir del proyecto' : 'Quitar miembro'}
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* -------- Agregar miembro (solo PROPIETARIO) -------- */}
      {puedoGestionar && (
        <div className="mt-6 border-t border-surface-800 pt-4">
          <h3 className="mb-3 text-sm font-semibold text-surface-200">
            Agregar miembro
          </h3>

          {error && (
            <div
              role="alert"
              className="mb-3 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger"
            >
              {error}
            </div>
          )}

          <form
            onSubmit={handleAgregar}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <div className="flex-1 space-y-2">
              {usarInputManual ? (
                // Modo degradado: /candidatos falló (backend viejo o red).
                <input
                  type="text"
                  value={idUsuarioNuevo}
                  onChange={(e) => {
                    setIdUsuarioNuevo(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="ID del usuario (ObjectId)"
                  className="input-base w-full"
                  disabled={isLoading}
                />
              ) : (
                <>
                  {/* Buscador: filtra por nombre o email con debounce */}
                  <input
                    type="search"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar usuario por nombre o email…"
                    className="input-base w-full"
                    disabled={isLoading}
                    autoComplete="off"
                  />
                  <select
                    value={idUsuarioNuevo}
                    onChange={(e) => {
                      setIdUsuarioNuevo(e.target.value);
                      if (error) setError(null);
                    }}
                    className="input-base w-full"
                    disabled={isLoading || cargandoCandidatos}
                    size={Math.min(Math.max(candidatos.length, 3), 6)}
                  >
                    <option value="">
                      {cargandoCandidatos
                        ? 'Buscando usuarios…'
                        : candidatos.length === 0
                          ? busqueda.trim()
                            ? 'Sin resultados para esa búsqueda'
                            : 'Todos los usuarios ya son miembros'
                          : `${candidatos.length} usuario(s) disponible(s) — elegí uno`}
                    </option>
                    {candidatos.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre_completo} ({u.email})
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>

            <select
              value={rolNuevo}
              onChange={(e) => setRolNuevo(e.target.value as RolEnProyecto)}
              className="input-base sm:w-32"
              disabled={isLoading}
            >
              {ROLES.filter((r) => r !== 'PROPIETARIO').map((r) => (
                <option key={r} value={r}>
                  {ROL_LABEL[r]}
                </option>
              ))}
            </select>

            <Button
              type="submit"
              variant="primary"
              loading={isLoading}
              disabled={!idUsuarioNuevo}
            >
              Agregar
            </Button>
          </form>

          {errorCandidatos && (
            <p className="mt-2 text-xs text-amber-400">{errorCandidatos}</p>
          )}

          <p className="mt-2 text-xs text-surface-500">
            Buscá por nombre o email (solo usuarios activos que aún no son
            miembros) y elegí el rol: Editor o Lector.
          </p>
        </div>
      )}
    </Modal>
  );
}

export default MiembrosProyectoModal;
