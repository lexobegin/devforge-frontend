// src/features/proyectos/components/MiembrosProyectoModal.tsx
/**
 * Modal para gestionar los miembros de un proyecto.
 *
 * - Lista los miembros actuales con su rol.
 * - Permite al PROPIETARIO cambiar roles y quitar miembros.
 * - Permite agregar un nuevo miembro por usuario (o por id).
 *
 * Contrato Ciclo 2 (proyecto_schema.py):
 * - MiembroProyecto es EMBEBIDO: solo trae id_usuario + rol_en_proyecto
 *   + joined_at — SIN id propio y SIN usuario anidado. El miembro se
 *   identifica por id_usuario en los endpoints de miembros.
 * - Los nombres/emails se resuelven en el cliente con la lista de
 *   usuarios cargada (solo-ADMIN) + el usuario de la sesión; si no se
 *   puede resolver, se muestra el id.
 */

import { useEffect, useMemo, useState, type FormEvent } from 'react';

import Avatar from '@/components/Avatar';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { usuariosApi } from '@/api';
import { useAuthStore, useProyectoStore, toast } from '@/store';
import type { Id, MiembroProyecto, RolEnProyecto, Usuario } from '@/types';

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

  const miembros = proyectoActivo?.miembros ?? [];

  // Rol del usuario actual en este proyecto
  const miMiembro = miembros.find((m) => m.id_usuario === usuarioActual?.id);
  const puedoGestionar = miMiembro?.rol_en_proyecto === 'PROPIETARIO';

  const [usuariosDisponibles, setUsuariosDisponibles] = useState<Usuario[]>([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [puedeListarUsuarios, setPuedeListarUsuarios] = useState(true);

  // Cargar miembros al abrir (el store protege contra recargas del
  // mismo id con `idCargado`)
  useEffect(() => {
    if (!open || !proyectoId) return;
    void cargarProyectoActivo(proyectoId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, proyectoId]);

  useEffect(() => {
    if (!open) return;

    async function cargarUsuarios() {
      setCargandoUsuarios(true);
      try {
        const { items } = await usuariosApi.listar({
          limit: 200,
          solo_activos: true,
        });
        setUsuariosDisponibles(items);
        setPuedeListarUsuarios(true);
      } catch {
        // Si no es ADMIN, el backend devuelve 403. Caemos al input de ID.
        setPuedeListarUsuarios(false);
        setUsuariosDisponibles([]);
      } finally {
        setCargandoUsuarios(false);
      }
    }

    void cargarUsuarios();
  }, [open]);

  // ------------------------------------------------------------------
  // Resolución de nombres: MiembroProyecto NO trae el usuario anidado,
  // así que armamos un mapa id → Usuario con la lista cargada (ADMIN)
  // y el usuario de la sesión.
  // ------------------------------------------------------------------
  const usuariosPorId = useMemo(() => {
    const mapa = new Map<Id, Usuario>();
    if (usuarioActual) mapa.set(usuarioActual.id, usuarioActual);
    for (const u of usuariosDisponibles) mapa.set(u.id, u);
    return mapa;
  }, [usuarioActual, usuariosDisponibles]);

  // ------------------------------------------------------------------
  // Agregar miembro (firma del store: agregarMiembro(proyectoId,
  // idUsuario, rol?) — el id va como string hex, sin parseInt)
  // ------------------------------------------------------------------
  async function handleAgregar(e: FormEvent) {
    e.preventDefault();
    if (isLoading) return;

    const id = idUsuarioNuevo.trim();
    if (!id) {
      setError('Seleccioná o ingresá un ID de usuario válido');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await agregarMiembro(proyectoId, id, rolNuevo);
      toast.success('Miembro agregado');
      setIdUsuarioNuevo('');
      setRolNuevo('EDITOR');
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
    const mensaje = esYoMismo
      ? '¿Seguro que querés salir del proyecto?'
      : `¿Quitar a este miembro del proyecto?`;

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
          const datos = usuariosPorId.get(m.id_usuario);
          const nombre = datos?.nombre_completo ?? `Usuario ${m.id_usuario}`;

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
                {datos?.email && (
                  <p className="truncate text-xs text-surface-500">
                    {datos.email}
                  </p>
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
            {puedeListarUsuarios ? (
              <select
                value={idUsuarioNuevo}
                onChange={(e) => {
                  setIdUsuarioNuevo(e.target.value);
                  if (error) setError(null);
                }}
                className="input-base flex-1"
                disabled={isLoading || cargandoUsuarios}
              >
                <option value="">
                  {cargandoUsuarios
                    ? 'Cargando usuarios…'
                    : 'Seleccioná un usuario…'}
                </option>
                {usuariosDisponibles
                  .filter((u) => !miembros.some((m) => m.id_usuario === u.id))
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre_completo} ({u.email})
                    </option>
                  ))}
              </select>
            ) : (
              // Sin permisos de listado (no-ADMIN): input manual del id
              // (string hex de ObjectId, no numérico)
              <input
                type="text"
                value={idUsuarioNuevo}
                onChange={(e) => {
                  setIdUsuarioNuevo(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="ID del usuario (no tenés permisos para listarlos)"
                className="input-base flex-1"
                disabled={isLoading}
              />
            )}

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

          <p className="mt-2 text-xs text-surface-500">
            El backend usa EDITOR por defecto; acá podés elegir Editor o
            Lector.
          </p>
        </div>
      )}
    </Modal>
  );
}

export default MiembrosProyectoModal;