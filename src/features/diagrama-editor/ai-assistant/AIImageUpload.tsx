// src/features/diagrama-editor/ai-assistant/AIImageUpload.tsx
/**
 * Subida de boceto para IA de visión.
 *
 * Permite:
 * - Arrastrar y soltar una imagen.
 * - Seleccionar un archivo desde el sistema.
 * - Pegar desde el portapapeles (Ctrl+V) si el panel tiene foco.
 *
 * Envía la imagen a `aiVisionApi.reconocerParaDiagrama()` y muestra el
 * resumen de lo detectado. El usuario debe confirmar para insertar los
 * elementos en el diagrama actual.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import Button from '@/components/Button';
import { aiVisionApi } from '@/api';
import { useDiagramaStore, toast } from '@/store';

interface AIImageUploadProps {
  diagramaId: number | null;
  disabled?: boolean;
}

export function AIImageUpload({
  diagramaId,
  disabled = false,
}: AIImageUploadProps) {
  const [arrastrando, setArrastrando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState<{
    clases: Array<Record<string, unknown>>;
    relaciones: Array<Record<string, unknown>>;
    advertencias: string[];
    confianza: number | null;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const crearClase = useDiagramaStore((s) => s.crearClase);

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
        setResultado({
          clases: resp.diagrama_reconstruido.clases,
          relaciones: resp.diagrama_reconstruido.relaciones,
          advertencias: resp.advertencias,
          confianza: resp.confianza,
        });

        if (!resp.exito) {
          toast.warning(
            'No se detectaron clases. Probá con una imagen más nítida.'
          );
        } else {
          toast.success(
            `Se detectaron ${resp.diagrama_reconstruido.clases.length} clases`
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
  // Insertar en el diagrama
  // ------------------------------------------------------------------
  const insertar = useCallback(async () => {
    if (!resultado) return;

    let insertadas = 0;
    for (const c of resultado.clases) {
      const nombre = String((c as { nombre?: string }).nombre ?? '').trim();
      if (!nombre) continue;
      try {
        await crearClase({
          nombre,
          pos_x: 200 + Math.random() * 300,
          pos_y: 150 + Math.random() * 200,
        });
        insertadas++;
      } catch {
        // Ignorar duplicados o errores puntuales
      }
    }

    if (insertadas > 0) {
      toast.success(`${insertadas} clase${insertadas > 1 ? 's' : ''} insertada${insertadas > 1 ? 's' : ''}`);
    }
    setResultado(null);
  }, [resultado, crearClase]);

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
                  {resultado.clases.slice(0, 10).map((c, i) => (
                    <li key={i} className="truncate">
                      • {String((c as { nombre?: string }).nombre ?? '?')}
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
                Insertar {resultado.clases.length} clases
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AIImageUpload;