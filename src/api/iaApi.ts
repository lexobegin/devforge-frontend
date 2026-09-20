// src/api/iaApi.ts
/**
 * Endpoints del módulo de IA (prompts de voz/texto).
 * Corresponde a `app/api/v1/ia_router.py` del backend.
 *
 * La IA de visión (imagen/boceto) va en `aiVisionApi.ts`.
 */

import { http } from './httpClient';
import type { ISODateString, Id } from '@/types';

// ======================================================================
// Tipos locales
// ======================================================================
export type CanalIA = 'VOZ' | 'TEXTO';

export interface PromptIARequest {
  texto_prompt: string;
  canal?: CanalIA;
  id_diagrama?: Id | null;
  contexto?: Record<string, unknown> | null;
}

export interface AccionIAPropuesta {
  tipo: string;
  payload: Record<string, unknown>;
  descripcion?: string | null;
}

export interface RespuestaIA {
  texto_respuesta: string;
  acciones_propuestas: AccionIAPropuesta[];
  requiere_confirmacion: boolean;
}

export interface ConfirmarAccionIARequest {
  id_interaccion: Id;
  acciones_a_aplicar: number[];
}

export interface InteraccionIA {
  id: Id;
  id_proyecto: Id;
  id_diagrama: Id | null;
  id_usuario: Id;
  canal: CanalIA;
  texto_prompt: string;
  respuesta_ia: Record<string, unknown> | null;
  accion_aplicada: boolean;
  created_at: ISODateString;
}

// ======================================================================
// API
// ======================================================================
export const iaApi = {
  /**
   * Envía un prompt de voz/texto a la IA (modo online).
   * El cliente decide después si aplica las acciones propuestas.
   */
  enviarPrompt(
    proyectoId: number,
    payload: PromptIARequest
  ): Promise<RespuestaIA> {
    return http.post<RespuestaIA>(`/ia/proyectos/${proyectoId}/prompt`, payload);
  },

  /** Confirma las acciones propuestas por la IA. */
  confirmarAcciones(
    interaccionId: number,
    accionesAplicar: number[] = []
  ): Promise<InteraccionIA> {
    const body: ConfirmarAccionIARequest = {
      id_interaccion: interaccionId,
      acciones_a_aplicar: accionesAplicar,
    };
    return http.post<InteraccionIA>(
      `/ia/interacciones/${interaccionId}/confirmar`,
      body
    );
  },

  obtenerInteraccion(interaccionId: number): Promise<InteraccionIA> {
    return http.get<InteraccionIA>(`/ia/interacciones/${interaccionId}`);
  },

  listarPorProyecto(
    proyectoId: number,
    params: { skip?: number; limit?: number } = {}
  ): Promise<InteraccionIA[]> {
    return http.get<InteraccionIA[]>(
      `/ia/proyectos/${proyectoId}/interacciones`,
      { params }
    );
  },

  listarPorDiagrama(
    diagramaId: number,
    params: { skip?: number; limit?: number } = {}
  ): Promise<InteraccionIA[]> {
    return http.get<InteraccionIA[]>(
      `/ia/diagramas/${diagramaId}/interacciones`,
      { params }
    );
  },
};