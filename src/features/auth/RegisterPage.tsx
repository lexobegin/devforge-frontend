// src/features/auth/RegisterPage.tsx
/**
 * Pantalla de registro.
 *
 * Formulario: nombre, email, password, confirmación de password.
 * Al enviar, crea la cuenta y redirige a /login.
 */

import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Button from '@/components/Button';
import { useAuth } from './useAuth';

interface FormErrors {
  nombre?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function RegisterPage() {
  const { registro, isLoading, error, limpiarError } = useAuth();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  useEffect(() => {
    return () => limpiarError();
  }, [limpiarError]);

  // ------------------------------------------------------------------
  // Validación local
  // ------------------------------------------------------------------
  function validar(): boolean {
    const errs: FormErrors = {};

    if (!nombre.trim()) {
      errs.nombre = 'Ingresá tu nombre';
    } else if (nombre.trim().length < 3) {
      errs.nombre = 'El nombre debe tener al menos 3 caracteres';
    }

    if (!email.trim()) {
      errs.email = 'Ingresá tu email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Email inválido';
    }

    if (!password) {
      errs.password = 'Ingresá una contraseña';
    } else if (password.length < 8) {
      errs.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    if (password !== confirmPassword) {
      errs.confirmPassword = 'Las contraseñas no coinciden';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ------------------------------------------------------------------
  // Submit
  // ------------------------------------------------------------------
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isLoading) return;
    if (!validar()) return;

    try {
      await registro({
        nombre_completo: nombre.trim(),
        email: email.trim(),
        password,
        rol: 'DESARROLLADOR',
      });
    } catch {
      // El hook maneja el error
    }
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && (
        <div
          role="alert"
          className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {error}
        </div>
      )}

      {/* Nombre */}
      <div>
        <label htmlFor="nombre" className="label-base">
          Nombre completo
        </label>
        <input
          id="nombre"
          type="text"
          autoComplete="name"
          required
          autoFocus
          value={nombre}
          onChange={(e) => {
            setNombre(e.target.value);
            if (fieldErrors.nombre) setFieldErrors((p) => ({ ...p, nombre: undefined }));
            if (error) limpiarError();
          }}
          placeholder="Juan Pérez"
          className={[
            'input-base',
            fieldErrors.nombre ? 'border-danger focus:border-danger focus:ring-danger' : '',
          ].join(' ')}
          disabled={isLoading}
        />
        {fieldErrors.nombre && (
          <p className="mt-1 text-xs text-danger">{fieldErrors.nombre}</p>
        )}
      </div>

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
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
            if (error) limpiarError();
          }}
          placeholder="tu@correo.com"
          className={[
            'input-base',
            fieldErrors.email ? 'border-danger focus:border-danger focus:ring-danger' : '',
          ].join(' ')}
          disabled={isLoading}
        />
        {fieldErrors.email && (
          <p className="mt-1 text-xs text-danger">{fieldErrors.email}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="label-base">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (fieldErrors.password)
              setFieldErrors((p) => ({ ...p, password: undefined }));
            if (error) limpiarError();
          }}
          placeholder="Al menos 8 caracteres"
          className={[
            'input-base',
            fieldErrors.password ? 'border-danger focus:border-danger focus:ring-danger' : '',
          ].join(' ')}
          disabled={isLoading}
        />
        {fieldErrors.password && (
          <p className="mt-1 text-xs text-danger">{fieldErrors.password}</p>
        )}
      </div>

      {/* Confirmación */}
      <div>
        <label htmlFor="confirmPassword" className="label-base">
          Confirmar contraseña
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (fieldErrors.confirmPassword)
              setFieldErrors((p) => ({ ...p, confirmPassword: undefined }));
            if (error) limpiarError();
          }}
          placeholder="Repetí la contraseña"
          className={[
            'input-base',
            fieldErrors.confirmPassword
              ? 'border-danger focus:border-danger focus:ring-danger'
              : '',
          ].join(' ')}
          disabled={isLoading}
        />
        {fieldErrors.confirmPassword && (
          <p className="mt-1 text-xs text-danger">
            {fieldErrors.confirmPassword}
          </p>
        )}
      </div>

      {/* Submit */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={isLoading}
      >
        Crear cuenta
      </Button>

      <p className="pt-2 text-center text-sm text-surface-400">
        ¿Ya tenés cuenta?{' '}
        <Link
          to="/login"
          className="font-medium text-brand-400 hover:text-brand-300"
        >
          Iniciá sesión
        </Link>
      </p>
    </form>
  );
}

export default RegisterPage;