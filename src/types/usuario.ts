// src/types/usuario.ts
/**
 * Tipos del módulo de usuarios y autenticación.
 * Reflejan `app/schemas/usuario_schema.py` del backend Ciclo 2.
 *
 * Alineado con el backend:
 * - RolGlobal incluye "LIDER" (Líder de Proyecto, reconocido por el
 *   modelo Usuario del Ciclo 2 junto a ADMIN y DESARROLLADOR).
 * - id es string hex (PydanticObjectId serializado por Beanie).
 * - TokenResponse.expires_in son SEGUNDOS de validez del access token.
 */

import type { ISODateString, Id } from './common';

// ======================================================================
// Enums / literales (usuario_schema.py → RolGlobal)
// ======================================================================
export type RolGlobal = 'ADMIN' | 'LIDER' | 'DESARROLLADOR';

// ======================================================================
// Entidad (UsuarioResponse)
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
  /** 8–128 caracteres (lo valida el backend) */
  password: string;
  /** El backend usa DESARROLLADOR por defecto */
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
// Responses (TokenResponse del login)
// ======================================================================
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  /** Segundos de validez del access token (no minutos) */
  expires_in: number;
  usuario: Usuario;
}