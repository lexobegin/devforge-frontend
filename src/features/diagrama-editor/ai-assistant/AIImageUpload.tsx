// src/features/diagrama-editor/ai-assistant/AIImageUpload.tsx
/**
 * Subida de boceto para la IA de visión (/ai-vision, aiVisionApi).
 *
 * Permite:
 * - Arrastrar y soltar una imagen.
 * - Seleccionar un archivo desde el sistema.
 * - Pegar desde el portapapeles (Ctrl+V) si el panel está montado.
 *
 * Envía la imagen a `aiVisionApi.reconocerParaDiagrama(diagramaId, file,
 * 'es')` y muestra el resumen de lo detectado. El usuario debe CONFIRMAR
 * para insertar: la inserción va por los endpoints CRUD normales
 * (crearClase/crearRelacion del diagramaStore), NUNCA automática.
 *
 * Contratos verificados:
 * - diagramaId: Id (ObjectId hex) — el paste traía `number | null`.
 * - VisionReconocimientoResponse.diagrama_reconstruido sigue el formato
 *   de DiagramaCompletoResponse → clases: ClaseUML[], relaciones:
 *   RelacionUML[] (tipados acá; el paste los trataba como registros
 *   sueltos con casts por elemento).
 * - Las relaciones del resultado referencian los ids del payload
 *   reconstruido: al insertar se mapea id reconstruido → id REAL que
 *   devuelve crearClase (Promise<ClaseUML>) antes de crearRelacion.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import Button from '@/components/Button';
import { aiVisionApi } from '@/api';
import { useDiagramaStore, toast } from '@/store';
import type { ClaseUML, Id, RelacionUML, TipoRelacion } from '@/types';

// ======================================================================
// Tipos
// ======================================================================
interface ResultadoVision {
  clases: ClaseUML[];
  relaciones: RelacionUML[];
  advertencias: string[];
  confianza: number | null;
}

interface AIImageUploadProps {
  diagramaId: Id | null;
  disabled?: boolean;
}

/** Los 6 valores del Literal TipoRelacion del backend (diagrama_schema). */
const TIPOS_RELACION: readonly TipoRelacion[] = [
  'ASOCIACION',
  'AGREGACION',
  'COMPOSICION',
  'DEPENDENCIA',
  'GENERALIZACION',
  'REALIZACION',
];

/** Defensa para payloads externos (la visión es datos del modelo). */
function esTipoRelacion(valor: string): valor is TipoRelacion {
  return (TIPOS_RELACION as readonly string[]).includes(valor);
}

/** Cuantiza a 2 decimales (== PosicionLienzo 0.01 del backend). */
function posAleatoria(baseX: number, baseY: number): { pos_x: number; pos_y: number } {
  return {
    pos_x: Math.round((baseX + Math.random() * 300) * 100) / 100,
    pos_y: Math.round((baseY + Math.random() * 200) * 100) / 100,
  };
}

export function AIImageUpload({
  diagramaId,
  disabled = false,
}: AIImageUploadProps) {
  const [arrastrando, setArrastrando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoVision | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const crearClase = useDiagramaStore((s) => s.crearClase);
  const crearRelacion = useDiagramaStore((s) => s.crearRelacion);

  // ------------------------------------------------------------------
  // Procesar archivo
  // ------------------------------------------------------------------
  const procesarArchivo = useCallback(
    async (file: File) => {
      if (!diagramaId) {
        toast.error('Primero abrí un diagrama');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('El archivo debe ser una imagen (JPG, PNG o WEBP)');
        return;
      }

      setProcesando(true);
      setResultado(null);
      try {
        const resp = await aiVisionApi.reconocerParaDiagrama(
          diagramaId,
          file,
          'es'
        );
        // diagrama_reconstruido es dict[str, Any] en el backend:
        // defensas al leer claves, como cualquier payload externo.
        setResultado({
          clases: resp.diagrama_reconstruido?.clases ?? [],
          relaciones: resp.diagrama_reconstruido?.relaciones ?? [],
          advertencias: resp.advertencias ?? [],
          confianza: resp.confianza,
        });

        if (!resp.exito) {
          toast.warning(
            'No se detectaron clases. Probá con una imagen más nítida.'
          );
        } else {
          toast.success(
            `Se detectaron ${resp.diagrama_reconstruido?.clases?.length ?? 0} clases`
          );
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Error al procesar la imagen'
        );
      } finally {
        setProcesando(false);
      }
    },
    [diagramaId]
  );

  // ------------------------------------------------------------------
  // Handlers de drop / select / paste
  // ------------------------------------------------------------------
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setArrastrando(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void procesarArchivo(file);
    },
    [procesarArchivo]
  );

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void procesarArchivo(file);
      // Reset para permitir subir el mismo archivo dos veces
      e.target.value = '';
    },
    [procesarArchivo]
  );

  // Pegar desde portapapeles
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const item = Array.from(e.clipboardData.items).find((i) =>
        i.type.startsWith('image/')
      );
      if (item) {
        const file = item.getAsFile();
        if (file) void procesarArchivo(file);
      }
    };
    window.addEventListener('paste', handler);
    return () => window.removeEventListener('paste', handler);
  }, [procesarArchivo]);

  // ------------------------------------------------------------------
  // Insertar en el diagrama (clases + relaciones con mapa de ids)
  // ------------------------------------------------------------------
  const insertar = useCallback(async () => {
    if (!resultado) return;

    // Mapa id reconstruido → id REAL (las relaciones del payload
    // referencian los ids reconstruidos, no los nuevos).
    const mapaIds = new Map<Id, Id>();
    let clasesInsertadas = 0;
    for (const c of resultado.clases) {
      const nombre = c.nombre?.trim();
      if (!nombre) continue;
      try {
        const creada = await crearClase({
          nombre,
          ...posAleatoria(200, 150),
        });
        mapaIds.set(c.id, creada.id);
        clasesInsertadas++;
      } catch {
        // Ignorar duplicados o errores puntuales
      }
    }

    let relacionesInsertadas = 0;
    for (const r of resultado.relaciones) {
      const origenId = mapaIds.get(r.id_clase_origen);
      const destinoId = mapaIds.get(r.id_clase_destino);
      if (!origenId || !destinoId || origenId === destinoId) continue;
      if (!esTipoRelacion(r.tipo_relacion)) continue;
      try {
        await crearRelacion({
          id_clase_origen: origenId,
          id_clase_destino: destinoId,
          tipo_relacion: r.tipo_relacion,
          multiplicidad_origen: r.multiplicidad_origen ?? null,
          multiplicidad_destino: r.multiplicidad_destino ?? null,
          nombre_asociacion: r.nombre_asociacion ?? null,
        });
        relacionesInsertadas++;
      } catch {
        // Error puntual: se sigue con las demás
      }
    }

    if (clasesInsertadas > 0 || relacionesInsertadas > 0) {
      const partes: string[] = [];
      if (clasesInsertadas > 0) {
        partes.push(
          `${clasesInsertadas} clase${clasesInsertadas !== 1 ? 's' : ''}`
        );
      }
      if (relacionesInsertadas > 0) {
        partes.push(
          `${relacionesInsertadas} relación${relacionesInsertadas !== 1 ? 'es' : ''}`
        );
      }
      toast.success(`${partes.join(' y ')} insertada(s) en el diagrama`);
    }
    setResultado(null);
  }, [resultado, crearClase, crearRelacion]);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        {/* -------- Zona de drop -------- */}
        {!resultado && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={[
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors',
              arrastrando
                ? 'border-brand-500 bg-brand-500/10'
                : 'border-surface-700 hover:border-surface-600 hover:bg-surface-800/40',
              disabled || procesando ? 'pointer-events-none opacity-60' : '',
            ].join(' ')}
          >
            {procesando ? (
              <>
                <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-surface-600 border-t-brand-500" />
                <p className="text-sm text-surface-300">Procesando imagen…</p>
                <p className="text-xs text-surface-500">
                  Esto puede tardar unos segundos
                </p>
              </>
            ) : (
              <>
                <svg
                  className="h-10 w-10 text-surface-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-sm font-medium text-surface-200">
                  Subir boceto
                </p>
                <p className="max-w-[220px] text-center text-xs text-surface-500">
                  Arrastrá una imagen, hacé click para elegirla, o pegala con
                  Ctrl+V
                </p>
              </>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onFileInput}
              className="hidden"
            />
          </div>
        )}

        {/* -------- Resultado -------- */}
        {resultado && (
          <div className="space-y-3">
            <div className="rounded-lg border border-surface-800 bg-surface-900/40 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-surface-100">
                  Reconocimiento
                </p>
                {resultado.confianza !== null && (
                  <span className="text-xs text-surface-400">
                    Confianza: {(resultado.confianza * 100).toFixed(0)}%
                  </span>
                )}
              </div>

              <div className="space-y-1 text-xs text-surface-300">
                <p>
                  <span className="font-semibold text-surface-100">
                    {resultado.clases.length}
                  </span>{' '}
                  clase{resultado.clases.length !== 1 ? 's' : ''} detectada
                  {resultado.clases.length !== 1 ? 's' : ''}
                </p>
                <p>
                  <span className="font-semibold text-surface-100">
                    {resultado.relaciones.length}
                  </span>{' '}
                  relación
                  {resultado.relaciones.length !== 1 ? 'es' : ''} detectada
                  {resultado.relaciones.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Lista de clases */}
              {resultado.clases.length > 0 && (
                <ul className="mt-3 space-y-0.5 text-xs text-surface-400">
                  {resultado.clases.slice(0, 10).map((c) => (
                    <li key={c.id} className="truncate">
                      • {c.nombre}
                    </li>
                  ))}
                  {resultado.clases.length > 10 && (
                    <li className="text-surface-500">
                      … y {resultado.clases.length - 10} más
                    </li>
                  )}
                </ul>
              )}

              {resultado.advertencias.length > 0 && (
                <div className="mt-3 rounded border border-warning/30 bg-warning/5 p-2">
                  {resultado.advertencias.map((a, i) => (
                    <p key={i} className="text-xs text-warning">
                      ⚠ {a}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                fullWidth
                onClick={() => setResultado(null)}
              >
                Descartar
              </Button>
              <Button
                variant="primary"
                size="sm"
                fullWidth
                onClick={() => void insertar()}
                disabled={resultado.clases.length === 0}
              >
                Insertar {resultado.clases.length} clase
                {resultado.clases.length !== 1 ? 's' : ''}
                {resultado.relaciones.length > 0
                  ? ` y ${resultado.relaciones.length} relación${
                      resultado.relaciones.length !== 1 ? 'es' : ''
                    }`
                  : ''}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AIImageUpload;