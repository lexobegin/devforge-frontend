// src/features/diagrama-editor/ai-assistant/AIPanel.tsx
/**
 * Panel contenedor de la IA asistente (Agente Dev, módulo G).
 *
 * Tabs:
 * - Chat  → AIChatPanel (prompts por TEXTO + botón de VOZ al pie).
 * - Imagen → AIImageUpload (boceto → IA de visión, /ai-vision).
 *
 * El botón flotante "IA" del header del editor (F44) abre/cierra este
 * panel. Los ids son Id (ObjectId hex, string): DiagramEditorPage pasa
 * `proyectoId={diagrama.id_proyecto}` y `diagramaId={diagrama.id}` — el
 * paste traía `number | null` y habría roto el tsc (la página solo
 * renderiza este panel con el diagrama ya cargado).
 */

import { useState, type ReactNode } from 'react';

import type { Id } from '@/types';
import AIChatPanel from './AIChatPanel';
import AIImageUpload from './AIImageUpload';
import AIVoiceButton from './AIVoiceButton';
import { useAIPrompt } from './useAIPrompt';

// ======================================================================
// Tipos
// ======================================================================
interface AIPanelProps {
  /** Id del proyecto (ruta POST /ia/proyectos/{proyecto_id}/prompt). */
  proyectoId: Id | null;
  /** Id del diagrama activo (Agente Dev); null → chat general. */
  diagramaId: Id | null;
  disabled?: boolean;
  onClose: () => void;
}

type Tab = 'chat' | 'imagen';

// ======================================================================
// Componente
// ======================================================================
export function AIPanel({
  proyectoId,
  diagramaId,
  disabled = false,
  onClose,
}: AIPanelProps) {
  const [tab, setTab] = useState<Tab>('chat');
  const {
    mensajes,
    enviando,
    pendientes,
    procesando,
    enviarPrompt,
    aplicarAcciones,
    procesarPendientes,
    limpiarChat,
  } = useAIPrompt(proyectoId, diagramaId);

  return (
    <aside className="flex h-full w-96 flex-shrink-0 flex-col border-l border-surface-800 bg-surface-900">
      {/* -------- Header -------- */}
      <div className="flex items-center justify-between border-b border-surface-800 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-brand-600/20">
            <svg
              className="h-3.5 w-3.5 text-brand-400"
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
          </div>
          <span className="text-sm font-semibold text-surface-100">
            Asistente IA
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-surface-400 hover:bg-surface-800 hover:text-surface-200"
          aria-label="Cerrar asistente"
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* -------- Tabs -------- */}
      <div className="flex border-b border-surface-800">
        <TabButton
          active={tab === 'chat'}
          onClick={() => setTab('chat')}
          icon={
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
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          }
          label="Chat"
        />
        <TabButton
          active={tab === 'imagen'}
          onClick={() => setTab('imagen')}
          icon={
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
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
          label="Imagen"
        />
      </div>

      {/* -------- Body -------- */}
      <div className="min-h-0 flex-1">
        {tab === 'chat' ? (
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1">
              <AIChatPanel
                mensajes={mensajes}
                enviando={enviando}
                onEnviar={(t) => enviarPrompt(t, 'TEXTO')}
                onAplicar={aplicarAcciones}
                onLimpiar={limpiarChat}
                disabled={disabled}
                pendientes={pendientes}
                procesandoPendientes={procesando}
                onProcesarPendientes={() => void procesarPendientes()}
              />
            </div>
            {/* Botón de voz sobre el input (dictado → origen='VOZ') */}
            <div className="flex justify-end border-t border-surface-800 px-3 py-2">
              <AIVoiceButton
                onResultado={(texto) => {
                  void enviarPrompt(texto, 'VOZ');
                }}
                disabled={disabled || enviando}
              />
            </div>
          </div>
        ) : (
          <AIImageUpload diagramaId={diagramaId} disabled={disabled} />
        )}
      </div>
    </aside>
  );
}

// ======================================================================
// Tab button
// ======================================================================
function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
        active
          ? 'border-b-2 border-brand-500 text-brand-300'
          : 'border-b-2 border-transparent text-surface-400 hover:text-surface-200',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  );
}

export default AIPanel;