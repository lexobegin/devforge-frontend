// src/features/notificaciones/NotificacionesPage.tsx
/**
 * Página completa de notificaciones.
 *
 * Lista todas las notificaciones del usuario con filtros y acciones.
 */

import { useState } from 'react';

import Button from '@/components/Button';
import { PageLoader } from '@/components/Loader';
import useNotificaciones from './useNotificaciones';
import type { Notificacion, TipoNotificacion } from '@/api';

export function NotificacionesPage() {
  const {
    notificaciones,
    noLeidas,
    isLoading,
    cargar,
    marcarLeida,
    marcarNoLeida,
    marcarTodasLeidas,
    eliminar,
    limpiarLeidas,
  } = useNotificaciones({ polling: false });

  const [soloNoLeidas, setSoloNoLeidas] = useState(false);

  const handleFiltro = async (valor: boolean) => {
    setSoloNoLeidas(valor);
    await cargar(valor);
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">
            Notificaciones
          </h1>
          <p className="mt-1 text-sm text-surface-400">
            {noLeidas > 0
              ? `${noLeidas} sin leer`
              : 'Todas leídas'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-surface-300">
            <input
              type="checkbox"
              checked={soloNoLeidas}
              onChange={(e) => void handleFiltro(e.target.checked)}
              className="h-4 w-4 rounded border-surface-700 bg-surface-800 text-brand-600 focus:ring-brand-500"
            />
            Solo no leídas
          </label>

          {noLeidas > 0 && (
            <Button variant="ghost" size="sm" onClick={() => void marcarTodasLeidas()}>
              Marcar todas leídas
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={() => void limpiarLeidas()}>
            Limpiar leídas
          </Button>
        </div>
      </div>

      {/* Contenido */}
      {isLoading ? (
        <PageLoader mensaje="Cargando notificaciones…" />
      ) : notificaciones.length === 0 ? (
        <div className="rounded-lg border border-dashed border-surface-700 p-10 text-center">
          <p className="text-surface-400">
            {soloNoLeidas
              ? 'No tenés notificaciones sin leer.'
              : 'No tenés notificaciones todavía.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notificaciones.map((n) => (
            <NotifRow
              key={n.id}
              notificacion={n}
              onToggleLeida={() =>
                n.leida ? void marcarNoLeida(n.id) : void marcarLeida(n.id)
              }
              onEliminar={() => void eliminar(n.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// ======================================================================
// Fila
// ======================================================================
function NotifRow({
  notificacion,
  onToggleLeida,
  onEliminar,
}: {
  notificacion: Notificacion;
  onToggleLeida: () => void;
  onEliminar: () => void;
}) {
  const tipo = notificacion.tipo as TipoNotificacion;

  return (
    <li
      className={[
        'flex items-start gap-3 rounded-lg border p-4 transition-colors',
        notificacion.leida
          ? 'border-surface-800 bg-surface-900/40'
          : 'border-brand-600/30 bg-brand-600/5',
      ].join(' ')}
    >
      {/* Punto de estado */}
      <span
        className={[
          'mt-1.5 h-2 w-2 flex-shrink-0 rounded-full',
          notificacion.leida ? 'bg-surface-600' : 'bg-brand-500',
        ].join(' ')}
      />

      {/* Contenido */}
      <div className="min-w-0 flex-1">
        <p
          className={[
            'text-sm',
            notificacion.leida
              ? 'text-surface-300'
              : 'font-medium text-surface-100',
          ].join(' ')}
        >
          {notificacion.mensaje}
        </p>

        <div className="mt-1 flex items-center gap-3 text-xs text-surface-500">
          <span className="rounded bg-surface-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
            {tipo}
          </span>
          <span>{formatFecha(notificacion.created_at)}</span>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex flex-shrink-0 gap-1">
        <button
          type="button"
          onClick={onToggleLeida}
          className="rounded p-1.5 text-surface-500 hover:bg-surface-800 hover:text-surface-200"
          title={notificacion.leida ? 'Marcar como no leída' : 'Marcar como leída'}
        >
          {notificacion.leida ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={onEliminar}
          className="rounded p-1.5 text-surface-500 hover:bg-danger/10 hover:text-danger"
          title="Eliminar"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </li>
  );
}

// ======================================================================
// Helper
// ======================================================================
function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-BO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default NotificacionesPage;