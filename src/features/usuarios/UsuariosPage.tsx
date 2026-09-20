// src/features/usuarios/UsuariosPage.tsx
/**
 * Pantalla de gestión de usuarios (solo ADMIN).
 *
 * - Lista usuarios con paginación.
 * - Filtro: solo activos.
 * - Crear usuario.
 * - Editar (nombre, email, rol, estado).
 * - Activar / desactivar (soft-disable).
 * - Eliminar (excepcional).
 */

import { useCallback, useEffect, useState } from 'react';

import Avatar from '@/components/Avatar';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { PageLoader } from '@/components/Loader';
import { httpClient } from '@/api';
import { useAuthStore, toast } from '@/store';
import type {
  PaginatedResponse,
  RolGlobal,
  Usuario,
  UsuarioCreate,
  UsuarioUpdate,
} from '@/types';

// ======================================================================
// Constantes
// ======================================================================
const PAGE_SIZE = 20;

// ======================================================================
// Componente
// ======================================================================
export function UsuariosPage() {
  const usuarioActual = useAuthStore((s) => s.usuario);

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [soloActivos, setSoloActivos] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [usuarioEnEdicion, setUsuarioEnEdicion] = useState<Usuario | null>(null);

  // ------------------------------------------------------------------
  // Cargar
  // ------------------------------------------------------------------
  const cargar = useCallback(
    async (nuevoSkip: number, filtroActivos: boolean) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await httpClient.get<PaginatedResponse<Usuario>>(
          '/usuarios',
          {
            params: {
              skip: nuevoSkip,
              limit: PAGE_SIZE,
              solo_activos: filtroActivos,
            },
          }
        );
        setUsuarios(res.data.items);
        setTotal(res.data.total);
        setSkip(nuevoSkip);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'No se pudieron cargar usuarios'
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void cargar(0, soloActivos);
  }, [cargar, soloActivos]);

  // ------------------------------------------------------------------
  // Activar / desactivar
  // ------------------------------------------------------------------
  const toggleActivo = async (u: Usuario) => {
    if (u.id === usuarioActual?.id) {
      toast.warning('No podés desactivar tu propia cuenta');
      return;
    }
    const accion = u.activo ? 'desactivar' : 'activar';
    if (!window.confirm(`¿${accion.charAt(0).toUpperCase() + accion.slice(1)} a ${u.nombre_completo}?`)) {
      return;
    }
    try {
      await httpClient.post(`/usuarios/${u.id}/${accion}`);
      toast.success(`Usuario ${u.activo ? 'desactivado' : 'activado'}`);
      await cargar(skip, soloActivos);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo cambiar el estado'
      );
    }
  };

  // ------------------------------------------------------------------
  // Eliminar
  // ------------------------------------------------------------------
  const eliminar = async (u: Usuario) => {
    if (u.id === usuarioActual?.id) {
      toast.warning('No podés eliminar tu propia cuenta');
      return;
    }
    if (
      !window.confirm(
        `¿Eliminar definitivamente a ${u.nombre_completo}? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    try {
      await httpClient.delete(`/usuarios/${u.id}`);
      toast.success('Usuario eliminado');
      await cargar(skip, soloActivos);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo eliminar el usuario'
      );
    }
  };

  // ------------------------------------------------------------------
  // Paginación
  // ------------------------------------------------------------------
  const paginaActual = Math.floor(skip / PAGE_SIZE) + 1;
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hayAnterior = skip > 0;
  const haySiguiente = skip + PAGE_SIZE < total;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* -------- Header -------- */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Usuarios</h1>
          <p className="mt-1 text-sm text-surface-400">
            {total} usuario{total !== 1 ? 's' : ''} registrado
            {total !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-surface-300">
            <input
              type="checkbox"
              checked={soloActivos}
              onChange={(e) => setSoloActivos(e.target.checked)}
              className="h-4 w-4 rounded border-surface-700 bg-surface-800 text-brand-600 focus:ring-brand-500"
            />
            Solo activos
          </label>
          <Button
            variant="primary"
            onClick={() => setModalCrearAbierto(true)}
            leftIcon={
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Nuevo usuario
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* -------- Tabla -------- */}
      {isLoading && usuarios.length === 0 ? (
        <PageLoader mensaje="Cargando usuarios…" />
      ) : usuarios.length === 0 ? (
        <div className="rounded-lg border border-dashed border-surface-700 p-10 text-center">
          <p className="text-surface-400">No hay usuarios.</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-surface-800">
            <table className="w-full text-sm">
              <thead className="bg-surface-800/60">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-surface-300">
                    Usuario
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-surface-300">
                    Rol
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-surface-300">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-surface-300">
                    Registrado
                  </th>
                  <th className="w-32 px-4 py-3 text-right font-semibold text-surface-300">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => {
                  const esYo = u.id === usuarioActual?.id;
                  return (
                    <tr
                      key={u.id}
                      className="border-t border-surface-800 hover:bg-surface-800/20"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar id={u.id} nombre={u.nombre_completo} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-surface-100">
                              {u.nombre_completo}{' '}
                              {esYo && (
                                <span className="text-surface-500">(vos)</span>
                              )}
                            </p>
                            <p className="truncate text-xs text-surface-500">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            'rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                            u.rol === 'ADMIN'
                              ? 'bg-brand-600/20 text-brand-300'
                              : 'bg-surface-700 text-surface-300',
                          ].join(' ')}
                        >
                          {u.rol}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            'rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                            u.activo
                              ? 'bg-success/20 text-success'
                              : 'bg-surface-700 text-surface-400',
                          ].join(' ')}
                        >
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-surface-400">
                        {formatFecha(u.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setUsuarioEnEdicion(u)}
                            className="rounded p-1.5 text-surface-400 hover:bg-surface-800 hover:text-surface-200"
                            title="Editar"
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
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>

                          {!esYo && (
                            <>
                              <button
                                type="button"
                                onClick={() => void toggleActivo(u)}
                                className={[
                                  'rounded p-1.5',
                                  u.activo
                                    ? 'text-surface-400 hover:bg-warning/10 hover:text-warning'
                                    : 'text-surface-400 hover:bg-success/10 hover:text-success',
                                ].join(' ')}
                                title={u.activo ? 'Desactivar' : 'Activar'}
                              >
                                {u.activo ? (
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                  </svg>
                                ) : (
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => void eliminar(u)}
                                className="rounded p-1.5 text-surface-400 hover:bg-danger/10 hover:text-danger"
                                title="Eliminar"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* -------- Paginación -------- */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-surface-500">
              Página {paginaActual} de {totalPaginas}
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={!hayAnterior || isLoading}
                onClick={() => void cargar(skip - PAGE_SIZE, soloActivos)}
              >
                ← Anterior
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={!haySiguiente || isLoading}
                onClick={() => void cargar(skip + PAGE_SIZE, soloActivos)}
              >
                Siguiente →
              </Button>
            </div>
          </div>
        </>
      )}

      {/* -------- Modal crear / editar -------- */}
      <UsuarioFormModal
        open={modalCrearAbierto || usuarioEnEdicion !== null}
        usuario={usuarioEnEdicion}
        onClose={() => {
          setModalCrearAbierto(false);
          setUsuarioEnEdicion(null);
        }}
        onGuardado={() => void cargar(skip, soloActivos)}
      />
    </div>
  );
}

// ======================================================================
// Modal de formulario (crear / editar)
// ======================================================================
function UsuarioFormModal({
  open,
  usuario,
  onClose,
  onGuardado,
}: {
  open: boolean;
  usuario: Usuario | null;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const esEdicion = usuario !== null;

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<RolGlobal>('DESARROLLADOR');
  const [activo, setActivo] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sincronizar al abrir
  useEffect(() => {
    if (open) {
      setNombre(usuario?.nombre_completo ?? '');
      setEmail(usuario?.email ?? '');
      setPassword('');
      setRol(usuario?.rol ?? 'DESARROLLADOR');
      setActivo(usuario?.activo ?? true);
      setError(null);
    }
  }, [open, usuario]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!nombre.trim() || !email.trim()) {
      setError('Nombre y email son obligatorios');
      return;
    }
    if (!esEdicion && password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      if (esEdicion) {
        const payload: UsuarioUpdate = {
          nombre_completo: nombre.trim(),
          email: email.trim(),
          rol,
          activo,
        };
        if (password) payload.password = password;
        await httpClient.put(`/usuarios/${usuario.id}`, payload);
        toast.success('Usuario actualizado');
      } else {
        const payload: UsuarioCreate = {
          nombre_completo: nombre.trim(),
          email: email.trim(),
          password,
          rol,
        };
        await httpClient.post('/usuarios', payload);
        toast.success('Usuario creado');
      }
      onGuardado();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo guardar el usuario'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={isLoading ? () => undefined : onClose}
      title={esEdicion ? 'Editar usuario' : 'Nuevo usuario'}
      description={
        esEdicion
          ? 'Actualizá los datos del usuario.'
          : 'Creá una cuenta nueva en la plataforma.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="usuario-form"
            variant="primary"
            loading={isLoading}
          >
            {esEdicion ? 'Guardar cambios' : 'Crear usuario'}
          </Button>
        </>
      }
    >
      <form id="usuario-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <div>
          <label className="label-base">Nombre completo</label>
          <input
            type="text"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="input-base"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="label-base">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-base"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="label-base">
            Contraseña {esEdicion && <span className="text-surface-500">(dejar en blanco para no cambiar)</span>}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={esEdicion ? '••••••••' : 'Mínimo 8 caracteres'}
            className="input-base"
            disabled={isLoading}
            autoComplete="new-password"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-base">Rol</label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value as RolGlobal)}
              className="input-base"
              disabled={isLoading}
            >
              <option value="DESARROLLADOR">Desarrollador</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>

          {esEdicion && (
            <div>
              <label className="label-base">Estado</label>
              <select
                value={activo ? 'true' : 'false'}
                onChange={(e) => setActivo(e.target.value === 'true')}
                className="input-base"
                disabled={isLoading}
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

// ======================================================================
// Helper
// ======================================================================
function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-BO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default UsuariosPage;