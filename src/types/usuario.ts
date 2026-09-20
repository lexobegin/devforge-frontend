// src/types/usuario.ts
/**
 * Tipos del módulo de usuarios y autenticación.
 * Reflejan `app/schemas/usuario_schema.py` del backend.
 */

import type { ISODateString, Id } from './common';

// ======================================================================
// Enums / literales
// ======================================================================
export type RolGlobal = 'ADMIN' | 'DESARROLLADOR';

// ======================================================================
// Entidad
// ======================================================================
export interface Usuario {
  id: Id;
  nombre_completo: string;
  email: string;
  rol: RolGlobal;
  activo: boolean;
  created_at: ISODateString;
}

// ======================================================================
// Requests
// ======================================================================
export interface UsuarioCreate {
  nombre_completo: string;
  email: string;
  password: string;
  rol?: RolGlobal;
}

export interface UsuarioUpdate {
  nombre_completo?: string;
  email?: string;
  password?: string;
  rol?: RolGlobal;
  activo?: boolean;
}

export interface UsuarioLogin {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface PasswordChange {
  password_actual: string;
  password_nueva: string;
}

// ======================================================================
// Responses
// ======================================================================
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
  usuario: Usuario;
}