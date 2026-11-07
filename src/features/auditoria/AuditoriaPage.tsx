// src/features/auditoria/AuditoriaPage.tsx
/**
 * Pantalla de Auditoría (CU3 — Consultar Bitácora del Sistema).
 *
 * Solo accesible para ADMIN (RequireAdmin en el AppRouter + require_admin
 * en todos los endpoints del backend). Permite:
 * - Listar la bitácora con filtros (usuario, tipo de evento, entidad, fechas).
 * - Paginación.
 * - Exportar el resultado filtrado a Excel o PDF.
 *
 * Todos los filtros se aplican en el backend.
 *
 * Contrato Ciclo 2 (auditoria_router.py + auditoriaApi):
 * - Los ids (evento, usuario) son PydanticObjectId → STRING HEX, y
 *   id_entidad_afectada es str|None — nada de números ni parseInt.
 * - La consulta y las exportaciones van por auditoriaApi (el JWT viaja
 *   en el header; las exportaciones se consumen como Blob y se descargan
 *   con URL.createObjectURL).
 * - TIPOS_EVENTO refleja los eventos que el backend realmente registra
 *   (auditoria_service.py + generacion_router.py).
 */

import { useCallback, useEffect, useState } from 'react';

import Button from '@/components/Button';
import { PageLoader } from '@/components/Loader';
import { auditoriaApi, type BitacoraQuery, type BitacoraSistema } from '@/api';
import { toast } from '@/store';

// ======================================================================
// Filtros
// ======================================================================
interface Filtros {
  id_usuario: string;
  tipo_evento: string;
  entidad_afectada: string;
  desde: string;
  hasta: string;
}

const FILTROS_INICIALES: Filtros = {
  id_usuario: '',
  tipo_evento: '',
  entidad_afectada: '',
  desde: '',
  hasta: '',
};

/** Eventos que el backend registra realmente (Ciclo 2). */
const TIPOS_EVENTO = [
  'LOGIN',
  'USUARIO_REGISTRADO',
  'PROYECTO_CREADO',
  'GENERACION_SOLICITADA',
  'GENERACION_COMPLETADA',
  'GENERACION_FALLIDA',
  'DIAGRAMA_EXPORTADO',
  'DIAGRAMA_IMPORTADO',
];

/** Entidades que el backend usa en entidad_afectada. */
const ENTIDADES = ['USUARIO', 'PROYECTO', 'DIAGRAMA', 'TRABAJO_GENERACION'];

const PAGE_SIZE = 50; // el backend admite limit hasta 1000

// ======================================================================
// Helpers de filtro
// ======================================================================
/** Filtros del form → BitacoraQuery (id_usuario queda string hex). */
function aQuery(f: Filtros): BitacoraQuery {
  const query: BitacoraQuery = {};
  if (f.id_usuario.trim()) query.id_usuario = f.id_usuario.trim();
  if (f.tipo_evento) query.tipo_evento = f.tipo_evento;
  if (f.entidad_afectada) query.entidad_afectada = f.entidad_afectada;
  if (f.desde) query.desde = normalizarFecha(f.desde);
  if (f.hasta) query.hasta = normalizarFecha(f.hasta);
  return query;
}

/** datetime-local manda "YYYY-MM-DDTHH:mm" → se completan los segundos
 *  para que el backend (datetime ISO 8601) siempre lo acepte. */
function normalizarFecha(valor: string): string {
  return valor.length === 16 ? `${valor}:00` : valor;
}

// ======================================================================
// Componente
// ======================================================================
export function AuditoriaPage() {
  const [eventos, setEventos] = useState<BitacoraSistema[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIALES);
  const [filtrosAplicados, setFiltrosAplicados] = useState<Filtros>(FILTROS_INICIALES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportando, setExportando] = useState<'excel' | 'pdf' | null>(null);

  // ------------------------------------------------------------------
  // Cargar
  // ------------------------------------------------------------------
  const cargar = useCallback(
    async (nuevoSkip: number, filtrosActivos: Filtros) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await auditoriaApi.listar({
          ...aQuery(filtrosActivos),
          skip: nuevoSkip,
          limit: PAGE_SIZE,
        });
        setEventos(res.items);
        setTotal(res.total);
        setSkip(nuevoSkip);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'No se pudo cargar la bitácora'
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Carga inicial
  useEffect(() => {
    void cargar(0, FILTROS_INICIALES);
  }, [cargar]);

  // ------------------------------------------------------------------
  // Aplicar filtros
  // ------------------------------------------------------------------
  const aplicarFiltros = () => {
    setFiltrosAplicados(filtros);
    void cargar(0, filtros);
  };

  const limpiarFiltros = () => {
    setFiltros(FILTROS_INICIALES);
    setFiltrosAplicados(FILTROS_INICIALES);
    void cargar(0, FILTROS_INICIALES);
  };

  // ------------------------------------------------------------------
  // Exportar (Blob → descarga; sin skip/limit: el backend no los pide)
  // ------------------------------------------------------------------
  const exportar = async (formato: 'excel' | 'pdf') => {
    setExportando(formato);
    try {
      const query = aQuery(filtrosAplicados);
      const blob =
        formato === 'excel'
          ? await auditoriaApi.exportarExcel(query)
          : await auditoriaApi.exportarPdf(query);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bitacora_${new Date().toISOString().slice(0, 10)}.${
        formato === 'excel' ? 'xlsx' : 'pdf'
      }`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Exportación a ${formato.toUpperCase()} iniciada`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo exportar'
      );
    } finally {
      setExportando(null);
    }
  };

  // ------------------------------------------------------------------
  // Paginación
  // ------------------------------------------------------------------
  const paginaActual = Math.floor(skip / PAGE_SIZE) + 1;
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hayAnterior = skip > 0;
  const haySiguiente = skip + PAGE_SIZE < total;

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* -------- Header -------- */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">
            Bitácora del sistema
          </h1>
          <p className="mt-1 text-sm text-surface-400">
            {total} evento{total !== 1 ? 's' : ''} registrado
            {total !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void exportar('excel')}
            loading={exportando === 'excel'}
            disabled={!!exportando || total === 0}
          >
            Excel
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void exportar('pdf')}
            loading={exportando === 'pdf'}
            disabled={!!exportando || total === 0}
          >
            PDF
          </Button>
        </div>
      </div>

      {/* -------- Filtros -------- */}
      <div className="mb-4 rounded-lg border border-surface-800 bg-surface-900/40 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="label-base text-xs">ID Usuario</label>
            <input
              type="text"
              value={filtros.id_usuario}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, id_usuario: e.target.value }))
              }
              placeholder="Todos (id hex)"
              className="input-base text-sm"
            />
          </div>

          <div>
            <label className="label-base text-xs">Tipo de evento</label>
            <select
              value={filtros.tipo_evento}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, tipo_evento: e.target.value }))
              }
              className="input-base text-sm"
            >
              <option value="">Todos</option>
              {TIPOS_EVENTO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-base text-xs">Entidad afectada</label>
            <select
              value={filtros.entidad_afectada}
              onChange={(e) =>
                setFiltros((f) => ({
                  ...f,
                  entidad_afectada: e.target.value,
                }))
              }
              className="input-base text-sm"
            >
              <option value="">Todas</option>
              {ENTIDADES.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-base text-xs">Desde</label>
            <input
              type="datetime-local"
              value={filtros.desde}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, desde: e.target.value }))
              }
              className="input-base text-sm"
            />
          </div>

          <div>
            <label className="label-base text-xs">Hasta</label>
            <input
              type="datetime-local"
              value={filtros.hasta}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, hasta: e.target.value }))
              }
              className="input-base text-sm"
            />
          </div>
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={limpiarFiltros}>
            Limpiar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={aplicarFiltros}
            loading={isLoading}
          >
            Aplicar filtros
          </Button>
        </div>
      </div>

      {/* -------- Error -------- */}
      {error && (
        <div className="mb-4 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* -------- Tabla -------- */}
      {isLoading && eventos.length === 0 ? (
        <PageLoader mensaje="Cargando bitácora…" />
      ) : eventos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-surface-700 p-10 text-center">
          <p className="text-surface-400">
            No hay eventos que coincidan con los filtros.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-surface-800">
            <table className="w-full text-sm">
              <thead className="bg-surface-800/60">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-surface-300">
                    Fecha
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-surface-300">
                    Usuario
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-surface-300">
                    Tipo
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-surface-300">
                    Descripción
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-surface-300">
                    Entidad
                  </th>
                </tr>
              </thead>
              <tbody>
                {eventos.map((e) => (
                  <tr
                    key={e.id}
                    className="border-t border-surface-800 hover:bg-surface-800/20"
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-surface-400">
                      {formatFecha(e.created_at)}
                    </td>
                    <td className="px-3 py-2 text-xs text-surface-300">
                      {e.id_usuario ? `#${e.id_usuario}` : 'Sistema'}
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-surface-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-surface-300">
                        {e.tipo_evento}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-surface-200">
                      {e.descripcion}
                    </td>
                    <td className="px-3 py-2 text-xs text-surface-400">
                      {e.entidad_afectada
                        ? `${e.entidad_afectada} #${e.id_entidad_afectada ?? '—'}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* -------- Paginación -------- */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-surface-500">
              Página {paginaActual} de {totalPaginas}
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={!hayAnterior || isLoading}
                onClick={() => void cargar(skip - PAGE_SIZE, filtrosAplicados)}
              >
                ← Anterior
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={!haySiguiente || isLoading}
                onClick={() => void cargar(skip + PAGE_SIZE, filtrosAplicados)}
              >
                Siguiente →
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ======================================================================
// Helper
// ======================================================================
function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default AuditoriaPage;