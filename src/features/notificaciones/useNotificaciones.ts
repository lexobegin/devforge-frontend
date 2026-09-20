// src/features/notificaciones/useNotificaciones.ts
/**
 * Hook de notificaciones.
 *
 * Mantiene la lista de notificaciones del usuario y el contador de no
 * leídas. Hace polling cada 30s para mantener el badge actualizado, y
 * expone acciones para marcar leídas / limpiar.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { notificacionesApi, type Notificacion } from '@/api';
import { toast } from '@/store';

// ======================================================================
// Intervalos
// ======================================================================
const POLL_INTERVAL_MS = 30_000;

// ======================================================================
// Hook
// ======================================================================
interface UseNotificacionesOptions {
  /** Activa el polling periódico. Por defecto `true`. */
  polling?: boolean;
}

interface UseNotificacionesReturn {
  notificaciones: Notificacion[];
  noLeidas: number;
  isLoading: boolean;
  error: string | null;
  cargar: (soloNoLeidas?: boolean) => Promise<void>;
  marcarLeida: (id: number) => Promise<void>;
  marcarNoLeida: (id: number) => Promise<void>;
  marcarTodasLeidas: () => Promise<void>;
  eliminar: (id: number) => Promise<void>;
  limpiarLeidas: () => Promise<void>;
}

export function useNotificaciones(
  options: UseNotificacionesOptions = {}
): UseNotificacionesReturn {
  const { polling = true } = options;

  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<number | null>(null);

  // ------------------------------------------------------------------
  // Cargar
  // ------------------------------------------------------------------
  const cargar = useCallback(async (soloNoLeidas = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const [items, contador] = await Promise.all([
        notificacionesApi.listar({
          solo_no_leidas: soloNoLeidas,
          limit: 50,
        }),
        notificacionesApi.contador(),
      ]);
      setNotificaciones(items);
      setNoLeidas(contador.total_no_leidas);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudieron cargar'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ------------------------------------------------------------------
  // Polling del contador (solo el badge, más liviano)
  // ------------------------------------------------------------------
  const refrescarContador = useCallback(async () => {
    try {
      const contador = await notificacionesApi.contador();
      setNoLeidas(contador.total_no_leidas);
    } catch {
      // Ignorar
    }
  }, []);

  useEffect(() => {
    void cargar();

    if (polling) {
      pollRef.current = window.setInterval(() => {
        void refrescarContador();
      }, POLL_INTERVAL_MS);
    }

    return () => {
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [cargar, refrescarContador, polling]);

  // ------------------------------------------------------------------
  // Acciones
  // ------------------------------------------------------------------
  const marcarLeida = useCallback(
    async (id: number) => {
      try {
        const actualizada = await notificacionesApi.marcarLeida(id);
        setNotificaciones((prev) =>
          prev.map((n) => (n.id === id ? actualizada : n))
        );
        setNoLeidas((prev) => Math.max(0, prev - 1));
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'No se pudo marcar como leída'
        );
      }
    },
    []
  );

  const marcarNoLeida = useCallback(async (id: number) => {
    try {
      const actualizada = await notificacionesApi.marcarNoLeida(id);
      setNotificaciones((prev) =>
        prev.map((n) => (n.id === id ? actualizada : n))
      );
      setNoLeidas((prev) => prev + 1);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo marcar como no leída'
      );
    }
  }, []);

  const marcarTodasLeidas = useCallback(async () => {
    try {
      await notificacionesApi.marcarLeidas({ todas: true });
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      setNoLeidas(0);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudieron marcar'
      );
    }
  }, []);

  const eliminar = useCallback(
    async (id: number) => {
      try {
        const notif = notificaciones.find((n) => n.id === id);
        await notificacionesApi.eliminar(id);
        setNotificaciones((prev) => prev.filter((n) => n.id !== id));
        if (notif && !notif.leida) {
          setNoLeidas((prev) => Math.max(0, prev - 1));
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'No se pudo eliminar'
        );
      }
    },
    [notificaciones]
  );

  const limpiarLeidas = useCallback(async () => {
    try {
      const { eliminadas } = await notificacionesApi.limpiarLeidas();
      setNotificaciones((prev) => prev.filter((n) => !n.leida));
      if (eliminadas > 0) {
        toast.success(`Se eliminaron ${eliminadas} notificaciones`);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudieron limpiar'
      );
    }
  }, []);

  return {
    notificaciones,
    noLeidas,
    isLoading,
    error,
    cargar,
    marcarLeida,
    marcarNoLeida,
    marcarTodasLeidas,
    eliminar,
    limpiarLeidas,
  };
}

export default useNotificaciones;