// src/features/diagrama-editor/panels/ClassPropertiesPanel.tsx
/**
 * Panel de propiedades de una clase seleccionada.
 *
 * Permite editar:
 * - Nombre, estereotipo, abstracta.
 * - Atributos (AttributesEditor).
 * - Operaciones (OperationsEditor).
 * - Botón para eliminar la clase.
 */

import { useEffect, useState } from 'react';

import Button from '@/components/Button';
import { useDiagramaStore, useProyectoStore, useAuthStore, toast } from '@/store';
import type { ClaseUML } from '@/types';
import AttributesEditor from './AttributesEditor';
import OperationsEditor from './OperationsEditor';

// ======================================================================
// Tipos
// ======================================================================
interface ClassPropertiesPanelProps {
  clase: ClaseUML;
}

// ======================================================================
// Componente
// ======================================================================
export function ClassPropertiesPanel({ clase }: ClassPropertiesPanelProps) {
  const actualizarClase = useDiagramaStore((s) => s.actualizarClase);
  const eliminarClase = useDiagramaStore((s) => s.eliminarClase);
  const seleccionar = useDiagramaStore((s) => s.seleccionar);

  const usuario = useAuthStore((s) => s.usuario);
  const proyectoActivo = useProyectoStore((s) => s.proyectoActivo);

  const [nombre, setNombre] = useState(clase.nombre);
  const [estereotipo, setEstereotipo] = useState(clase.estereotipo ?? '');

  // Sincronizar estado local si cambia la clase seleccionada
  useEffect(() => {
    setNombre(clase.nombre);
    setEstereotipo(clase.estereotipo ?? '');
  }, [clase.id, clase.nombre, clase.estereotipo]);

  // Permisos
  const miMiembro = proyectoActivo?.miembros.find(
    (m) => m.id_usuario === usuario?.id
  );
  const soloLectura = miMiembro?.rol_en_proyecto === 'LECTOR';

  // ------------------------------------------------------------------
  // Guardar campos simples
  // ------------------------------------------------------------------
  async function guardarNombre() {
    const nuevo = nombre.trim();
    if (!nuevo || nuevo === clase.nombre) {
      setNombre(clase.nombre);
      return;
    }
    try {
      await actualizarClase(clase.id, { nombre: nuevo });
    } catch (err) {
      setNombre(clase.nombre);
      toast.error(
        err instanceof Error ? err.message : 'No se pudo actualizar el nombre'
      );
    }
  }

  async function guardarEstereotipo() {
    const nuevo = estereotipo.trim();
    if (nuevo === (clase.estereotipo ?? '')) return;
    try {
      await actualizarClase(clase.id, { estereotipo: nuevo || null });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo actualizar'
      );
    }
  }

  async function toggleAbstracta() {
    try {
      await actualizarClase(clase.id, { es_abstracta: !clase.es_abstracta });
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
    if (
      !window.confirm(
        `¿Eliminar la clase "${clase.nombre}"? Se eliminarán también sus relaciones.`
      )
    ) {
      return;
    }
    try {
      await eliminarClase(clase.id);
      seleccionar(null);
      toast.success('Clase eliminada');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo eliminar la clase'
      );
    }
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-surface-800 p-3">
        <div className="mb-3 flex items-center justify-between">
          <span className="rounded bg-brand-600/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-300">
            Clase
          </span>
          {!soloLectura && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void handleEliminar()}
              title="Eliminar clase"
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

        {/* Nombre */}
        <div className="mb-2">
          <label className="label-base text-xs">Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onBlur={() => void guardarNombre()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            disabled={soloLectura}
            className="input-base text-sm"
          />
        </div>

        {/* Estereotipo */}
        <div className="mb-2">
          <label className="label-base text-xs">Estereotipo</label>
          <input
            type="text"
            value={estereotipo}
            onChange={(e) => setEstereotipo(e.target.value)}
            onBlur={() => void guardarEstereotipo()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            disabled={soloLectura}
            placeholder="entity, control, boundary…"
            className="input-base text-sm"
          />
        </div>

        {/* Abstracta */}
        <label className="flex cursor-pointer items-center gap-2 text-sm text-surface-300">
          <input
            type="checkbox"
            checked={clase.es_abstracta}
            onChange={() => void toggleAbstracta()}
            disabled={soloLectura}
            className="h-4 w-4 rounded border-surface-700 bg-surface-800 text-brand-600 focus:ring-brand-500"
          />
          Clase abstracta
        </label>
      </div>

      {/* Cuerpo scrollable */}
      <div className="flex-1 space-y-5 overflow-y-auto p-3">
        <AttributesEditor
          claseId={clase.id}
          atributos={clase.atributos}
          disabled={soloLectura}
        />

        <OperationsEditor
          claseId={clase.id}
          operaciones={clase.operaciones}
          disabled={soloLectura}
        />
      </div>
    </div>
  );
}

export default ClassPropertiesPanel;