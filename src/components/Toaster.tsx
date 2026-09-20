// src/components/Toaster.tsx
/**
 * Render de los toasts globales.
 *
 * Se monta una vez en AppLayout (o App) y lee del uiStore.
 * Los toasts se autoeliminan por timeout (manejado en el store).
 */

import { createPortal } from 'react-dom';

import { useUIStore, type ToastTipo } from '@/store';

// ======================================================================
// Estilos por tipo
// ======================================================================
const TIPO_CLASSES: Record<ToastTipo, string> = {
  success: 'border-success/40 bg-success/10 text-success',
  error: 'border-danger/40 bg-danger/10 text-danger',
  warning: 'border-warning/40 bg-warning/10 text-warning',
  info: 'border-info/40 bg-info/10 text-info',
};

const TIPO_ICONS: Record<ToastTipo, string> = {
  success:
    'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', // check-circle
  error:
    'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z', // x-circle
  warning:
    'M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-3l-6.93-12a2 2 0 00-3.48 0l-6.93 12a2 2 0 001.74 3z', // alert
  info:
    'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', // info
};

// ======================================================================
// Componente
// ======================================================================
export function Toaster() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={[
            'pointer-events-auto flex items-start gap-3 rounded-lg border',
            'p-4 shadow-lg backdrop-blur-sm animate-slide-in',
            TIPO_CLASSES[t.tipo],
          ].join(' ')}
        >
          <svg
            className="mt-0.5 h-5 w-5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d={TIPO_ICONS[t.tipo]} />
          </svg>
          <p className="flex-1 text-sm font-medium">{t.mensaje}</p>
          <button
            type="button"
            onClick={() => removeToast(t.id)}
            className="flex-shrink-0 rounded p-0.5 opacity-60 hover:opacity-100"
            aria-label="Cerrar notificación"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}

export default Toaster;