// src/components/Avatar.tsx
/**
 * Avatar de usuario.
 *
 * - Si hay `src` (imagen) la muestra.
 * - Si no, genera iniciales del nombre con color derivado del id.
 */

import type { Id } from '@/types';

// ======================================================================
// Tipos
// ======================================================================
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  nombre: string;
  id?: Id;
  src?: string | null;
  size?: AvatarSize;
  /** Color custom (si no, se deriva del id). */
  color?: string;
  title?: string;
  className?: string;
}

// ======================================================================
// Tamaños
// ======================================================================
const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

// ======================================================================
// Paleta (misma que en colaboracionStore)
// ======================================================================
const COLORES = [
  '#f87171',
  '#fb923c',
  '#facc15',
  '#4ade80',
  '#22d3ee',
  '#60a5fa',
  '#a78bfa',
  '#f472b6',
];

function colorPorId(id: number): string {
  return COLORES[Math.abs(id) % COLORES.length];
}

// ======================================================================
// Utilidades
// ======================================================================
function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

// ======================================================================
// Componente
// ======================================================================
export function Avatar({
  nombre,
  id,
  src,
  size = 'md',
  color,
  title,
  className = '',
}: AvatarProps) {
  const bg = color ?? (id !== undefined ? colorPorId(id) : '#64748b');

  const baseClass = [
    'inline-flex items-center justify-center rounded-full font-semibold',
    'text-white select-none overflow-hidden',
    SIZE_CLASSES[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (src) {
    return (
      <span
        className={baseClass}
        title={title ?? nombre}
        style={{ backgroundColor: bg }}
      >
        <img
          src={src}
          alt={nombre}
          className="h-full w-full object-cover"
          onError={(e) => {
            // Fallback si la imagen no carga: ocultarla y dejar las iniciales visibles
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      </span>
    );
  }

  return (
    <span className={baseClass} title={title ?? nombre} style={{ backgroundColor: bg }}>
      {iniciales(nombre)}
    </span>
  );
}

// ======================================================================
// Grupo de avatares apilados (útil en panels de colaboradores)
// ======================================================================
export interface AvatarGroupProps {
  usuarios: Array<{ id: Id; nombre: string; src?: string | null }>;
  size?: AvatarSize;
  max?: number;
  className?: string;
}

export function AvatarGroup({
  usuarios,
  size = 'sm',
  max = 5,
  className = '',
}: AvatarGroupProps) {
  const visibles = usuarios.slice(0, max);
  const restantes = usuarios.length - visibles.length;

  return (
    <div className={['flex -space-x-2', className].filter(Boolean).join(' ')}>
      {visibles.map((u) => (
        <Avatar
          key={u.id}
          id={u.id}
          nombre={u.nombre}
          src={u.src}
          size={size}
          className="ring-2 ring-surface-900"
        />
      ))}
      {restantes > 0 && (
        <span
          className={[
            'inline-flex items-center justify-center rounded-full',
            'bg-surface-700 font-semibold text-surface-200 ring-2 ring-surface-900',
            SIZE_CLASSES[size],
          ].join(' ')}
          title={`+${restantes} más`}
        >
          +{restantes}
        </span>
      )}
    </div>
  );
}

export default Avatar;