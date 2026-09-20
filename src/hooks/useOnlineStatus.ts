// src/hooks/useOnlineStatus.ts
/**
 * Hook que expone el estado online/offline del navegador y la cantidad
 * de cambios pendientes de sincronizar.
 *
 * Reacciona al evento `online`/`offline` del navegador y al contador de
 * la cola de sincronización.
 */

import { useEffect, useState } from 'react';

import { syncQueue } from '@/offline/syncQueue';

interface UseOnlineStatusReturn {
  online: boolean;
  pendientes: number;
  /** Fuerza una verificación del contador de pendientes. */
  refrescarPendientes: () => Promise<void>;
}

export function useOnlineStatus(): UseOnlineStatusReturn {
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendientes, setPendientes] = useState<number>(0);

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
  // Contador de pendientes (refresco periódico)
  // ------------------------------------------------------------------
  const refrescarPendientes = async () => {
    try {
      const n = await syncQueue.contarPendientes();
      setPendientes(n);
    } catch {
      // Ignorar errores de IndexedDB
    }
  };

  useEffect(() => {
    void refrescarPendientes();

    // Polling cada 5 segundos para mantener el badge actualizado
    const interval = window.setInterval(() => {
      void refrescarPendientes();
    }, 5000);

    return () => window.clearInterval(interval);
  }, []);

  return { online, pendientes, refrescarPendientes };
}

export default useOnlineStatus;