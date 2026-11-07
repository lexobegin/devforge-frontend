// src/features/diagrama-editor/ai-assistant/useAIPrompt.ts
/**
 * Hook del chat con la IA Agente Dev (prompts de voz/texto) — Ciclo 2.
 *
 * Flujo REAL del backend (ia_router.py — NADA se aplica solo):
 * 1. `iaApi.enviarPrompt` → POST /ia/proyectos/{proyecto_id}/prompt:
 *    persiste el MensajeChat del usuario, consulta al agente (o al chat
 *    general si no trae id_diagrama) y devuelve la RespuestaIA con las
 *    acciones PROPUESTAS, sin tocar el lienzo.
 * 2. El usuario confirma → `aplicarAcciones`:
 *    a. GET /ia/mensajes/{id_mensaje}/acciones → ids de las AccionIA en
 *       estado PROPUESTA (la propuesta del turno no trae id propio: hay
 *       que listarlas para confirmar por id).
 *    b. POST /ia/acciones/confirmar {id_mensaje, acciones_a_aplicar} →
 *       el EJECUTOR del backend (EjecutorAccionesService) valida cada
 *       payload con los esquemas del módulo C y muta los embebidos del
 *       Diagrama: es la ÚNICA puerta por la que una acción de la IA
 *       llega al lienzo. Devuelve cada acción con su estado final
 *       APLICADA/FALLIDA (los fallos van en detalle_resultado).
 *    c. El diagrama cambió EN EL SERVIDOR → se recarga con
 *       cargarDiagrama para reflejar la verdad del backend.
 *
 * ⚠️ El paste de esta tanda aplicaba las acciones LOCALMENTE (CRUD del
 * diagramaStore por REST) y nunca confirmaba al backend: duplicaría los
 * elementos (el ejecutor también los crea) y dejaría las AccionIA
 * eternamente en PROPUESTA. Acá se respeta el contrato Ciclo 2
 * (ConfirmarAccionIARequest exige AL MENOS una acción: si no hay ids
 * pendientes no se llama al confirmar).
 *
 * OFFLINE (objetivo 2 del ajuste, plan F50 ← F23-F26): el envío pasa por
 * `useAIOffline().enviarPrompt` — con conexión hace el POST normal; sin
 * conexión (o con error de red) ENCOLA el prompt en IndexedDB y devuelve
 * null (la burbuja avisa "encolado"). Cuando la cola lo reenvía al
 * reconectar, la respuesta llega por el evento
 * `devforge:ia-respuesta-reenviada` y se agrega al chat como mensaje del
 * asistente, con sus acciones confirmables (mismo flujo).
 */

import { useCallback, useEffect, useState } from 'react';

import { iaApi } from '@/api';
import { useAIOffline } from '@/hooks/useAIOffline';
import { EVENTO_IA_REENVIADA } from '@/offline/iaOfflineQueue';
import { useDiagramaStore, toast } from '@/store';
import type { Id } from '@/types';
import type {
  AccionIAPropuesta,
  OrigenMensaje,
  RespuestaIA,
} from '@/api/iaApi';

// ======================================================================
// Tipos (exportados: AIChatPanel consume este ChatMessage)
// ======================================================================
export interface ChatMessage {
  /** id LOCAL de la burbuja (u-… usuario / a-… asistente / e-… error). */
  id: string;
  role: 'user' | 'assistant';
  texto: string;
  acciones?: AccionIAPropuesta[];
  /** Mensaje ASISTENTE creado en el backend (RespuestaIA.id_mensaje):
   *  es la llave para listar y confirmar las acciones del turno. */
  idMensaje?: Id | null;
  requiereConfirmacion?: boolean;
  aplicada?: boolean;
}

interface UseAIPromptReturn {
  mensajes: ChatMessage[];
  enviando: boolean;
  /** Prompts encolados en IndexedDB sin conexión (badge del chat). */
  pendientes: number;
  /** ¿Hay un reenvío de la cola en curso? */
  procesando: boolean;
  enviarPrompt: (texto: string, origen?: OrigenMensaje) => Promise<void>;
  aplicarAcciones: (mensajeId: string) => Promise<void>;
  /** Fuerza el reenvío de los prompts encolados ("Enviar pendientes"). */
  procesarPendientes: () => Promise<void>;
  limpiarChat: () => void;
}

export function useAIPrompt(
  proyectoId: Id | null,
  diagramaId: Id | null
): UseAIPromptReturn {
  const [mensajes, setMensajes] = useState<ChatMessage[]>([]);
  const [enviando, setEnviando] = useState(false);

  // Cola offline del Agente Dev (F26): online → POST normal; offline →
  // encola en IndexedDB y devuelve null (los toasts los pone el hook).
  const {
    pendientes,
    procesando,
    enviarPrompt: enviarPromptCola,
    procesarAhora,
  } = useAIOffline();

  // ------------------------------------------------------------------
  // Respuestas de prompts reenviados por la cola (al reconectar)
  // ------------------------------------------------------------------
  useEffect(() => {
    const handler = (e: Event) => {
      const { respuesta } = (e as CustomEvent).detail as {
        respuesta?: RespuestaIA;
      };
      if (!respuesta) return;
      setMensajes((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          texto: respuesta.texto_respuesta,
          acciones: respuesta.acciones_propuestas,
          idMensaje: respuesta.id_mensaje,
          requiereConfirmacion: respuesta.requiere_confirmacion,
        },
      ]);
    };
    window.addEventListener(EVENTO_IA_REENVIADA, handler);
    return () => window.removeEventListener(EVENTO_IA_REENVIADA, handler);
  }, []);

  // ------------------------------------------------------------------
  // Enviar prompt (TEXTO tipeado o VOZ ya transcrita)
  // ------------------------------------------------------------------
  const enviarPrompt = useCallback(
    async (texto: string, origen: OrigenMensaje = 'TEXTO') => {
      const t = texto.trim();
      if (!proyectoId || !t) return;

      setMensajes((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: 'user', texto: t },
      ]);
      setEnviando(true);

      try {
        // Con conexión → POST normal; sin conexión (o error de red) →
        // la cola encola el prompt y devuelve null.
        const respuesta = await enviarPromptCola(proyectoId, {
          texto_prompt: t,
          origen,
          id_diagrama: diagramaId ?? null,
        });

        if (!respuesta) {
          // Encolado offline: el asistente contestará al reconectar
          // (la respuesta llega por el evento EVENTO_IA_REENVIADA).
          setMensajes((prev) => [
            ...prev,
            {
              id: `q-${Date.now()}`,
              role: 'assistant',
              texto:
                'Sin conexión: tu prompt quedó encolado y se enviará solo al reconectar.',
            },
          ]);
          return;
        }

        setMensajes((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            texto: respuesta.texto_respuesta,
            acciones: respuesta.acciones_propuestas,
            idMensaje: respuesta.id_mensaje,
            requiereConfirmacion: respuesta.requiere_confirmacion,
          },
        ]);

        // Si la respuesta no propone acciones, no hay nada que confirmar
        if (respuesta.acciones_propuestas.length === 0) {
          toast.info('La IA no propuso acciones concretas');
        }
      } catch (err) {
        // Los errores de negocio/validación SÍ propagan desde la cola.
        toast.error(
          err instanceof Error ? err.message : 'Error al contactar la IA'
        );
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
    [proyectoId, diagramaId, enviarPromptCola]
  );

  // ------------------------------------------------------------------
  // Confirmar las acciones del turno (el ejecutor del backend aplica)
  // ------------------------------------------------------------------
  const aplicarAcciones = useCallback(
    async (mensajeId: string) => {
      const mensaje = mensajes.find((m) => m.id === mensajeId);
      if (!mensaje || mensaje.aplicada) return;

      if (!diagramaId) {
        toast.error('Las acciones del agente requieren un diagrama abierto');
        return;
      }
      if (!mensaje.idMensaje) {
        toast.error(
          'Ese turno no tiene acciones confirmables en el backend'
        );
        return;
      }

      try {
        // (a) Ids de las AccionIA en PROPUESTA del turno.
        const acciones = await iaApi.listarAccionesDeMensaje(
          mensaje.idMensaje
        );
        const ids = acciones
          .filter((a) => a.estado === 'PROPUESTA')
          .map((a) => a.id);

        if (ids.length === 0) {
          setMensajes((prev) =>
            prev.map((m) =>
              m.id === mensajeId ? { ...m, aplicada: true } : m
            )
          );
          toast.info('Ese turno ya no tiene acciones pendientes');
          return;
        }

        // (b) Confirmar por ids → el ejecutor valida y muta el Diagrama.
        const resultados = await iaApi.confirmarAcciones(
          mensaje.idMensaje,
          ids
        );
        const aplicadas = resultados.filter(
          (r) => r.estado === 'APLICADA'
        ).length;
        const fallidas = resultados.filter(
          (r) => r.estado === 'FALLIDA'
        ).length;
        for (const r of resultados) {
          if (r.estado === 'FALLIDA' && r.detalle_resultado) {
            console.warn(`[IA] Acción ${r.id} fallida: ${r.detalle_resultado}`);
          }
        }

        setMensajes((prev) =>
          prev.map((m) => (m.id === mensajeId ? { ...m, aplicada: true } : m))
        );

        if (fallidas === 0) {
          toast.success(
            `${aplicadas} acción${aplicadas !== 1 ? 'es' : ''} aplicada${
              aplicadas !== 1 ? 's' : ''
            } al diagrama`
          );
        } else if (aplicadas > 0) {
          toast.warning(
            `${aplicadas} aplicada(s), ${fallidas} fallida(s) — revisá el detalle en consola`
          );
        } else {
          toast.error('Ninguna acción pudo aplicarse (payload inválido)');
        }

        // (c) El lienzo cambió en el SERVIDOR: recargar la verdad.
        await useDiagramaStore.getState().cargarDiagrama(diagramaId);
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : 'No se pudieron aplicar las acciones'
        );
      }
    },
    [mensajes, diagramaId]
  );

  // ------------------------------------------------------------------
  // Limpiar chat
  // ------------------------------------------------------------------
  const limpiarChat = useCallback(() => setMensajes([]), []);

  // Reenvío manual de la cola (los toasts de resumen los pone el hook;
  // las respuestas entran al chat por el evento de reenvío).
  const procesarPendientes = useCallback(async () => {
    await procesarAhora();
  }, [procesarAhora]);

  return {
    mensajes,
    enviando,
    pendientes,
    procesando,
    enviarPrompt,
    aplicarAcciones,
    procesarPendientes,
    limpiarChat,
  };
}

export default useAIPrompt;