// src/features/diagrama-editor/panels/RelationshipPanel.tsx
/**
 * Panel de propiedades de una relación seleccionada.
 *
 * Permite editar:
 * - Tipo de relación.
 * - Multiplicidades origen/destino.
 * - Nombre de la asociación, roles.
 * - Eliminar la relación.
 */

import { useEffect, useState } from 'react';

import Button from '@/components/Button';
import { useDiagramaStore, useProyectoStore, useAuthStore, toast } from '@/store';
import type { RelacionUML, TipoRelacion } from '@/types';

// ======================================================================
// Tipos
// ======================================================================
interface RelationshipPanelProps {
  relacion: RelacionUML;
}

const TIPOS: { valor: TipoRelacion; label: string }[] = [
  { valor: 'ASOCIACION', label: 'Asociación' },
  { valor: 'AGREGACION', label: 'Agregación' },
  { valor: 'COMPOSICION', label: 'Composición' },
  { valor: 'DEPENDENCIA', label: 'Dependencia' },
  { valor: 'GENERALIZACION', label: 'Generalización (herencia)' },
  { valor: 'REALIZACION', label: 'Realización' },
];

// ======================================================================
// Componente
// ======================================================================
export function RelationshipPanel({ relacion }: RelationshipPanelProps) {
  const actualizarRelacion = useDiagramaStore((s) => s.actualizarRelacion);
  const eliminarRelacion = useDiagramaStore((s) => s.eliminarRelacion);
  const seleccionar = useDiagramaStore((s) => s.seleccionar);
  const clases = useDiagramaStore((s) => s.clases);

  const usuario = useAuthStore((s) => s.usuario);
  const proyectoActivo = useProyectoStore((s) => s.proyectoActivo);

  const [nombreAsoc, setNombreAsoc] = useState(relacion.nombre_asociacion ?? '');
  const [multOrigen, setMultOrigen] = useState(relacion.multiplicidad_origen ?? '');
  const [multDestino, setMultDestino] = useState(
    relacion.multiplicidad_destino ?? ''
  );
  const [rolOrigen, setRolOrigen] = useState(relacion.rol_origen ?? '');
  const [rolDestino, setRolDestino] = useState(relacion.rol_destino ?? '');

  useEffect(() => {
    setNombreAsoc(relacion.nombre_asociacion ?? '');
    setMultOrigen(relacion.multiplicidad_origen ?? '');
    setMultDestino(relacion.multiplicidad_destino ?? '');
    setRolOrigen(relacion.rol_origen ?? '');
    setRolDestino(relacion.rol_destino ?? '');
  }, [
    relacion.id,
    relacion.nombre_asociacion,
    relacion.multiplicidad_origen,
    relacion.multiplicidad_destino,
    relacion.rol_origen,
    relacion.rol_destino,
  ]);

  const claseOrigen = clases.find((c) => c.id === relacion.id_clase_origen);
  const claseDestino = clases.find((c) => c.id === relacion.id_clase_destino);

  const miMiembro = proyectoActivo?.miembros.find(
    (m) => m.id_usuario === usuario?.id
  );
  const soloLectura = miMiembro?.rol_en_proyecto === 'LECTOR';

  // ------------------------------------------------------------------
  // Guardar
  // ------------------------------------------------------------------
  async function guardar(payload: Partial<RelacionUML>) {
    try {
      await actualizarRelacion(relacion.id, payload);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo actualizar'
      );
    }
  }

  // ------------------------------------------------------------------
  // Eliminar
  // ------------------------------------------------------------------
  async function handleEliminar() {
    if (!window.confirm('¿Eliminar esta relación?')) return;
    try {
      await eliminarRelacion(relacion.id);
      seleccionar(null);
      toast.success('Relación eliminada');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo eliminar'
      );
    }
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-surface-800 p-3">
        <div className="mb-3 flex items-center justify-between">
          <span className="rounded bg-info/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-info">
            Relación
          </span>
          {!soloLectura && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void handleEliminar()}
              title="Eliminar relación"
              className="!p-1.5 text-surface-400 hover:text-danger"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </Button>
          )}
        </div>

        {/* Clases conectadas (solo lectura) */}
        <div className="mb-3 space-y-1 text-xs">
          <p className="text-surface-400">
            <span className="font-medium text-surface-300">
              {claseOrigen?.nombre ?? '?'}
            </span>{' '}
            →{' '}
            <span className="font-medium text-surface-300">
              {claseDestino?.nombre ?? '?'}
            </span>
          </p>
        </div>

        {/* Tipo */}
        <div className="mb-2">
          <label className="label-base text-xs">Tipo</label>
          <select
            value={relacion.tipo_relacion}
            onChange={(e) =>
              void guardar({ tipo_relacion: e.target.value as TipoRelacion })
            }
            disabled={soloLectura}
            className="input-base text-sm"
          >
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Nombre de la asociación */}
        <div>
          <label className="label-base text-xs">Nombre</label>
          <input
            type="text"
            value={nombreAsoc}
            onChange={(e) => setNombreAsoc(e.target.value)}
            onBlur={() => {
              if (nombreAsoc !== (relacion.nombre_asociacion ?? '')) {
                void guardar({ nombre_asociacion: nombreAsoc || null });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            disabled={soloLectura}
            placeholder="Contrata, Pertenece a…"
            className="input-base text-sm"
          />
        </div>
      </div>

      {/* Cuerpo */}
      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        {/* Origen */}
        <div className="rounded border border-surface-800 p-2">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-surface-500">
            Origen ({claseOrigen?.nombre ?? '?'})
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label-base text-xs">Multiplicidad</label>
              <input
                type="text"
                value={multOrigen}
                onChange={(e) => setMultOrigen(e.target.value)}
                onBlur={() => {
                  if (multOrigen !== (relacion.multiplicidad_origen ?? '')) {
                    void guardar({ multiplicidad_origen: multOrigen || null });
                  }
                }}
                disabled={soloLectura}
                placeholder="1, 0..*, *"
                className="input-base text-xs"
              />
            </div>
            <div>
              <label className="label-base text-xs">Rol</label>
              <input
                type="text"
                value={rolOrigen}
                onChange={(e) => setRolOrigen(e.target.value)}
                onBlur={() => {
                  if (rolOrigen !== (relacion.rol_origen ?? '')) {
                    void guardar({ rol_origen: rolOrigen || null });
                  }
                }}
                disabled={soloLectura}
                className="input-base text-xs"
              />
            </div>
          </div>
        </div>

        {/* Destino */}
        <div className="rounded border border-surface-800 p-2">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-surface-500">
            Destino ({claseDestino?.nombre ?? '?'})
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label-base text-xs">Multiplicidad</label>
              <input
                type="text"
                value={multDestino}
                onChange={(e) => setMultDestino(e.target.value)}
                onBlur={() => {
                  if (multDestino !== (relacion.multiplicidad_destino ?? '')) {
                    void guardar({ multiplicidad_destino: multDestino || null });
                  }
                }}
                disabled={soloLectura}
                placeholder="1, 0..*, *"
                className="input-base text-xs"
              />
            </div>
            <div>
              <label className="label-base text-xs">Rol</label>
              <input
                type="text"
                value={rolDestino}
                onChange={(e) => setRolDestino(e.target.value)}
                onBlur={() => {
                  if (rolDestino !== (relacion.rol_destino ?? '')) {
                    void guardar({ rol_destino: rolDestino || null });
                  }
                }}
                disabled={soloLectura}
                className="input-base text-xs"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RelationshipPanel;