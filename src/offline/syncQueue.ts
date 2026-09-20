// src/offline/syncQueue.ts
/**
 * Cola de sincronización offline.
 *
 * Cada cambio hecho mientras el usuario está offline (o que falla por
 * red) se apila aquí. El `syncManager` la procesa cuando el navegador
 * recupera conexión.
 *
 * La cola mantiene el orden FIFO para que las dependencias se apliquen
 * correctamente (ej. crear clase → agregar atributo → crear relación).
 */

import {
  db,
  generarIdTemporalLocal,
  type ItemColaSync,
  type TipoOperacionSync,
} from './indexedDbClient';

export const syncQueue = {
  /**
   * Encola un cambio para sincronizar más tarde.
   * Devuelve el id temporal local generado.
   */
  async encolar(
    idDiagrama: number,
    tipoOperacion: TipoOperacionSync,
    payload: Record<string, unknown>
  ): Promise<string> {
    const idTemporalLocal = generarIdTemporalLocal();
    const item: ItemColaSync = {
      id_temporal_local: idTemporalLocal,
      id_diagrama: idDiagrama,
      tipo_operacion: tipoOperacion,
      payload,
      timestamp_local: Date.now(),
      estado: 'PENDIENTE',
      intentos: 0,
    };
    await db.colaSync.add(item);
    return idTemporalLocal;
  },

  /** Lista los pendientes de un diagrama, en orden de llegada. */
  async pendientes(idDiagrama: number): Promise<ItemColaSync[]> {
    const items = await db.colaSync
      .where('id_diagrama')
      .equals(idDiagrama)
      .toArray();
    return items
      .filter((i) => i.estado === 'PENDIENTE' || i.estado === 'FALLIDO')
      .sort((a, b) => a.timestamp_local - b.timestamp_local);
  },

  /** Cuenta cuántos items pendientes hay en total. */
  async contarPendientes(): Promise<number> {
    const todos = await db.colaSync.toArray();
    return todos.filter((i) => i.estado === 'PENDIENTE' || i.estado === 'FALLIDO')
      .length;
  },

  /** Cuenta cuántos items pendientes hay para un diagrama. */
  async contarPendientesPorDiagrama(idDiagrama: number): Promise<number> {
    const items = await this.pendientes(idDiagrama);
    return items.length;
  },

  /** Marca un item como ENVIADO (se sincronizó correctamente). */
  async marcarEnviado(localId: number): Promise<void> {
    await db.colaSync.update(localId, { estado: 'ENVIADO' });
  },

  /** Marca un item con conflicto para revisión del PROPIETARIO. */
  async marcarConflicto(localId: number, motivo: string): Promise<void> {
    await db.colaSync.update(localId, {
      estado: 'CONFLICTO',
      ultimo_error: motivo,
    });
  },

  /** Marca un item como fallido (para reintentar). */
  async marcarFallido(localId: number, error: string): Promise<void> {
    const item = await db.colaSync.get(localId);
    if (!item) return;
    await db.colaSync.update(localId, {
      estado: 'FALLIDO',
      intentos: (item.intentos ?? 0) + 1,
      ultimo_error: error,
    });
  },

  /** Elimina los items ya enviados (housekeeping). */
  async limpiarEnviados(): Promise<number> {
    const enviados = await db.colaSync
      .where('estado')
      .equals('ENVIADO')
      .toArray();
    const ids = enviados
      .map((i) => i.localId)
      .filter((id): id is number => id !== undefined);
    if (ids.length === 0) return 0;
    await db.colaSync.bulkDelete(ids);
    return ids.length;
  },

  /** Elimina todos los items de un diagrama (por ejemplo al descartar). */
  async limpiarDiagrama(idDiagrama: number): Promise<void> {
    await db.colaSync.where('id_diagrama').equals(idDiagrama).delete();
  },

  /** Lista los items que quedaron en conflicto (para el panel del propietario). */
  async conflictos(idDiagrama: number): Promise<ItemColaSync[]> {
    const items = await db.colaSync
      .where('id_diagrama')
      .equals(idDiagrama)
      .toArray();
    return items.filter((i) => i.estado === 'CONFLICTO');
  },
};