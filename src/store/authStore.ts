// src/store/authStore.ts
/**
 * Store de autenticación.
 *
 * Responsabilidades:
 * - Mantener el usuario autenticado y los tokens (vía tokenStorage).
 * - Login, registro, logout, bootstrap inicial.
 * - Escuchar el evento `auth:logout` disparado por httpClient cuando el
 *   refresh falla, para limpiar el estado global.
 *
 * Persistencia: los tokens viven en localStorage (vía tokenStorage).
 * El objeto `usuario` se reconstruye llamando a `/auth/me` en el bootstrap.
 */

import { create } from 'zustand';

import { authApi, ApiError, tokenStorage } from '@/api';
import type {
  PasswordChange,
  RolGlobal,
  TokenResponse,
  Usuario,
  UsuarioCreate,
  UsuarioLogin,
} from '@/types';

import { limpiarBaseLocal } from '@/offline/indexedDbClient';

// ======================================================================
// Tipos
// ======================================================================
interface AuthState {
  // --- Estado ---
  usuario: Usuario | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  isLoading: boolean;
  error: string | null;

  // --- Derivados ---
  isAdmin: () => boolean;
  rol: () => RolGlobal | null;

  // --- Acciones ---
  bootstrap: () => Promise<void>;
  login: (payload: UsuarioLogin) => Promise<void>;
  registro: (payload: UsuarioCreate) => Promise<void>;
  logout: () => void;
  cambiarPassword: (payload: PasswordChange) => Promise<void>;
  refrescarUsuario: () => Promise<void>;
  limpiarError: () => void;
}

// ======================================================================
// Store
// ======================================================================
export const useAuthStore = create<AuthState>((set, get) => ({
  // --- Estado inicial ---
  usuario: null,
  isAuthenticated: false,
  isBootstrapping: true,
  isLoading: false,
  error: null,

  // --- Derivados ---
  isAdmin: () => get().usuario?.rol === 'ADMIN',
  rol: () => get().usuario?.rol ?? null,

  // ------------------------------------------------------------------
  // Bootstrap: al arrancar la app, si hay tokens, validar con /auth/me
  // ------------------------------------------------------------------
  bootstrap: async () => {
    const access = tokenStorage.getAccess();
    if (!access) {
      set({ isBootstrapping: false, isAuthenticated: false, usuario: null });
      return;
    }

    try {
      const usuario = await authApi.me();
      set({
        usuario,
        isAuthenticated: true,
        isBootstrapping: false,
        error: null,
      });
    } catch {
      // Token inválido/expirado → limpiar
      tokenStorage.clear();
      set({
        usuario: null,
        isAuthenticated: false,
        isBootstrapping: false,
      });
    }
  },

  // ------------------------------------------------------------------
  // Login
  // ------------------------------------------------------------------
  login: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const tokens: TokenResponse = await authApi.login(payload);
      tokenStorage.set(tokens.access_token, tokens.refresh_token);
      set({
        usuario: tokens.usuario,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      const message = _extractErrorMessage(err);
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  // ------------------------------------------------------------------
  // Registro (no inicia sesión: el usuario debe ir a /login)
  // ------------------------------------------------------------------
  registro: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await authApi.registro(payload);
      set({ isLoading: false });
    } catch (err) {
      const message = _extractErrorMessage(err);
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  // ------------------------------------------------------------------
  // Logout
  // ------------------------------------------------------------------
  logout: () => {
    tokenStorage.clear();
    // Limpieza de la base offline en segundo plano
    void limpiarBaseLocal().catch(() => undefined);
    set({
      usuario: null,
      isAuthenticated: false,
      error: null,
    });
  },

  // ------------------------------------------------------------------
  // Cambio de contraseña (usuario autenticado)
  // ------------------------------------------------------------------
  cambiarPassword: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await authApi.cambiarPassword(payload);
      set({ isLoading: false });
    } catch (err) {
      const message = _extractErrorMessage(err);
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  // ------------------------------------------------------------------
  // Refrescar datos del usuario (p. ej. tras cambiar el perfil)
  // ------------------------------------------------------------------
  refrescarUsuario: async () => {
    if (!get().isAuthenticated) return;
    try {
      const usuario = await authApi.me();
      set({ usuario });
    } catch {
      // Silencioso: si falla, el token expiró y httpClient ya se encargará
    }
  },

  // ------------------------------------------------------------------
  // Limpiar error manual
  // ------------------------------------------------------------------
  limpiarError: () => set({ error: null }),
}));

// ======================================================================
// Suscripción al evento global `auth:logout`
// ======================================================================
// httpClient dispara este evento cuando el refresh token falla.
// Aquí limpiamos el estado para que toda la app reaccione.
if (typeof window !== 'undefined') {
  window.addEventListener('auth:logout', () => {
    useAuthStore.getState().logout();
  });
}

// ======================================================================
// Helpers
// ======================================================================
function _extractErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return err.detail || 'Error inesperado';
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Error inesperado';
}