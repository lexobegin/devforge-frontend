// src/features/proyectos/ProyectosListPage.tsx
/**
 * Pantalla de listado de proyectos.
 *
 * - Header con título + botón "Nuevo proyecto".
 * - Filtro: mostrar/ocultar archivados.
 * - Grid de tarjetas (ProyectoCard).
 * - Estado vacío con CTA.
 */

import { useEffect, useState } from 'react';

import Button from '@/components/Button';
import { Loader, PageLoader } from '@/components/Loader';
import { useProyectoStore } from '@/store';
import CrearProyectoModal from './components/CrearProyectoModal';
import ProyectoCard from './components/ProyectoCard';

export function ProyectosListPage() {
  const proyectos = useProyectoStore((s) => s.proyectos);
  const total = useProyectoStore((s) => s.total);
  const isLoading = useProyectoStore((s) => s.isLoading);
  const error = useProyectoStore((s) => s.error);
  const filtros = useProyectoStore((s) => s.filtros);
  const cargar = useProyectoStore((s) => s.cargar);
  const setFiltros = useProyectoStore((s) => s.setFiltros);

  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [cargaInicial, setCargaInicial] = useState(true);

  // Carga inicial y al cambiar filtros
  useEffect(() => {
    void cargar({ reset: true }).finally(() => setCargaInicial(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.incluir_archivados]);

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* -------- Header -------- */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Proyectos</h1>
          <p className="mt-1 text-sm text-surface-400">
            {total === 1
              ? '1 proyecto'
              : `${total} proyectos`}
            {filtros.incluir_archivados ? ' (incluye archivados)' : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filtro */}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-surface-300">
            <input
              type="checkbox"
              checked={filtros.incluir_archivados}
              onChange={(e) =>
                setFiltros({ incluir_archivados: e.target.checked })
              }
              className="h-4 w-4 rounded border-surface-700 bg-surface-800 text-brand-600 focus:ring-brand-500"
            />
            Incluir archivados
          </label>

          <Button
            variant="primary"
            leftIcon={
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
            }
            onClick={() => setModalCrearAbierto(true)}
          >
            Nuevo proyecto
          </Button>
        </div>
      </div>

      {/* -------- Error -------- */}
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {error}
        </div>
      )}

      {/* -------- Contenido -------- */}
      {cargaInicial ? (
        <PageLoader mensaje="Cargando proyectos…" />
      ) : proyectos.length === 0 ? (
        <EmptyState onCrear={() => setModalCrearAbierto(true)} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {proyectos.map((p) => (
              <ProyectoCard key={p.id} proyecto={p} />
            ))}
          </div>

          {isLoading && (
            <div className="mt-6">
              <Loader mensaje="Cargando más…" />
            </div>
          )}
        </>
      )}

      {/* -------- Modal crear -------- */}
      <CrearProyectoModal
        open={modalCrearAbierto}
        onClose={() => setModalCrearAbierto(false)}
      />
    </div>
  );
}

// ======================================================================
// Estado vacío
// ======================================================================
function EmptyState({ onCrear }: { onCrear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-surface-700 py-16">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-800">
        <svg
          className="h-8 w-8 text-surface-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
      </div>
      <h2 className="mt-4 text-lg font-semibold text-surface-100">
        Todavía no tenés proyectos
      </h2>
      <p className="mt-1 max-w-sm text-center text-sm text-surface-400">
        Creá tu primer proyecto para empezar a modelar diagramas UML con tu
        equipo y generar backends automáticamente.
      </p>
      <Button
        variant="primary"
        className="mt-6"
        leftIcon={
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
              d="M12 4v16m8-8H4"
            />
          </svg>
        }
        onClick={onCrear}
      >
        Crear primer proyecto
      </Button>
    </div>
  );
}

export default ProyectosListPage;