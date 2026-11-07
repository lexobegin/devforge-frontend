// src/api/iaApi.ts
/**
 * Endpoints del módulo de IA (Agente Dev: prompts de voz/texto).
 * Corresponde a `app/api/v1/ia_router.py` del backend CICLO 2.
 *
 * ⚠️ REFOUNDACIÓN CICLO 2 (el módulo G se refundó como AGENTE DEV):
 * la "interacción" del Ciclo 1 (`interacciones_ia`) se RETIRÓ y hoy son
 * 3 colecciones: MensajeChat + ContextoIA + AccionIA. Por eso:
 *   - POST /interacciones/{id}/confirmar   → POST /acciones/confirmar
 *     (cada acción es un documento AccionIA y se confirma POR ID, no por
 *     índice de lista como en el Ciclo 1).
 *   - GET  /interacciones/{id}             → GET /mensajes/{id_mensaje}/acciones
 *   - GET  /diagramas/{id}/interacciones   → GET /diagramas/{id}/acciones
 *   - GET  /proyectos/{id}/interacciones   → GET /proyectos/{id}/acciones
 *   - PromptIARequest: `canal` → `origen` (mismo vocabulario TEXTO/VOZ).
 *   - AccionIAPropuesta: `tipo` → `tipo_accion` (mismo vocabulario que
 *     tipo_operacion de la cola offline: 'CREAR_CLASE',
 *     'MODIFICAR_ATRIBUTO', 'ELIMINAR_RELACION', 'GENERAR_CODIGO'…).
 *   - RespuestaIA trae `id_mensaje`: es la llave para confirmar las
 *     acciones del turno (ConfirmarAccionIARequest.id_mensaje).
 *
 * La IA de visión (imagen/boceto) va en `aiVisionApi.ts`.
 *
 * Nota: el backend deriva el proyecto del `id_diagrama` del payload; el
 * {proyecto_id} de la ruta del prompt se conserva por compatibilidad con
 * el Ciclo 1.
 */

import { http } from './httpClient';
import type { ISODateString, Id } from '@/types';

// ======================================================================
// Tipos locales (app/schemas/ia_schema.py)
// ======================================================================

/** Mismo vocabulario que MensajeChat.origen (era CanalIA en el Ciclo 1). */
export type OrigenMensaje = 'TEXTO' | 'VOZ';

/** Ciclo de vida de una AccionIA (era parte de InteraccionIA). */
export type EstadoAccionIA = 'PROPUESTA' | 'APLICADA' | 'RECHAZADA' | 'FALLIDA';

export interface PromptIARequest {
  /** Prompt (1-4000). Si vino por voz, ya llegó la transcripción. */
  texto_prompt: string;
  /** VOZ si el texto viene de faster-whisper; TEXTO si se tipeó. */
  origen?: OrigenMensaje;
  /** Si se especifica, la IA opera sobre ese diagrama (Agente Dev). */
  id_diagrama?: Id | null;
  /** Contexto adicional (selección actual, clases existentes, etc.). */
  contexto?: Record<string, unknown> | null;
}

/** Acción estructurada que la IA propone ejecutar sobre el diagrama. */
export interface AccionIAPropuesta {
  /**
   * Mismo vocabulario que tipo_operacion de la cola offline:
   * 'CREAR_CLASE', 'MODIFICAR_ATRIBUTO', 'ELIMINAR_RELACION', … (máx 50).
   */
  tipo_accion: string;
  /** Validado por el backend con los *Update de diagrama_schema. */
  payload: Record<string, unknown>;
  descripcion?: string | null;
}

/**
 * Respuesta del servicio de IA antes de aplicar cambios al diagrama.
 * `id_mensaje` encadena la conversación y se usa para confirmar.
 */
export interface RespuestaIA {
  /** Mensaje ASISTENTE creado en mensajes_chat (para confirmar luego). */
  id_mensaje: Id | null;
  texto_respuesta: string;
  acciones_propuestas: AccionIAPropuesta[];
  requiere_confirmacion: boolean;
}

/**
 * Confirmación explícita de acciones propuestas por la IA.
 * En el Ciclo 1 se confirmaban por ÍNDICE dentro de la interacción;
 * ahora cada acción es un documento AccionIA y se confirma por id.
 */
export interface ConfirmarAccionIARequest {
  /** Mensaje que originó las propuestas (traza la cadena completa). */
  id_mensaje: Id;
  /** Ids de las AccionIA (estado PROPUESTA) a aplicar. */
  acciones_a_aplicar: Id[];
}

/**
 * Acción persistida con su ciclo de vida (AccionIAResponse).
 * Sustituye a la antigua InteraccionIA del Ciclo 1.
 */
export interface AccionIA {
  id: Id;
  id_usuario: Id;
  id_diagrama: Id | null;
  /** Mensaje del chat que originó la acción; None si el disparo fue
   *  otra vía (boceto, botón de generación…). */
  id_mensaje: Id | null;
  tipo_accion: string;
  payload: Record<string, unknown>;
  estado: EstadoAccionIA;
  /** Fallo del ejecutor (detalle_resultado) cuando estado=FALLIDA. */
  detalle_resultado: string | null;
  created_at: ISODateString;
  aplicada_at: ISODateString | null;
}

// ======================================================================
// API
// ======================================================================
export const iaApi = {
  /**
   * Envía un prompt de voz/texto a la IA (modo online).
   * Si el payload trae id_diagrama deriva al AGENTE DEV; si no, al CHAT
   * GENERAL. Devuelve las ACCIONES PROPUESTAS sin aplicarlas: el cliente
   * las confirma por ids con `confirmarAcciones` antes de que el
   * ejecutor del backend toque el lienzo.
   */
  enviarPrompt(proyectoId: Id, payload: PromptIARequest): Promise<RespuestaIA> {
    return http.post<RespuestaIA>(
      `/ia/proyectos/${proyectoId}/prompt`,
      payload
    );
  },

  /**
   * Confirma las acciones propuestas por el agente (solo el autor del
   * prompt puede confirmar). Devuelve CADA acción con su estado final
   * (APLICADA o FALLIDA; los fallos van en detalle_resultado).
   */
  confirmarAcciones(
    idMensaje: Id,
    accionesAplicar: Id[] = []
  ): Promise<AccionIA[]> {
    const body: ConfirmarAccionIARequest = {
      id_mensaje: idMensaje,
      acciones_a_aplicar: accionesAplicar,
    };
    return http.post<AccionIA[]>('/ia/acciones/confirmar', body);
  },

  /**
   * Acciones propuestas en el turno de un mensaje (cualquiera que sea su
   * estado). Solo el dueño del mensaje puede consultarlo.
   */
  listarAccionesDeMensaje(
    idMensaje: Id,
    params: { skip?: number; limit?: number } = {}
  ): Promise<AccionIA[]> {
    return http.get<AccionIA[]>(
      `/ia/mensajes/${idMensaje}/acciones`,
      { params }
    );
  },

  /** Historial de acciones del agente sobre un diagrama (miembros). */
  listarAccionesDeDiagrama(
    diagramaId: Id,
    params: { skip?: number; limit?: number } = {}
  ): Promise<AccionIA[]> {
    return http.get<AccionIA[]>(
      `/ia/diagramas/${diagramaId}/acciones`,
      { params }
    );
  },

  /**
   * Historial de acciones del agente en todo el proyecto (miembros).
   * El backend resuelve los diagramas del proyecto y consulta con $in.
   */
  listarAccionesDeProyecto(
    proyectoId: Id,
    params: { skip?: number; limit?: number } = {}
  ): Promise<AccionIA[]> {
    return http.get<AccionIA[]>(
      `/ia/proyectos/${proyectoId}/acciones`,
      { params }
    );
  },
};