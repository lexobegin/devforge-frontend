// src/api/usuariosApi.ts
import { http } from './httpClient';
import type { PaginatedResponse, Usuario } from '@/types';

export interface UsuariosQuery {
  skip?: number;
  limit?: number;
  solo_activos?: boolean;
}

export const usuariosApi = {
  /** Lista usuarios (solo ADMIN en el backend). */
  listar(params: UsuariosQuery = {}): Promise<PaginatedResponse<Usuario>> {
    return http.get<PaginatedResponse<Usuario>>('/usuarios', { params });
  },
};