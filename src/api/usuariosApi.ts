// src/api/usuariosApi.ts
/**
 * Endpoints de gestión de usuarios (solo ADMIN salvo el propio perfil).
 * Corresponde a `app/api/v1/usuarios_router.py` del backend Ciclo 2.
 *
 * Rutas (verificadas contra el router):
 *   GET    /usuarios               → página {items,total,skip,limit} (solo ADMIN)
 *   POST   /usuarios               → 201 Usuario (solo ADMIN)
 *   GET    /usuarios/{id}          → Usuario (ADMIN o el propio)
 *   PUT    /usuarios/{id}          → Usuario (ADMIN o el propio; sin rol/activo)
 *   POST   /usuarios/{id}/activar  → Usuario (solo ADMIN)
 *   POST   /usuarios/{id}/desactivar → Usuario (solo ADMIN; soft-disable)
 *   DELETE /usuarios/{id}          → 204 (solo ADMIN; eliminación física)
 */

import { http } from './httpClient';
import type { Id, PaginatedResponse, Usuario, UsuarioCreate, UsuarioUpdate } from '@/types';

export interface UsuariosQuery {
  skip?: number;
  limit?: number;
  solo_activos?: boolean;
}

export const usuariosApi = {
  /** Lista usuarios paginados (solo ADMIN en el backend). */
  listar(params: UsuariosQuery = {}): Promise<PaginatedResponse<Usuario>> {
    return http.get<PaginatedResponse<Usuario>>('/usuarios', { params });
  },

  /** Crea una cuenta con rol explícito (solo ADMIN). */
  crear(payload: UsuarioCreate): Promise<Usuario> {
    return http.post<Usuario>('/usuarios', payload);
  },

  /** Obtiene un usuario (ADMIN o el propio usuario). */
  obtener(id: Id): Promise<Usuario> {
    return http.get<Usuario>(`/usuarios/${id}`);
  },

  /**
   * Actualiza un usuario. El propio usuario no puede cambiar rol/activo
   * (el backend lo rechaza con 403 si no es ADMIN).
   */
  actualizar(id: Id, payload: UsuarioUpdate): Promise<Usuario> {
    return http.put<Usuario>(`/usuarios/${id}`, payload);
  },

  /** Reactiva una cuenta desactivada (solo ADMIN). */
  activar(id: Id): Promise<Usuario> {
    return http.post<Usuario>(`/usuarios/${id}/activar`);
  },

  /** Desactiva una cuenta (soft-disable, solo ADMIN). */
  desactivar(id: Id): Promise<Usuario> {
    return http.post<Usuario>(`/usuarios/${id}/desactivar`);
  },

  /** Elimina físicamente un usuario (solo ADMIN; uso excepcional). */
  eliminar(id: Id): Promise<void> {
    return http.delete<void>(`/usuarios/${id}`);
  },
};