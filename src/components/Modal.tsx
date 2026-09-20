// src/components/Modal.tsx
/**
 * Modal genérico.
 *
 * - Portal al final del body.
 * - Cierre con Escape y click fuera.
 * - Bloquea el scroll del body mientras está abierto.
 * - Tamaños configurables.
 */

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// ======================================================================
// Tipos
// ======================================================================
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  className?: string;
}

// ======================================================================
// Clases por tamaño
// ======================================================================
const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-[95vw] w-full',
};

// ======================================================================
// Componente
// ======================================================================
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  className = '',
}: ModalProps) {
  // ------------------------------------------------------------------
  // Escape para cerrar
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, closeOnEscape, onClose]);

  // ------------------------------------------------------------------
  // Bloquear scroll del body
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!open) return null;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {/* Contenido */}
      <div
        className={[
          'relative z-10 w-full rounded-lg border border-surface-800',
          'bg-surface-900 shadow-2xl',
          SIZE_CLASSES[size],
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-surface-800 p-5">
            <div className="min-w-0 flex-1">
              {title && (
                <h2 className="text-lg font-semibold text-surface-100">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-surface-400">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 rounded-md p-1 text-surface-400 hover:bg-surface-800 hover:text-surface-200"
              aria-label="Cerrar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-surface-800 bg-surface-900/50 p-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default Modal;