// src/api/authApi.ts
/**
 * Endpoints del módulo de autenticación.
 * Corresponde a `app/api/v1/auth_router.py` del backend Ciclo 2.
 *
 * Rutas (verificadas contra el router):
 *   POST /auth/registro         → 201 UsuarioResponse
 *   POST /auth/login            → TokenResponse (access + refresh)
 *   POST /auth/refresh          → TokenResponse (rota AMBOS tokens)
 *   POST /auth/cambiar-password → 204
 *   GET  /auth/me               → UsuarioResponse
 */

import { http } from './httpClient';
import type {
  PasswordChange,
  RefreshTokenRequest,
  TokenResponse,
  Usuario,
  UsuarioCreate,
  UsuarioLogin,
} from '@/types';

export const authApi = {
  /** Registra un usuario nuevo (201) y devuelve sus datos. */
  registro(payload: UsuarioCreate): Promise<Usuario> {
    return http.post<Usuario>('/auth/registro', payload);
  },

  /** Inicia sesión y devuelve access + refresh token (+ usuario). */
  login(payload: UsuarioLogin): Promise<TokenResponse> {
    return http.post<TokenResponse>('/auth/login', payload);
  },

  /**
   * Renueva el par de tokens usando el refresh token. El backend
   * ROTACIÓN ambos: el refresh anterior queda invalidado.
   */
  refresh(refreshToken: string): Promise<TokenResponse> {
    const body: RefreshTokenRequest = { refresh_token: refreshToken };
    return http.post<TokenResponse>('/auth/refresh', body);
  },

  /** Cambia la contraseña del usuario autenticado (204). */
  cambiarPassword(payload: PasswordChange): Promise<void> {
    return http.post<void>('/auth/cambiar-password', payload);
  },

  /** Devuelve el perfil del usuario autenticado. */
  me(): Promise<Usuario> {
    return http.get<Usuario>('/auth/me');
  },
};