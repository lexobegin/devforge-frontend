// src/features/auth/LoginPage.tsx
/**
 * Pantalla de login.
 *
 * Formulario: email + contraseña.
 * Al enviar, llama a `useAuth.login()`, que autentica y redirige.
 */

import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Button from '@/components/Button';
import { useAuth } from './useAuth';

export function LoginPage() {
  const { login, isLoading, error, limpiarError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Limpiar errores al desmontar
  useEffect(() => {
    return () => limpiarError();
  }, [limpiarError]);

  // ------------------------------------------------------------------
  // Submit
  // ------------------------------------------------------------------
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isLoading) return;

    try {
      await login({ email: email.trim(), password });
    } catch {
      // El error ya se muestra desde el hook
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Error global */}
      {error && (
        <div
          role="alert"
          className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {error}
        </div>
      )}

      {/* Email */}
      <div>
        <label htmlFor="email" className="label-base">
          Correo electrónico
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) limpiarError();
          }}
          placeholder="tu@correo.com"
          className="input-base"
          disabled={isLoading}
        />
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="label-base">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) limpiarError();
          }}
          placeholder="••••••••"
          className="input-base"
          disabled={isLoading}
        />
      </div>

      {/* Submit */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={isLoading}
      >
        Iniciar sesión
      </Button>

      {/* Link a registro */}
      <p className="pt-2 text-center text-sm text-surface-400">
        ¿No tenés cuenta?{' '}
        <Link
          to="/register"
          className="font-medium text-brand-400 hover:text-brand-300"
        >
          Registrate
        </Link>
      </p>
    </form>
  );
}

export default LoginPage;