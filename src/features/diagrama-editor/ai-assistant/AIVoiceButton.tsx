// src/features/diagrama-editor/ai-assistant/AIVoiceButton.tsx
/**
 * Botón de entrada por voz.
 *
 * Usa la Web Speech API nativa del navegador (SpeechRecognition).
 * Nota: solo funciona en navegadores basados en Chromium (Chrome, Edge).
 * Firefox y Safari no la soportan plenamente todavía.
 *
 * Cuando el texto se reconoce, se envía al mismo flujo de IA que el chat.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { toast } from '@/store';

// ======================================================================
// Tipos mínimos para SpeechRecognition (no está en lib.dom por defecto)
// ======================================================================
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

// ======================================================================
// Props
// ======================================================================
interface AIVoiceButtonProps {
  onResultado: (texto: string) => void;
  disabled?: boolean;
}

// ======================================================================
// Componente
// ======================================================================
export function AIVoiceButton({
  onResultado,
  disabled = false,
}: AIVoiceButtonProps) {
  const [escuchando, setEscuchando] = useState(false);
  const [soportado, setSoportado] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // ------------------------------------------------------------------
  // Detección de soporte + inicialización
  // ------------------------------------------------------------------
  useEffect(() => {
    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

    const Ctor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!Ctor) {
      setSoportado(false);
      return;
    }

    const recognition = new Ctor();
    recognition.lang = 'es-BO';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setEscuchando(true);
    recognition.onend = () => setEscuchando(false);
    recognition.onerror = (e) => {
      setEscuchando(false);
      if (e.error === 'not-allowed') {
        toast.error('Permiso de micrófono denegado');
      } else if (e.error === 'no-speech') {
        toast.warning('No se detectó voz');
      } else {
        toast.error(`Error de reconocimiento: ${e.error}`);
      }
    };
    recognition.onresult = (event) => {
      const ultimo = event.results[event.results.length - 1];
      const texto = ultimo[0].transcript.trim();
      if (texto) {
        onResultado(texto);
      }
    };

    recognitionRef.current = recognition;
    return () => {
      try {
        recognition.abort();
      } catch {
        /* noop */
      }
      recognitionRef.current = null;
    };
  }, [onResultado]);

  // ------------------------------------------------------------------
  // Toggle grabación
  // ------------------------------------------------------------------
  const handleClick = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;

    if (escuchando) {
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    } else {
      try {
        rec.start();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'No se pudo iniciar el micrófono'
        );
      }
    }
  }, [escuchando]);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  if (!soportado) {
    return (
      <button
        type="button"
        disabled
        title="Tu navegador no soporta reconocimiento de voz"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-800 text-surface-600 opacity-60"
      >
        <MicIcon />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      title={escuchando ? 'Detener grabación' : 'Dictar por voz'}
      className={[
        'relative flex h-9 w-9 items-center justify-center rounded-full transition-colors',
        escuchando
          ? 'bg-danger text-white'
          : 'bg-surface-800 text-surface-300 hover:bg-surface-700 hover:text-surface-100',
        disabled ? 'cursor-not-allowed opacity-50' : '',
      ].join(' ')}
    >
      <MicIcon />
      {escuchando && (
        <span className="absolute inset-0 animate-ping rounded-full bg-danger/40" />
      )}
    </button>
  );
}

// ======================================================================
// Icono
// ======================================================================
function MicIcon() {
  return (
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
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 15a3 3 0 003-3V5a3 3 0 00-6 0v7a3 3 0 003 3z"
      />
    </svg>
  );
}

export default AIVoiceButton;