// src/features/proyectos/components/ProyectoCard.tsx
/**
 * Tarjeta de proyecto para la lista.
 *
 * Muestra nombre, descripción, estado, fecha y acceso al detalle.
 * Si está archivado, se muestra con un badge gris.
 */

import { Link } from 'react-router-dom';

import type { Proyecto } from '@/types';

interface ProyectoCardProps {
  proyecto: Proyecto;
}

export function ProyectoCard({ proyecto }: ProyectoCardProps) {
  const archivado = proyecto.estado === 'ARCHIVADO';

  return (
    <Link
      to={`/proyectos/${proyecto.id}`}
      className={[
        'group flex flex-col gap-3 rounded-lg border bg-surface-900/40 p-4',
        'transition-all duration-150 hover:bg-surface-900/70',
        archivado
          ? 'border-surface-800 opacity-70'
          : 'border-surface-800 hover:border-brand-600/40 hover:shadow-card-hover',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-surface-100 group-hover:text-brand-200">
            {proyecto.nombre}
          </h3>
          {proyecto.descripcion && (
            <p className="mt-1 line-clamp-2 text-sm text-surface-400">
              {proyecto.descripcion}
            </p>
          )}
        </div>

        {archivado && (
          <span className="flex-shrink-0 rounded bg-surface-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-surface-300">
            Archivado
          </span>
        )}
      </div>

      {/* Footer: fechas */}
      <div className="flex items-center gap-4 text-xs text-surface-500">
        <span className="flex items-center gap-1">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Creado {formatFecha(proyecto.created_at)}
        </span>
        <span className="flex items-center gap-1">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Actualizado {formatFecha(proyecto.updated_at)}
        </span>
      </div>
    </Link>
  );
}

// ----------------------------------------------------------------------
// Helper
// ----------------------------------------------------------------------
function formatFecha(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-BO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default ProyectoCard;