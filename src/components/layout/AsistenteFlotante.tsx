// src/components/layout/AsistenteFlotante.tsx
/**
 * Botón flotante del asistente IA (F56) — visible en TODAS las páginas
 * autenticadas menos en el editor (ahí ya existe el botón "IA" del
 * header, que abre el MISMO AIPanel con el diagrama activo).
 *
 * ⚠️ CANAL REAL (contrato Ciclo 2): acá NO se usa el Agente Dev — el
 * Agente solo opera sobre un diagrama abierto. Tampoco es todavía la
 * CU23 "Asistente Guía": el backend tiene el service listo
 * (AsistenteGuiaService / canal_service.procesar_pregunta_guia,
 * PreguntaGuiaRequest) pero NINGÚN router lo expone (0 referencias en
 * app/api/). Lo único expuesto sin diagrama es la rama CHAT GENERAL
 * del canal: POST /ia/proyectos/{proyecto_id}/prompt SIN id_diagrama.
 * Este FAB usa esa rama (solo lectura, no propone acciones sobre el
 * lienzo). Cuando el backend publique la ruta de la CU23, cambiar el
 * envío en useAIPrompt/useAIOffline por el endpoint de guía — el resto
 * del panel no se toca.
 *
 * proyectoId: la ruta exige {proyecto_id}; el service lo ignora en el
 * chat general (deriva todo del payload), así que alcanza con el
 * proyecto activo o, si no hay, el primero del usuario.
 */

import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { proyectosApi } from '@/api';
import { useProyectoStore } from '@/store';
import type { Id } from '@/types';
import { AIPanel } from '@/features/diagrama-editor/ai-assistant/AIPanel';

export function AsistenteFlotante() {
  const location = useLocation();

  // En el editor ya hay panel IA propio (header): no duplicar el FAB.
  const esEditor = location.pathname.startsWith('/diagramas/');

  const [abierto, setAbierto] = useState(false);
  const [proyectoId, setProyectoId] = useState<Id | null>(null);
  const [resolviendoProyecto, setResolviendoProyecto] = useState(false);
  const [sinProyectos, setSinProyectos] = useState(false);

  const proyectoActivo = useProyectoStore((s) => s.proyectoActivo);

  // Resolver el proyectoId la PRIMERA vez que se abre: proyecto activo
  // → primer proyecto del usuario (GET /proyectos?limit=1).
  const resolverProyecto = useCallback(async () => {
    if (proyectoActivo) {
      setProyectoId(proyectoActivo.id);
      return;
    }
    setResolviendoProyecto(true);
    try {
      const pagina = await proyectosApi.listar({
        incluir_archivados: false,
        skip: 0,
        limit: 1,
      });
      if (pagina.items.length > 0) {
        setProyectoId(pagina.items[0].id);
      } else {
        setSinProyectos(true);
      }
    } catch {
      setSinProyectos(true);
    } finally {
      setResolviendoProyecto(false);
    }
    // proyectoActivo se lee una sola vez al abrir (no reacciona después:
    // si el usuario entra a un detalle, el panel ya quedó montado).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abrir = useCallback(() => {
    setAbierto(true);
    if (!proyectoId) void resolverProyecto();
  }, [proyectoId, resolverProyecto]);

  // Cerrar con Escape (el panel no captura teclas).
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [abierto]);

  if (esEditor) return null;

  return (
    <>
      {/* -------- Botón flotante -------- */}
      {!abierto && (
        <button
          type="button"
          onClick={abrir}
          title="Asistente IA (chat general)"
          aria-label="Abrir asistente IA"
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-xl transition-colors hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-surface-900"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </button>
      )}

      {/* -------- Panel flotante -------- */}
      {abierto && (
        <div className="fixed bottom-6 right-6 z-40 flex h-[70vh] max-h-[720px] w-96 max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-xl border border-surface-700 bg-surface-900 shadow-2xl">
          {proyectoId ? (
            <AIPanel
              proyectoId={proyectoId}
              diagramaId={null}
              onClose={() => setAbierto(false)}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
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
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              <p className="text-sm font-medium text-surface-200">
                {resolviendoProyecto
                  ? 'Buscando tus proyectos…'
                  : 'Todavía no tenés proyectos'}
              </p>
              {!resolviendoProyecto && (
                <p className="max-w-[16rem] text-xs text-surface-400">
                  {sinProyectos
                    ? 'Creá un proyecto para poder conversar con el asistente IA.'
                    : 'No se pudo cargar la lista de proyectos. Intentá de nuevo.'}
                </p>
              )}
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="rounded-md border border-surface-700 px-3 py-1.5 text-xs font-medium text-surface-300 hover:bg-surface-800"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default AsistenteFlotante;
