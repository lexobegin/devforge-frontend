// src/offline/iaOfflineQueue.ts
/**
 * Cola offline del Agente Dev (módulo G — objetivo 2 del ajuste).
 *
 * El chat del Agente Dev (`iaApi.enviarPrompt`) requiere backend: el
 * prompt produce un MensajeChat, acciones PROPUESTA y respuestas del
 * LLM, y todo eso se persiste del lado del servidor. Si el navegador se
 * queda sin conexión, el prompt NO se pierde: se encola acá (IndexedDB,
 * tabla `colaIA` de la base `devforge_offline`) y se reenvía TAL CUAL al
 * recuperar conexión.
 *
 * Flujo completo:
 *   offline  → iaOfflineQueue.encolar(...)   (el chat muestra "encolado")
 *   online   → iaOfflineQueue.procesarPendientes()
 *              → iaApi.enviarPrompt(id_proyecto, request) por cada ítem
 *              → PENDIENTE/ERROR se reintentan; cada respuesta exitosa
 *                dispara el evento `devforge:ia-respuesta-reenviada`
 *                (detail: { item, respuesta }) para que el panel del
 *                chat (AIChatPanel, F50) agregue la respuesta del asistente.
 *
 * A diferencia de `colaSync` (cambios sobre el diagrama que viajan por
 * el batch FIFO de /sincronizacion/batch), la cola IA reproduce el flujo
 * normal del módulo G: prompt → acciones propuestas → confirmación del
 * usuario. Así las acciones siguen pasando por la validación y el
 * historial del backend aunque el prompt haya nacido offline.
 */

import { iaApi, type PromptIARequest, type RespuestaIA } from '@/api';
import type { Id } from '@/types/common';
import { db, type ItemColaIA } from './indexedDbClient';

// ======================================================================
// Estado interno + reactividad
// ======================================================================
/** Evento que anuncia la respuesta de un prompt reenviado (para F50). */
export const EVENTO_IA_REENVIADA = 'devforge:ia-respuesta-reenviada';

export interface ResumenReenvioIA {
  total: number;
  enviados: number;
  fallidos: number;
}

let procesandoIA = false;

type OyenteColaIA = () => void;
const oyentes = new Set<OyenteColaIA>();

/** Notifica a los suscriptores (el hook useAIOffline refresca el badge). */
function notificar(): void {
  oyentes.forEach((fn) => fn());
}

// ======================================================================
// API
// ======================================================================
export const iaOfflineQueue = {
  /** ¿Hay un reenvío en curso? */
  estaProcesando(): boolean {
    return procesandoIA;
  },

  /**
   * Suscribe un oyente a los cambios de la cola. Devuelve la función de
   * des-suscripción (para el cleanup del useEffect).
   */
  suscribirse(fn: OyenteColaIA): () => void {
    oyentes.add(fn);
    return () => {
      oyentes.delete(fn);
    };
  },

  /**
   * Encola un prompt del Agente Dev para enviarlo cuando haya conexión.
   * Devuelve el localId del ítem encolado.
   */
  async encolar(idProyecto: Id, request: PromptIARequest): Promise<number> {
    const item: ItemColaIA = {
      id_proyecto: idProyecto,
      request,
      estado: 'PENDIENTE',
      intentos: 0,
      creado_en: new Date().toISOString(),
    };
    const localId = await db.colaIA.add(item);
    notificar();
    return localId;
  },

  /** Ítems por enviar (PENDIENTE + ERROR), en orden de llegada (FIFO). */
  async pendientes(): Promise<ItemColaIA[]> {
    const items = await db.colaIA.toArray();
    return items
      .filter((i) => i.estado === 'PENDIENTE' || i.estado === 'ERROR')
      .sort((a, b) => (a.localId ?? 0) - (b.localId ?? 0));
  },

  /** Cuenta cuántos prompts quedan por enviar (badge del chat). */
  async contarPendientes(): Promise<number> {
    return (await this.pendientes()).length;
  },

  async marcarEnviando(localId: number): Promise<void> {
    await db.colaIA.update(localId, { estado: 'ENVIANDO' });
  },

  async marcarEnviado(localId: number): Promise<void> {
    await db.colaIA.update(localId, {
      estado: 'ENVIADO',
      enviado_en: new Date().toISOString(),
    });
  },

  /** Marca un ítem como ERROR (se reintenta en el próximo ciclo). */
  async marcarError(localId: number, error: string): Promise<void> {
    const item = await db.colaIA.get(localId);
    if (!item) return;
    await db.colaIA.update(localId, {
      estado: 'ERROR',
      intentos: (item.intentos ?? 0) + 1,
      ultimo_error: error,
    });
  },

  /** Elimina los prompts ya enviados (housekeeping). */
  async limpiarEnviados(): Promise<number> {
    const enviados = await db.colaIA.where('estado').equals('ENVIADO').toArray();
    const ids = enviados
      .map((i) => i.localId)
      .filter((id): id is number => id !== undefined);
    if (ids.length === 0) return 0;
    await db.colaIA.bulkDelete(ids);
    notificar();
    return ids.length;
  },

  /**
   * Reenvía los prompts encolados (solo con conexión y sin otro envío
   * en curso). Se invoca:
   * - automáticamente al recuperar conexión (useAIOffline),
   * - manualmente desde el panel del chat ("Enviar pendientes").
   */
  async procesarPendientes(): Promise<ResumenReenvioIA> {
    if (procesandoIA) return { total: 0, enviados: 0, fallidos: 0 };
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { total: 0, enviados: 0, fallidos: 0 };
    }

    const items = await this.pendientes();
    if (items.length === 0) return { total: 0, enviados: 0, fallidos: 0 };

    procesandoIA = true;
    notificar();

    let enviados = 0;
    let fallidos = 0;

    try {
      for (const item of items) {
        if (item.localId === undefined) continue;
        try {
          await this.marcarEnviando(item.localId);
          const respuesta: RespuestaIA = await iaApi.enviarPrompt(
            item.id_proyecto,
            item.request
          );
          await this.marcarEnviado(item.localId);
          enviados++;

          // El panel del chat (F50) escucha este evento para agregar la
          // respuesta del asistente al hilo que la originó.
          window.dispatchEvent(
            new CustomEvent(EVENTO_IA_REENVIADA, {
              detail: { item, respuesta },
            })
          );
        } catch (err) {
          await this.marcarError(
            item.localId,
            err instanceof Error ? err.message : 'Error desconocido'
          );
          fallidos++;
        }
      }

      // Housekeeping: los ENVIADO no vuelven a leerse nunca
      await this.limpiarEnviados();

      return { total: items.length, enviados, fallidos };
    } finally {
      procesandoIA = false;
      notificar();
    }
  },
};