// src/features/proyectos/components/MiembrosProyectoModal.tsx
/**
 * Modal para gestionar los miembros de un proyecto.
 *
 * - Lista los miembros actuales con su rol.
 * - Permite al PROPIETARIO cambiar roles y quitar miembros.
 * - Permite agregar un nuevo miembro por email.
 */

import { FormEvent, useEffect, useState } from 'react';

import Avatar from '@/components/Avatar';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { useAuthStore, useProyectoStore, toast } from '@/store';
import type { MiembroProyecto, RolEnProyecto } from '@/types';

// ======================================================================
// Tipos
// ======================================================================
interface MiembrosProyectoModalProps {
  open: boolean;
  onClose: () => void;
  proyectoId: number;
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

  // Cargar miembros al abrir
  /*useEffect(() => {
    if (open && proyectoId) {
      void cargarProyectoActivo(proyectoId);
    }
  }, [open, proyectoId, cargarProyectoActivo]);*/
  useEffect(() => {
    if (!open || !proyectoId) return;
    void cargarProyectoActivo(proyectoId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, proyectoId]);

  // ------------------------------------------------------------------
  // Agregar miembro
  // ------------------------------------------------------------------
  async function handleAgregar(e: FormEvent) {
    e.preventDefault();
    if (isLoading) return;

    const id = parseInt(idUsuarioNuevo, 10);
    if (!id || id <= 0) {
      setError('Ingresá un ID de usuario válido');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await agregarMiembro(proyectoId, {
        id_usuario: id,
        rol_en_proyecto: rolNuevo,
      });
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
  // Cambiar rol
  // ------------------------------------------------------------------
  async function handleCambiarRol(
    miembroId: number,
    nuevoRol: RolEnProyecto
  ) {
    try {
      await cambiarRolMiembro(proyectoId, miembroId, nuevoRol);
      toast.success('Rol actualizado');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo cambiar el rol'
      );
    }
  }

  // ------------------------------------------------------------------
  // Quitar miembro
  // ------------------------------------------------------------------
  async function handleQuitar(miembro: MiembroProyecto) {
    const esYoMismo = miembro.id_usuario === usuarioActual?.id;
    const mensaje = esYoMismo
      ? '¿Seguro que querés salir del proyecto?'
      : `¿Quitar a este miembro del proyecto?`;

    if (!window.confirm(mensaje)) return;

    try {
      await quitarMiembro(proyectoId, miembro.id);
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
          const nombre = m.usuario?.nombre_completo ?? `Usuario #${m.id_usuario}`;

          return (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-md border border-surface-800 bg-surface-900/40 p-3"
            >
              <Avatar id={m.id_usuario} nombre={nombre} size="md" />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-surface-100">
                  {nombre} {esYo && <span className="text-surface-500">(vos)</span>}
                </p>
                {m.usuario?.email && (
                  <p className="truncate text-xs text-surface-500">
                    {m.usuario.email}
                  </p>
                )}
              </div>

              {/* Rol: select si puedo gestionar, texto si no */}
              {puedoGestionar && !esPropietario ? (
                <select
                  value={m.rol_en_proyecto}
                  onChange={(e) =>
                    void handleCambiarRol(m.id, e.target.value as RolEnProyecto)
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

              {/* Quitar: PROPIETARIO solo si no es el propietario; otros siempre si puedo gestionar o soy yo */}
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

          <form onSubmit={handleAgregar} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="number"
              min={1}
              value={idUsuarioNuevo}
              onChange={(e) => {
                setIdUsuarioNuevo(e.target.value);
                if (error) setError(null);
              }}
              placeholder="ID del usuario"
              className="input-base flex-1"
              disabled={isLoading}
            />

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

            <Button type="submit" variant="primary" loading={isLoading}>
              Agregar
            </Button>
          </form>

          <p className="mt-2 text-xs text-surface-500">
            Ingresá el ID del usuario registrado en la plataforma.
          </p>
        </div>
      )}
    </Modal>
  );
}

export default MiembrosProyectoModal;