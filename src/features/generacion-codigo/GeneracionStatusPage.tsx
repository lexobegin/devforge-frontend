// src/features/generacion-codigo/GeneracionStatusPage.tsx
/**
 * Página de estado de un trabajo de generación.
 *
 * - Hace polling cada 2s al endpoint `/trabajos/{id}/estado`.
 * - Muestra el estado actual: PENDIENTE, EN_PROCESO, EXITOSO, FALLIDO.
 * - Al terminar exitosamente:
 *   - Muestra el detalle del mapeo (entidades generadas).
 *   - Ofrece el botón de descarga.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Button from '@/components/Button';
import { PageLoader } from '@/components/Loader';
import { generacionApi } from '@/api';
import { toast } from '@/store';
import type {
  EstadoGeneracion,
  EstadoTrabajoGeneracion,
  TrabajoGeneracionDetalle,
} from '@/types';
import DescargarProyectoButton from './DescargarProyectoButton';

// ======================================================================
// Intervalos
// ======================================================================
const POLL_INTERVAL_MS = 2000;

// ======================================================================
// Componente
// ======================================================================
export function GeneracionStatusPage() {
  const { trabajoId } = useParams<{ trabajoId: string }>();
  const id = trabajoId ? parseInt(trabajoId, 10) : null;
  const navigate = useNavigate();

  const [estado, setEstado] = useState<EstadoGeneracion | null>(null);
  const [detalle, setDetalle] = useState<TrabajoGeneracionDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<number | null>(null);

  // ------------------------------------------------------------------
  // Polling
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!id) return;

    let cancelado = false;

    const consultar = async () => {
      try {
        const e = await generacionApi.obtenerEstado(id);
        if (cancelado) return;
        setEstado(e);

        if (e.estado === 'EXITOSO') {
          // Cargar detalle completo y detener polling
          const d = await generacionApi.obtener(id);
          if (cancelado) return;
          setDetalle(d);
          detenerPolling();
        } else if (e.estado === 'FALLIDO') {
          detenerPolling();
        }
      } catch (err) {
        if (cancelado) return;
        setError(
          err instanceof Error ? err.message : 'Error al consultar el estado'
        );
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    const detenerPolling = () => {
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    // Primera consulta inmediata
    void consultar();
    pollRef.current = window.setInterval(() => {
      void consultar();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelado = true;
      detenerPolling();
    };
  }, [id]);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  if (!id) {
    return (
      <div className="p-6 text-center text-surface-400">
        Trabajo no especificado.
      </div>
    );
  }

  if (cargando && !estado) {
    return <PageLoader mensaje="Cargando estado…" />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-lg border border-danger/40 bg-danger/10 p-4">
          <p className="font-medium text-danger">{error}</p>
          <Button
            variant="ghost"
            className="mt-3"
            onClick={() => navigate(-1)}
          >
            Volver
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* -------- Header -------- */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-3 flex items-center gap-1 text-sm text-surface-400 hover:text-surface-200"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Volver
        </button>

        <h1 className="text-2xl font-bold text-surface-100">
          Generación de backend
        </h1>
        <p className="mt-1 text-sm text-surface-400">
          Trabajo #{id} · Spring Boot + JPA + PostgreSQL
        </p>
      </div>

      {/* -------- Estado actual -------- */}
      {estado && <EstadoCard estado={estado} />}

      {/* -------- Detalle si está EXITOSO -------- */}
      {detalle && detalle.estado === 'EXITOSO' && (
        <>
          {/* Entidades generadas */}
          <div className="mt-6 rounded-lg border border-surface-800 bg-surface-900/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-surface-100">
                Backend generado
              </h2>
              <span className="rounded bg-success/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success">
                Listo
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Stat label="Entidades" value={detalle.entidades.length} />
              <Stat
                label="Tablas"
                value={
                  new Set(detalle.entidades.map((e) => e.nombre_tabla)).size
                }
              />
              <Stat
                label="Campos"
                value={detalle.entidades.reduce(
                  (sum, e) => sum + e.reglas_mapeo.length,
                  0
                )}
              />
              <Stat label="Stack" value="Spring Boot" />
            </div>

            {/* Tabla de entidades */}
            {detalle.entidades.length > 0 && (
              <div className="mt-4 overflow-hidden rounded border border-surface-800">
                <table className="w-full text-xs">
                  <thead className="bg-surface-800/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-surface-300">
                        Clase Java
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-surface-300">
                        Tabla PostgreSQL
                      </th>
                      <th className="px-3 py-2 text-right font-semibold text-surface-300">
                        Campos
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalle.entidades.map((e) => (
                      <tr
                        key={e.id}
                        className="border-t border-surface-800 hover:bg-surface-800/20"
                      >
                        <td className="px-3 py-2 font-mono text-surface-200">
                          {e.nombre_clase_java}
                        </td>
                        <td className="px-3 py-2 font-mono text-surface-400">
                          {e.nombre_tabla}
                        </td>
                        <td className="px-3 py-2 text-right text-surface-300">
                          {e.reglas_mapeo.length}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Descarga */}
          <div className="mt-6 flex justify-end">
            <DescargarProyectoButton trabajoId={detalle.id} />
          </div>
        </>
      )}

      {/* -------- Acciones si falló -------- */}
      {detalle && detalle.estado === 'FALLIDO' && (
        <div className="mt-6 rounded-lg border border-danger/40 bg-danger/10 p-4">
          <p className="text-sm font-medium text-danger">
            La generación falló.
          </p>
          <p className="mt-1 text-xs text-surface-400">
            Revisá los logs del backend o intentá generar de nuevo.
          </p>
          <Button
            variant="secondary"
            className="mt-3"
            onClick={() => navigate(-1)}
          >
            Volver al diagrama
          </Button>
        </div>
      )}
    </div>
  );
}

// ======================================================================
// Card de estado
// ======================================================================
function EstadoCard({ estado }: { estado: EstadoGeneracion }) {
  const config = ESTADO_CONFIG[estado.estado];

  return (
    <div
      className={[
        'rounded-lg border p-4',
        config.borderClass,
        config.bgClass,
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {estado.estado === 'EN_PROCESO' || estado.estado === 'PENDIENTE' ? (
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-surface-600 border-t-brand-500" />
          ) : estado.estado === 'EXITOSO' ? (
            <svg
              className="h-5 w-5 text-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5 text-danger"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className={['text-sm font-semibold', config.textClass].join(' ')}>
            {config.label}
          </p>
          <p className="mt-0.5 text-xs text-surface-400">
            {config.descripcion}
          </p>

          {estado.mensaje && (
            <p className="mt-1 text-xs text-surface-500">{estado.mensaje}</p>
          )}

          <div className="mt-2 flex gap-4 text-[10px] text-surface-500">
            {estado.started_at && (
              <span>Iniciado: {formatFecha(estado.started_at)}</span>
            )}
            {estado.finished_at && (
              <span>Finalizado: {formatFecha(estado.finished_at)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Barra de progreso (si está en proceso) */}
      {estado.estado === 'EN_PROCESO' && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-800">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-500"
            style={{ width: `${estado.progreso ?? 50}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ======================================================================
// Config por estado
// ======================================================================
const ESTADO_CONFIG: Record<
  EstadoTrabajoGeneracion,
  {
    label: string;
    descripcion: string;
    textClass: string;
    borderClass: string;
    bgClass: string;
  }
> = {
  PENDIENTE: {
    label: 'En cola',
    descripcion: 'El trabajo está esperando ser procesado.',
    textClass: 'text-surface-200',
    borderClass: 'border-surface-700',
    bgClass: 'bg-surface-800/40',
  },
  EN_PROCESO: {
    label: 'Generando…',
    descripcion:
      'Se está generando el backend a partir del diagrama. Puede tardar unos segundos.',
    textClass: 'text-brand-300',
    borderClass: 'border-brand-500/40',
    bgClass: 'bg-brand-500/5',
  },
  EXITOSO: {
    label: 'Generación completada',
    descripcion: 'El backend está listo para descargar.',
    textClass: 'text-success',
    borderClass: 'border-success/40',
    bgClass: 'bg-success/5',
  },
  FALLIDO: {
    label: 'Error en la generación',
    descripcion: 'Algo falló durante el proceso.',
    textClass: 'text-danger',
    borderClass: 'border-danger/40',
    bgClass: 'bg-danger/5',
  },
};

// ======================================================================
// Subcomponentes
// ======================================================================
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-surface-800 bg-surface-900/40 p-2">
      <p className="text-[10px] uppercase tracking-wider text-surface-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-surface-100">{value}</p>
    </div>
  );
}

// ======================================================================
// Helper
// ======================================================================
function formatFecha(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('es-BO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default GeneracionStatusPage;