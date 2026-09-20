// src/features/diagrama-editor/ai-assistant/useAIPrompt.ts
/**
 * Hook para interactuar con la IA (prompts de voz/texto).
 *
 * Flujo:
 * 1. Envía el prompt al backend (`iaApi.enviarPrompt`).
 * 2. Recibe la respuesta con las acciones propuestas (aún NO aplicadas).
 * 3. El usuario confirma → se aplican localmente al store + se marca la
 *    interacción como aplicada en el backend.
 */

import { useCallback, useState } from 'react';

import { iaApi } from '@/api';
import { useDiagramaStore, toast } from '@/store';
import type {
  AccionIAPropuesta,
  CanalIA,
  RespuestaIA,
} from '@/api/iaApi';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  texto: string;
  acciones?: AccionIAPropuesta[];
  interaccionId?: number;
  aplicada?: boolean;
}

interface UseAIPromptReturn {
  mensajes: ChatMessage[];
  enviando: boolean;
  enviarPrompt: (texto: string, canal?: CanalIA) => Promise<void>;
  aplicarAcciones: (mensajeId: string) => Promise<void>;
  limpiarChat: () => void;
}

export function useAIPrompt(
  proyectoId: number | null,
  diagramaId: number | null
): UseAIPromptReturn {
  const [mensajes, setMensajes] = useState<ChatMessage[]>([]);
  const [enviando, setEnviando] = useState(false);

  // Aplicadores locales (desde el store del diagrama)
  const crearClase = useDiagramaStore((s) => s.crearClase);
  const agregarAtributo = useDiagramaStore((s) => s.agregarAtributo);
  const clases = useDiagramaStore((s) => s.clases);

  // ------------------------------------------------------------------
  // Enviar prompt
  // ------------------------------------------------------------------
  const enviarPrompt = useCallback(
    async (texto: string, canal: CanalIA = 'TEXTO') => {
      if (!proyectoId || !texto.trim()) return;

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        texto: texto.trim(),
      };
      setMensajes((prev) => [...prev, userMsg]);
      setEnviando(true);

      try {
        const respuesta: RespuestaIA = await iaApi.enviarPrompt(proyectoId, {
          texto_prompt: texto.trim(),
          canal,
          id_diagrama: diagramaId,
        });

        const assistantMsg: ChatMessage = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          texto: respuesta.texto_respuesta,
          acciones: respuesta.acciones_propuestas,
        };
        setMensajes((prev) => [...prev, assistantMsg]);

        // Si la respuesta no propone acciones, no hay nada que confirmar
        if (respuesta.acciones_propuestas.length === 0) {
          toast.info('La IA no propuso acciones concretas');
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Error al contactar la IA'
        );
        // Mensaje de error del asistente
        setMensajes((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: 'assistant',
            texto: 'No pude procesar tu solicitud. Intentá de nuevo.',
          },
        ]);
      } finally {
        setEnviando(false);
      }
    },
    [proyectoId, diagramaId]
  );

  // ------------------------------------------------------------------
  // Aplicar acciones al diagrama local
  // ------------------------------------------------------------------
  const aplicarAcciones = useCallback(
    async (mensajeId: string) => {
      const mensaje = mensajes.find((m) => m.id === mensajeId);
      if (!mensaje || !mensaje.acciones || mensaje.aplicada) return;

      let aplicadas = 0;
      for (const accion of mensaje.acciones) {
        try {
          await aplicarAccionLocal(accion, {
            crearClase,
            agregarAtributo,
            clases,
          });
          aplicadas++;
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : 'No se pudo aplicar una acción'
          );
        }
      }

      if (aplicadas > 0) {
        setMensajes((prev) =>
          prev.map((m) =>
            m.id === mensajeId ? { ...m, aplicada: true } : m
          )
        );
        toast.success(
          `${aplicadas} acción${aplicadas > 1 ? 'es' : ''} aplicada${
            aplicadas > 1 ? 's' : ''
          }`
        );
      }
    },
    [mensajes, crearClase, agregarAtributo, clases]
  );

  // ------------------------------------------------------------------
  // Limpiar chat
  // ------------------------------------------------------------------
  const limpiarChat = useCallback(() => setMensajes([]), []);

  return {
    mensajes,
    enviando,
    enviarPrompt,
    aplicarAcciones,
    limpiarChat,
  };
}

// ======================================================================
// Aplicación local de una acción propuesta
// ======================================================================
interface AplicadoresLocales {
  crearClase: (payload: {
    nombre: string;
    pos_x?: number;
    pos_y?: number;
  }) => Promise<{ id: number }>;
  agregarAtributo: (
    claseId: number,
    payload: { nombre: string; tipo_dato: string }
  ) => Promise<unknown>;
  clases: Array<{ id: number; nombre: string }>;
}

async function aplicarAccionLocal(
  accion: AccionIAPropuesta,
  ap: AplicadoresLocales
): Promise<void> {
  const tipo = accion.tipo.toUpperCase();
  const payload = accion.payload ?? {};

  // --- CREAR_CLASE ---
  if (tipo === 'CREAR_CLASE') {
    const nombre = String(payload.nombre ?? '').trim();
    if (!nombre) throw new Error('Acción sin nombre de clase');
    // Posición aleatoria razonable
    await ap.crearClase({
      nombre,
      pos_x: 200 + Math.random() * 300,
      pos_y: 150 + Math.random() * 200,
    });
    return;
  }

  // --- AGREGAR_ATRIBUTO ---
  if (tipo === 'AGREGAR_ATRIBUTO') {
    const claseNombre = String(payload.clase ?? '').trim();
    const atributoNombre = String(payload.atributo ?? '').trim();
    const tipoDato = String(payload.tipo_dato ?? 'String');
    if (!claseNombre || !atributoNombre) {
      throw new Error('Faltan datos para agregar el atributo');
    }
    const clase = ap.clases.find(
      (c) => c.nombre.toLowerCase() === claseNombre.toLowerCase()
    );
    if (!clase) {
      throw new Error(`No se encontró la clase "${claseNombre}"`);
    }
    await ap.agregarAtributo(clase.id, {
      nombre: atributoNombre,
      tipo_dato: tipoDato,
    });
    return;
  }

  // Tipos no soportados localmente todavía
  throw new Error(`Tipo de acción no soportado: ${accion.tipo}`);
}