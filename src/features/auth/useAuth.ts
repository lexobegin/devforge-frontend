// src/features/auth/useAuth.ts
/**
 * Hook de autenticación.
 *
 * Envuelve el `authStore` para uso directo desde componentes de auth:
 * login, registro, cambio de password y manejo de errores.
 */

import { useCallback, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { useAuthStore } from '@/store';
import type { PasswordChange, UsuarioCreate, UsuarioLogin } from '@/types';

interface UseAuthOptions {
  /** A dónde redirigir tras login exitoso. Por defecto, /proyectos. */
  redirectTo?: string;
}

interface UseAuthReturn {
  // Estado
  isLoading: boolean;
  error: string | null;

  // Acciones
  login: (payload: UsuarioLogin) => Promise<void>;
  registro: (payload: UsuarioCreate) => Promise<void>;
  cambiarPassword: (payload: PasswordChange) => Promise<void>;
  logout: () => void;
  limpiarError: () => void;
}

export function useAuth(options: UseAuthOptions = {}): UseAuthReturn {
  const { redirectTo = '/proyectos' } = options;

  const navigate = useNavigate();
  const location = useLocation();

  const loginStore = useAuthStore((s) => s.login);
  const registroStore = useAuthStore((s) => s.registro);
  const cambiarPasswordStore = useAuthStore((s) => s.cambiarPassword);
  const logoutStore = useAuthStore((s) => s.logout);
  const limpiarErrorStore = useAuthStore((s) => s.limpiarError);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ------------------------------------------------------------------
  // Login
  // ------------------------------------------------------------------
  const login = useCallback(
    async (payload: UsuarioLogin) => {
      setIsLoading(true);
      setError(null);
      try {
        await loginStore(payload);
        // Redirigir a la URL original si venimos de un guard, o al default
        const state = location.state as { from?: Location } | null;
        const destino = state?.from?.pathname ?? redirectTo;
        navigate(destino, { replace: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'No se pudo iniciar sesión';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [loginStore, navigate, location.state, redirectTo]
  );

  // ------------------------------------------------------------------
  // Registro
  // ------------------------------------------------------------------
  const registro = useCallback(
    async (payload: UsuarioCreate) => {
      setIsLoading(true);
      setError(null);
      try {
        await registroStore(payload);
        // Tras registrarse, redirigir a login (no autologuear)
        navigate('/login', { replace: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'No se pudo registrar la cuenta';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [registroStore, navigate]
  );

  // ------------------------------------------------------------------
  // Cambio de password (autenticado)
  // ------------------------------------------------------------------
  const cambiarPassword = useCallback(
    async (payload: PasswordChange) => {
      setIsLoading(true);
      setError(null);
      try {
        await cambiarPasswordStore(payload);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'No se pudo cambiar la contraseña';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [cambiarPasswordStore]
  );

  // ------------------------------------------------------------------
  // Logout
  // ------------------------------------------------------------------
  const logout = useCallback(() => {
    logoutStore();
    navigate('/login', { replace: true });
  }, [logoutStore, navigate]);

  // ------------------------------------------------------------------
  // Limpiar error
  // ------------------------------------------------------------------
  const limpiarError = useCallback(() => {
    setError(null);
    limpiarErrorStore();
  }, [limpiarErrorStore]);

  return {
    isLoading,
    error,
    login,
    registro,
    cambiarPassword,
    logout,
    limpiarError,
  };
}