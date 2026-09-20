// src/components/Button.tsx
/**
 * Botón base de la UI kit.
 *
 * Variantes: primary | secondary | ghost | danger
 * Tamaños:   sm | md | lg
 * Soporta: loading, iconos (left/right), fullWidth, as="a" con `asChild` simple.
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

// ======================================================================
// Tipos
// ======================================================================
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children?: ReactNode;
}

// ======================================================================
// Estilos
// ======================================================================
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-500 focus:ring-brand-500',
  secondary:
    'bg-surface-700 text-surface-100 hover:bg-surface-600 focus:ring-surface-500',
  ghost:
    'bg-transparent text-surface-200 hover:bg-surface-800 focus:ring-surface-500',
  danger: 'bg-danger text-white hover:bg-red-600 focus:ring-red-500',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
};

// ======================================================================
// Componente
// ======================================================================
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      children,
      className = '',
      disabled,
      ...rest
    },
    ref
  ) {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          'inline-flex items-center justify-center rounded-md font-medium',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-900',
          'disabled:cursor-not-allowed disabled:opacity-50',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          fullWidth ? 'w-full' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {loading ? (
          <Spinner size={size === 'lg' ? 20 : size === 'md' ? 16 : 14} />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);

// ======================================================================
// Spinner interno
// ======================================================================
interface SpinnerProps {
  size?: number;
}

function Spinner({ size = 16 }: SpinnerProps) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-current border-t-transparent"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

export default Button;