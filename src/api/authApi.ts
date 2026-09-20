// src/api/authApi.ts
/**
 * Endpoints del módulo de autenticación.
 * Corresponde a `app/api/v1/auth_router.py` del backend.
 *
 * Rutas:
 *   POST /auth/registro
 *   POST /auth/login
 *   POST /auth/refresh
 *   POST /auth/cambiar-password
 *   GET  /auth/me
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
  /** Registra un usuario nuevo y devuelve sus datos. */
  registro(payload: UsuarioCreate): Promise<Usuario> {
    return http.post<Usuario>('/auth/registro', payload);
  },

  /** Inicia sesión y devuelve access + refresh token. */
  login(payload: UsuarioLogin): Promise<TokenResponse> {
    return http.post<TokenResponse>('/auth/login', payload);
  },

  /** Renueva el access token usando el refresh token. */
  refresh(refreshToken: string): Promise<TokenResponse> {
    const body: RefreshTokenRequest = { refresh_token: refreshToken };
    return http.post<TokenResponse>('/auth/refresh', body);
  },

  /** Cambia la contraseña del usuario autenticado. */
  cambiarPassword(payload: PasswordChange): Promise<void> {
    return http.post<void>('/auth/cambiar-password', payload);
  },

  /** Devuelve el perfil del usuario autenticado. */
  me(): Promise<Usuario> {
    return http.get<Usuario>('/auth/me');
  },
};