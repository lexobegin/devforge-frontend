// src/components/Loader.tsx
/**
 * Indicadores de carga.
 *
 * - `<Spinner size={n} />`      → círculo giratorio.
 * - `<Loader mensaje="..." />`  → spinner + texto, centrado.
 * - `<PageLoader />`            → loader de pantalla completa.
 * - `<Skeleton />`              → placeholder rectangular.
 */

import type { ReactNode } from 'react';

// ======================================================================
// Spinner
// ======================================================================
export interface SpinnerProps {
  size?: number;
  className?: string;
}

export function Spinner({ size = 20, className = '' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={[
        'inline-block animate-spin rounded-full',
        'border-2 border-surface-600 border-t-brand-500',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ width: size, height: size }}
    />
  );
}

// ======================================================================
// Loader con mensaje
// ======================================================================
export interface LoaderProps {
  mensaje?: string;
  size?: number;
  className?: string;
}

export function Loader({
  mensaje = 'Cargando…',
  size = 32,
  className = '',
}: LoaderProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center gap-3 py-10',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Spinner size={size} />
      {mensaje && <p className="text-sm text-surface-400">{mensaje}</p>}
    </div>
  );
}

// ======================================================================
// PageLoader (pantalla completa)
// ======================================================================
export interface PageLoaderProps {
  mensaje?: string;
}

export function PageLoader({ mensaje = 'Cargando…' }: PageLoaderProps) {
  return (
    <div className="flex h-full min-h-[60vh] w-full items-center justify-center">
      <Loader mensaje={mensaje} size={40} />
    </div>
  );
}

// ======================================================================
// Skeleton
// ======================================================================
export interface SkeletonProps {
  className?: string;
  children?: ReactNode;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={[
        'animate-pulse rounded-md bg-surface-800',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );
}

export default Loader;