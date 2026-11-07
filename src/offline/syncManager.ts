// src/offline/syncManager.ts
/**
 * Gestor de sincronización.
 *
 * Cuando el navegador recupera conexión:
 * 1. Toma los items PENDIENTES de la cola.
 * 2. Los envía en un batch al backend (`sincronizacionApi.enviarBatch`).
 * 3. Aplica los resultados: marca enviados, conflictos o fallidos.
 *
 * El batch se envía completo. El backend responde con el mapeo
 * id_temporal_local → id_real (o estado CONFLICTO si hubo colisión).
 *
 * Este módulo puede invocarse:
 * - Automáticamente al detectar `online` (listener de más abajo, y
 *   también vía `useOnlineStatus`).
 * - Manualmente desde la UI (botón "Sincronizar ahora" — Toaster F28).
 * - Periódicamente en segundo plano (opcional).
 */

import { sincronizacionApi, type BatchSincronizacionRequest } from '@/api';
import type { Id } from '@/types/common';
import { getDispositivoId } from './indexedDbClient';
import { syncQueue } from './syncQueue';

// ======================================================================
// Estado interno
// ======================================================================
let sincronizando = false;

// ======================================================================
// API
// ======================================================================
export interface ResumenSync {
  total: number;
  sincronizados: number;
  conflictos: number;
}

export const syncManager = {
  /** ¿Hay una sincronización en curso? */
  estaSincronizando(): boolean {
    return sincronizando;
  },

  /**
   * Sincroniza los cambios pendientes de un diagrama.
   * Devuelve el resumen de la sincronización.
   */
  async sincronizarDiagrama(diagramaId: Id): Promise<ResumenSync> {
    if (sincronizando) {
      return { total: 0, sincronizados: 0, conflictos: 0 };
    }

    const pendientes = await syncQueue.pendientes(diagramaId);
    if (pendientes.length === 0) {
      return { total: 0, sincronizados: 0, conflictos: 0 };
    }

    sincronizando = true;
    try {
      const batch: BatchSincronizacionRequest = {
        id_dispositivo: getDispositivoId(),
        id_diagrama: diagramaId,
        cambios: pendientes.map((p) => ({
          id_temporal_local: p.id_temporal_local,
          tipo_operacion: p.tipo_operacion,
          payload: p.payload,
          timestamp_local: new Date(p.timestamp_local).toISOString(),
        })),
      };

      const respuesta = await sincronizacionApi.enviarBatch(batch);

      // Procesar resultados (mapa id_temporal_local → resultado)
      const porIdTemporal = new Map<string, (typeof respuesta.resultados)[number]>(
        respuesta.resultados.map((r) => [r.id_temporal_local, r])
      );

      let sincronizados = 0;
      let conflictos = 0;

      for (const item of pendientes) {
        if (item.localId === undefined) continue;
        const res = porIdTemporal.get(item.id_temporal_local);
        if (!res) {
          await syncQueue.marcarFallido(item.localId, 'Sin respuesta del backend');
          continue;
        }
        if (res.estado === 'SINCRONIZADO') {
          await syncQueue.marcarEnviado(item.localId);
          sincronizados++;
        } else if (res.estado === 'CONFLICTO') {
          await syncQueue.marcarConflicto(
            item.localId,
            res.motivo_conflicto ?? 'Conflicto detectado'
          );
          conflictos++;
        } else {
          await syncQueue.marcarFallido(item.localId, 'Estado desconocido');
        }
      }

      return {
        total: pendientes.length,
        sincronizados,
        conflictos,
      };
    } catch (err) {
      // Si falla la red, marcar los items como FALLIDO para reintentar luego
      for (const item of pendientes) {
        if (item.localId === undefined) continue;
        await syncQueue.marcarFallido(
          item.localId,
          err instanceof Error ? err.message : 'Error de red'
        );
      }
      throw err;
    } finally {
      sincronizando = false;
    }
  },

  /**
   * Sincroniza todos los diagramas que tengan pendientes.
   * Útil al recuperar conexión: no sabemos qué diagrama está abierto.
   */
  async sincronizarTodo(): Promise<ResumenSync> {
    const todos = await syncQueue.contarPendientes();
    if (todos === 0) return { total: 0, sincronizados: 0, conflictos: 0 };

    // Recolectar los diagrama_id únicos con pendientes.
    // `pendientes(idDiagrama)` requiere un id; para "todos" iteramos la
    // base directamente:
    const { db } = await import('./indexedDbClient');
    const todosLosItems = await db.colaSync.toArray();
    const diagramasUnicos = new Set(
      todosLosItems
        .filter((i) => i.estado === 'PENDIENTE' || i.estado === 'FALLIDO')
        .map((i) => i.id_diagrama)
    );

    let total = 0;
    let sincronizados = 0;
    let conflictos = 0;

    for (const diagramaId of diagramasUnicos) {
      try {
        const res = await this.sincronizarDiagrama(diagramaId);
        total += res.total;
        sincronizados += res.sincronizados;
        conflictos += res.conflictos;
      } catch {
        // Ignorar; se reintentará después
      }
    }

    // Housekeeping: limpiar los ya enviados
    await syncQueue.limpiarEnviados();

    return { total, sincronizados, conflictos };
  },
};

// ======================================================================
// Auto-sincronización al recuperar conexión
// ======================================================================
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    // Pequeño delay para evitar disparar antes de que la red esté estable
    setTimeout(() => {
      void syncManager.sincronizarTodo();
    }, 1500);
  });
}