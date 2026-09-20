// src/features/notificaciones/NotificacionesDropdown.tsx
/**
 * Dropdown de notificaciones para el Navbar.
 *
 * - Icono de campana con badge de no leídas.
 * - Al abrir, muestra las últimas notificaciones.
 * - Permite marcar leídas y ver todas (link a /notificaciones).
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { toast } from '@/store';
import useNotificaciones from './useNotificaciones';
import type { Notificacion, TipoNotificacion } from '@/api';

// ======================================================================
// Iconos por tipo
// ======================================================================
const TIPO_ICON: Record<TipoNotificacion, string> = {
  COMENTARIO:
    'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z',
  CAMBIO_DIAGRAMA:
    'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  GENERACION_COMPLETA:
    'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  GENERACION_FALLIDA:
    'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  MIEMBRO_AGREGADO:
    'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
  CONFLICTO_PENDIENTE:
    'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  VERSION_GUARDADA:
    'M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4',
  SISTEMA:
    'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
};

const TIPO_COLOR: Record<TipoNotificacion, string> = {
  COMENTARIO: 'text-info',
  CAMBIO_DIAGRAMA: 'text-surface-300',
  GENERACION_COMPLETA: 'text-success',
  GENERACION_FALLIDA: 'text-danger',
  MIEMBRO_AGREGADO: 'text-brand-300',
  CONFLICTO_PENDIENTE: 'text-warning',
  VERSION_GUARDADA: 'text-surface-300',
  SISTEMA: 'text-surface-400',
};

// ======================================================================
// Componente
// ======================================================================
export function NotificacionesDropdown() {
  const navigate = useNavigate();
  const {
    notificaciones,
    noLeidas,
    isLoading,
    marcarLeida,
    marcarTodasLeidas,
  } = useNotificaciones();

  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al click fuera
  useEffect(() => {
    if (!abierto) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [abierto]);

  const recientes = notificaciones.slice(0, 6);

  return (
    <div className="relative" ref={ref}>
      {/* -------- Botón campana -------- */}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="relative rounded-md p-2 text-surface-300 hover:bg-surface-800 hover:text-surface-100"
        aria-label={`Notificaciones${noLeidas > 0 ? ` (${noLeidas} sin leer)` : ''}`}
        title="Notificaciones"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {noLeidas > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {noLeidas > 99 ? '99+' : noLeidas}
          </span>
        )}
      </button>

      {/* -------- Dropdown -------- */}
      {abierto && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 animate-slide-in overflow-hidden rounded-md border border-surface-800 bg-surface-900 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-surface-800 px-4 py-2">
            <p className="text-sm font-semibold text-surface-100">
              Notificaciones
            </p>
            {noLeidas > 0 && (
              <button
                type="button"
                onClick={() => void marcarTodasLeidas()}
                className="text-xs text-brand-400 hover:text-brand-300"
              >
                Marcar todas leídas
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading && notificaciones.length === 0 ? (
              <div className="p-6 text-center text-xs text-surface-500">
                Cargando…
              </div>
            ) : recientes.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-xs text-surface-500">
                  No tenés notificaciones.
                </p>
              </div>
            ) : (
              <ul>
                {recientes.map((n) => (
                  <NotifItem
                    key={n.id}
                    notificacion={n}
                    onClick={() => {
                      if (!n.leida) void marcarLeida(n.id);
                      setAbierto(false);
                    }}
                  />
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-surface-800 p-2">
            <button
              type="button"
              onClick={() => {
                setAbierto(false);
                navigate('/notificaciones');
              }}
              className="w-full rounded px-2 py-1.5 text-center text-xs font-medium text-brand-400 hover:bg-surface-800 hover:text-brand-300"
            >
              Ver todas
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ======================================================================
// Item
// ======================================================================
function NotifItem({
  notificacion,
  onClick,
}: {
  notificacion: Notificacion;
  onClick: () => void;
}) {
  const tipo = notificacion.tipo as TipoNotificacion;
  const iconPath = TIPO_ICON[tipo] ?? TIPO_ICON.SISTEMA;
  const colorClass = TIPO_COLOR[tipo] ?? 'text-surface-400';

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={[
          'flex w-full gap-3 border-b border-surface-800/60 px-4 py-3 text-left transition-colors',
          notificacion.leida
            ? 'hover:bg-surface-800/40'
            : 'bg-brand-600/5 hover:bg-brand-600/10',
        ].join(' ')}
      >
        <svg
          className={['h-4 w-4 flex-shrink-0 mt-0.5', colorClass].join(' ')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
        </svg>

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
          <p className="mt-1 text-[10px] text-surface-500">
            {tiempoRelativo(notificacion.created_at)}
          </p>
        </div>

        {!notificacion.leida && (
          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-500" />
        )}
      </button>
    </li>
  );
}

// ======================================================================
// Helper: tiempo relativo
// ======================================================================
function tiempoRelativo(iso: string): string {
  try {
    const fecha = new Date(iso).getTime();
    const diff = Date.now() - fecha;
    const segundos = Math.floor(diff / 1000);

    if (segundos < 60) return 'Hace instantes';
    const minutos = Math.floor(segundos / 60);
    if (minutos < 60) return `Hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `Hace ${horas} h`;
    const dias = Math.floor(horas / 24);
    if (dias < 7) return `Hace ${dias} d`;

    return new Date(iso).toLocaleDateString('es-BO', {
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return iso;
  }
}

export default NotificacionesDropdown;