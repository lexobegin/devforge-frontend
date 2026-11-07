// src/hooks/useAIOffline.ts
/**
 * Hook del Agente Dev offline (F26 — objetivo 2 del ajuste).
 *
 * Envuelve a `iaApi.enviarPrompt` con la cola offline:
 * - CON conexión: envía el prompt normal y devuelve la RespuestaIA.
 * - SIN conexión (o con error de red): encola el prompt en IndexedDB
 *   (offline/iaOfflineQueue.ts), avisa con un toast y devuelve null —
 *   el panel del chat muestra el mensaje como "encolado".
 * - AL RECUPERAR conexión: reenvía automáticamente los prompts
 *   pendientes (mismo delay de estabilización que syncManager: 1.5 s)
 *   y resume el resultado con toasts.
 *
 * La respuesta de cada prompt reenviado llega al panel del chat por el
 * evento `devforge:ia-respuesta-reenviada` (el hook expone
 * `reenviadas` como contador y el evento trae el detail completo).
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ApiError,
  iaApi,
  type PromptIARequest,
  type RespuestaIA,
} from '@/api';
import {
  iaOfflineQueue,
  EVENTO_IA_REENVIADA,
  type ResumenReenvioIA,
} from '@/offline/iaOfflineQueue';
import type { Id } from '@/types/common';
import { toast } from '@/store';

interface UseAIOfflineReturn {
  /** Estado online/offline del navegador. */
  online: boolean;
  /** Prompts encolados pendientes de enviar (badge del chat). */
  pendientes: number;
  /** ¿Hay un reenvío en curso? */
  procesando: boolean;
  /** Respuestas que llegaron por reenvío de la cola (para el chat). */
  reenviadas: number;
  /** Encola un prompt manualmente (sin intentar enviar). */
  encolarPrompt: (idProyecto: Id, request: PromptIARequest) => Promise<number>;
  /**
   * Envía el prompt si hay conexión; si no (o si falla la red), lo
   * encola y devuelve null. Los errores de validación/negocio SÍ se
   * propagan (no son de conexión).
   */
  enviarPrompt: (
    idProyecto: Id,
    request: PromptIARequest
  ) => Promise<RespuestaIA | null>;
  /** Fuerza el reenvío de los pendientes ("Enviar pendientes"). */
  procesarAhora: () => Promise<ResumenReenvioIA>;
}

export function useAIOffline(): UseAIOfflineReturn {
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendientes, setPendientes] = useState<number>(0);
  const [procesando, setProcesando] = useState<boolean>(false);
  const [reenviadas, setReenviadas] = useState<number>(0);

  const procesandoRef = useRef(false);

  // ------------------------------------------------------------------
  // Eventos online/offline
  // ------------------------------------------------------------------
  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // ------------------------------------------------------------------
  // Contador reactivo (suscripción a la cola + carga inicial)
  // ------------------------------------------------------------------
  useEffect(() => {
    const actualizar = () => {
      iaOfflineQueue
        .contarPendientes()
        .then(setPendientes)
        .catch(() => {
          // Ignorar errores de IndexedDB (modo privado, cuota, etc.)
        });
    };
    actualizar();
    return iaOfflineQueue.suscribirse(actualizar);
  }, []);

  // ------------------------------------------------------------------
  // Contador de respuestas reenviadas (el panel del chat escucha el
  // evento para pintar la respuesta completa)
  // ------------------------------------------------------------------
  useEffect(() => {
    const onReenviada = () => setReenviadas((n) => n + 1);
    window.addEventListener(EVENTO_IA_REENVIADA, onReenviada);
    return () => window.removeEventListener(EVENTO_IA_REENVIADA, onReenviada);
  }, []);

  // ------------------------------------------------------------------
  // Reenvío (auto al reconectar o manual)
  // ------------------------------------------------------------------
  const procesarAhora = useCallback(async (): Promise<ResumenReenvioIA> => {
    if (procesandoRef.current) {
      return { total: 0, enviados: 0, fallidos: 0 };
    }
    procesandoRef.current = true;
    setProcesando(true);
    try {
      const resumen = await iaOfflineQueue.procesarPendientes();
      if (resumen.enviados > 0) {
        toast.success(
          `Agente Dev: ${resumen.enviados} prompt(s) encolado(s) enviado(s).`
        );
      }
      if (resumen.fallidos > 0) {
        toast.warning(
          `Agente Dev: ${resumen.fallidos} prompt(s) no pudieron enviarse; se reintentarán.`
        );
      }
      return resumen;
    } finally {
      procesandoRef.current = false;
      setProcesando(false);
    }
  }, []);

  // Auto-reenvío al pasar de offline → online (delay de estabilización
  // igual al del syncManager para no disparar antes de que la red esté
  // realmente lista).
  const estabaOffline = useRef(false);
  useEffect(() => {
    if (!online) {
      estabaOffline.current = true;
      return;
    }
    if (!estabaOffline.current) return;
    estabaOffline.current = false;
    const t = window.setTimeout(() => {
      void procesarAhora();
    }, 1500);
    return () => window.clearTimeout(t);
  }, [online, procesarAhora]);

  // ------------------------------------------------------------------
  // API del hook
  // ------------------------------------------------------------------
  const encolarPrompt = useCallback(
    async (idProyecto: Id, request: PromptIARequest): Promise<number> => {
      const localId = await iaOfflineQueue.encolar(idProyecto, request);
      toast.info(
        'Sin conexión: tu prompt quedó encolado y se enviará al reconectar.'
      );
      return localId;
    },
    []
  );

  const enviarPrompt = useCallback(
    async (
      idProyecto: Id,
      request: PromptIARequest
    ): Promise<RespuestaIA | null> => {
      if (!navigator.onLine) {
        await encolarPrompt(idProyecto, request);
        return null;
      }
      try {
        return await iaApi.enviarPrompt(idProyecto, request);
      } catch (err) {
        // Solo los errores de RED se encolan; los 4xx del backend
        // (validación, permisos, etc.) se muestran en el chat.
        if (err instanceof ApiError && err.isNetwork) {
          await encolarPrompt(idProyecto, request);
          return null;
        }
        throw err;
      }
    },
    [encolarPrompt]
  );

  return {
    online,
    pendientes,
    procesando,
    reenviadas,
    encolarPrompt,
    enviarPrompt,
    procesarAhora,
  };
}

export default useAIOffline;