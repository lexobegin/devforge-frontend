// src/features/diagrama-editor/ai-assistant/AIVoiceButton.tsx
/**
 * Botón de entrada por voz.
 *
 * Usa la Web Speech API nativa del navegador (SpeechRecognition).
 * Nota: solo funciona en navegadores basados en Chromium (Chrome, Edge).
 * Firefox y Safari no la soportan plenamente todavía.
 *
 * Cuando el texto se reconoce, se envía al MISMO flujo de IA que el chat
 * (enviarPrompt(texto, 'VOZ') → PromptIARequest.origen='VOZ').
 *
 * Tipos: SpeechRecognition NO está en lib.dom de TypeScript 5.6, y el
 * paste referenciaba el tipo global de la lista de resultados (que en
 * 5.6 tampoco existe) → acá se declaran shapes propios mínimos, sin
 * depender de lib.dom ni de la versión de TypeScript.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { toast } from '@/store';

// ======================================================================
// Tipos mínimos propios (Web Speech API, sin lib.dom)
// ======================================================================
interface AlternativaVoz {
  transcript: string;
}

interface ResultadoVoz {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: AlternativaVoz;
}

interface EventoResultadoVoz extends Event {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    [index: number]: ResultadoVoz;
  };
}

interface EventoErrorVoz extends Event {
  readonly error: string;
  readonly message: string;
}

interface ReconocedorVoz extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: EventoResultadoVoz) => void) | null;
  onerror: ((event: EventoErrorVoz) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type ConstructorReconocedor = new () => ReconocedorVoz;

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
  const recognitionRef = useRef<ReconocedorVoz | null>(null);

  // El callback viaja en un ref: así el reconocedor se crea UNA vez y no
  // en cada render del padre (el paste lo recreaba en cada render porque
  // AIPanel pasa un arrow inline como onResultado).
  const onResultadoRef = useRef(onResultado);
  useEffect(() => {
    onResultadoRef.current = onResultado;
  }, [onResultado]);

  // ------------------------------------------------------------------
  // Detección de soporte + inicialización (una sola vez)
  // ------------------------------------------------------------------
  useEffect(() => {
    const win = window as unknown as {
      SpeechRecognition?: ConstructorReconocedor;
      webkitSpeechRecognition?: ConstructorReconocedor;
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
      const texto = ultimo?.[0]?.transcript.trim();
      if (texto) {
        onResultadoRef.current(texto);
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
  }, []);

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