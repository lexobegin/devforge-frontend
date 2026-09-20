// src/features/diagrama-editor/ai-assistant/AIChatPanel.tsx
/**
 * Panel de chat con la IA (prompts por texto).
 *
 * - Lista de mensajes (usuario + asistente).
 * - Input de texto al pie.
 * - Si el asistente propone acciones, se muestra un botón "Aplicar".
 */

import { FormEvent, useEffect, useRef, useState } from 'react';

import Button from '@/components/Button';
import type { AccionIAPropuesta } from '@/api/iaApi';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  texto: string;
  acciones?: AccionIAPropuesta[];
  aplicada?: boolean;
}

interface AIChatPanelProps {
  mensajes: ChatMessage[];
  enviando: boolean;
  onEnviar: (texto: string) => Promise<void>;
  onAplicar: (mensajeId: string) => Promise<void>;
  onLimpiar: () => void;
  disabled?: boolean;
}

export function AIChatPanel({
  mensajes,
  enviando,
  onEnviar,
  onAplicar,
  onLimpiar,
  disabled = false,
}: AIChatPanelProps) {
  const [texto, setTexto] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final cuando llegan mensajes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensajes.length, enviando]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!texto.trim() || enviando || disabled) return;
    const t = texto.trim();
    setTexto('');
    await onEnviar(t);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header con botón limpiar */}
      {mensajes.length > 0 && (
        <div className="flex items-center justify-end border-b border-surface-800 px-3 py-1.5">
          <button
            type="button"
            onClick={onLimpiar}
            className="text-xs text-surface-500 hover:text-surface-300"
          >
            Limpiar chat
          </button>
        </div>
      )}

      {/* Mensajes */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto p-3"
      >
        {mensajes.length === 0 ? (
          <EmptyChat />
        ) : (
          mensajes.map((m) => (
            <MessageBubble
              key={m.id}
              mensaje={m}
              onAplicar={onAplicar}
              disabled={disabled}
            />
          ))
        )}

        {enviando && (
          <div className="flex items-center gap-2 text-xs text-surface-500">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-surface-600 border-t-brand-500" />
            Pensando…
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-surface-800 p-2"
      >
        <div className="flex items-end gap-2">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSubmit(e as unknown as FormEvent);
              }
            }}
            placeholder="Escribí un prompt… (ej: crea la clase Paciente)"
            rows={2}
            disabled={disabled || enviando}
            className="input-base resize-none text-sm"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={enviando}
            disabled={disabled || !texto.trim()}
            title="Enviar"
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
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </Button>
        </div>
      </form>
    </div>
  );
}

// ======================================================================
// Burbuja de mensaje
// ======================================================================
function MessageBubble({
  mensaje,
  onAplicar,
  disabled,
}: {
  mensaje: ChatMessage;
  onAplicar: (id: string) => Promise<void>;
  disabled: boolean;
}) {
  const esUsuario = mensaje.role === 'user';

  return (
    <div className={`flex ${esUsuario ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'max-w-[85%] rounded-lg px-3 py-2 text-sm',
          esUsuario
            ? 'bg-brand-600 text-white'
            : 'border border-surface-800 bg-surface-900 text-surface-200',
        ].join(' ')}
      >
        <p className="whitespace-pre-wrap break-words">{mensaje.texto}</p>

        {/* Acciones propuestas */}
        {mensaje.acciones && mensaje.acciones.length > 0 && (
          <div className="mt-2 space-y-1.5 border-t border-surface-700/50 pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">
              Acciones propuestas ({mensaje.acciones.length})
            </p>
            <ul className="space-y-1">
              {mensaje.acciones.map((a, i) => (
                <li key={i} className="text-xs text-surface-300">
                  • {a.descripcion ?? a.tipo}
                </li>
              ))}
            </ul>

            {!mensaje.aplicada ? (
              <Button
                size="sm"
                variant="primary"
                className="mt-1 w-full"
                onClick={() => void onAplicar(mensaje.id)}
                disabled={disabled}
              >
                Aplicar al diagrama
              </Button>
            ) : (
              <p className="text-[10px] font-medium text-success">
                ✓ Aplicado
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ======================================================================
// Empty state
// ======================================================================
function EmptyChat() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600/20">
        <svg
          className="h-5 w-5 text-brand-400"
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
      <p className="text-sm font-medium text-surface-200">
        Asistente de IA
      </p>
      <p className="max-w-[220px] text-xs text-surface-500">
        Pedile a la IA que cree clases, agregue atributos o modifique el
        diagrama en lenguaje natural.
      </p>
    </div>
  );
}

export default AIChatPanel;