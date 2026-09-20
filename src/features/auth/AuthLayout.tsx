// src/features/auth/AuthLayout.tsx
/**
 * Layout de las pantallas de auth (login y registro).
 *
 * Card centrada, logo arriba, contenido en el medio.
 * Fondo oscuro con un sutil patrón de gradiente.
 */

import type { ReactNode } from 'react';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-surface-950 p-4">
      {/* Fondo decorativo */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(99,102,241,0.15) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(79,70,229,0.15) 0%, transparent 40%)',
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-bold text-white shadow-lg">
            DF
          </div>
          <h1 className="mt-4 text-2xl font-bold text-surface-100">
            DevForge AI
          </h1>
          <p className="mt-1 text-sm text-surface-400">
            Plataforma CASE colaborativa con IA
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-surface-800 bg-surface-900/80 p-6 shadow-2xl backdrop-blur-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-surface-100">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-sm text-surface-400">{subtitle}</p>
            )}
          </div>

          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="mt-6 text-center text-sm text-surface-400">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default AuthLayout;