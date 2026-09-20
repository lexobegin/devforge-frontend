// src/offline/indexedDbClient.ts
/**
 * Cliente IndexedDB basado en Dexie.
 *
 * Define las tablas locales que espejan (parcialmente) el modelo del
 * backend. Se guarda lo mínimo necesario para que el editor funcione
 * offline:
 *
 * - diagramas:      metadata del diagrama
 * - clases:         clases UML (con atributos/operaciones embebidos como
 *                   JSON, ya que el editor no los separa en queries)
 * - relaciones:     relaciones UML
 * - colaSync:       cambios pendientes de enviar al backend
 *
 * Todo se indexa por id (el id real del backend) y por diagrama_id
 * (para queries locales por diagrama).
 */

import Dexie, { type Table } from 'dexie';

import type { ClaseUML, RelacionUML } from '@/types';

// ======================================================================
// Tipos de las tablas locales
// ======================================================================
export interface DiagramaLocal {
  id: number;
  id_proyecto: number;
  nombre: string;
  version_uml: string;
  numero_version: number;
  id_creador: number;
  created_at: string;
  updated_at: string;
  /** Timestamp de última actualización local (ms epoch). */
  local_updated_at: number;
}

export interface ClaseLocal {
  id: number;
  id_diagrama: number;
  /** Snapshot completo de la clase (atributos y operaciones incluidos). */
  data: ClaseUML;
  /** Timestamp de última actualización local. */
  local_updated_at: number;
}

export interface RelacionLocal {
  id: number;
  id_diagrama: number;
  data: RelacionUML;
  local_updated_at: number;
}

export type TipoOperacionSync =
  | 'CREAR_CLASE'
  | 'MODIFICAR_CLASE'
  | 'ELIMINAR_CLASE'
  | 'AGREGAR_ATRIBUTO'
  | 'MODIFICAR_ATRIBUTO'
  | 'ELIMINAR_ATRIBUTO'
  | 'AGREGAR_OPERACION'
  | 'MODIFICAR_OPERACION'
  | 'ELIMINAR_OPERACION'
  | 'CREAR_RELACION'
  | 'MODIFICAR_RELACION'
  | 'ELIMINAR_RELACION';

export interface ItemColaSync {
  /** Id autogenerado por Dexie (++id). */
  localId?: number;
  /** Id temporal local (string único por operación). */
  id_temporal_local: string;
  id_diagrama: number;
  tipo_operacion: TipoOperacionSync;
  payload: Record<string, unknown>;
  /** Timestamp local en ms (para resolución "último en escribir gana"). */
  timestamp_local: number;
  /** Estado del item en la cola. */
  estado: 'PENDIENTE' | 'ENVIADO' | 'CONFLICTO' | 'FALLIDO';
  /** Cuántas veces se intentó enviar. */
  intentos: number;
  /** Último error registrado (si falló). */
  ultimo_error?: string;
}

// ======================================================================
// Base de datos
// ======================================================================
class DevForgeDB extends Dexie {
  diagramas!: Table<DiagramaLocal, number>;
  clases!: Table<ClaseLocal, number>;
  relaciones!: Table<RelacionLocal, number>;
  colaSync!: Table<ItemColaSync, number>;

  constructor() {
    super('devforge_offline');

    // Versión 1 del esquema
    this.version(1).stores({
      diagramas: 'id, id_proyecto',
      clases: 'id, id_diagrama',
      relaciones: 'id, id_diagrama',
      colaSync: '++localId, id_diagrama, estado, timestamp_local',
    });
  }
}

export const db = new DevForgeDB();

// ======================================================================
// Helpers
// ======================================================================
/** Identificador único por operación offline. */
export function generarIdTemporalLocal(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${Date.now()}-${rand}`;
}

/** Identificador de dispositivo/navegador persistente. */
const DISPOSITIVO_KEY = 'devforge_dispositivo_id';

export function getDispositivoId(): string {
  let id = localStorage.getItem(DISPOSITIVO_KEY);
  if (!id) {
    id = `web-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    localStorage.setItem(DISPOSITIVO_KEY, id);
  }
  return id;
}

/** Limpia toda la base local (útil al hacer logout o cambio de usuario). */
export async function limpiarBaseLocal(): Promise<void> {
  await db.transaction(
    'rw',
    db.diagramas,
    db.clases,
    db.relaciones,
    db.colaSync,
    async () => {
      await db.diagramas.clear();
      await db.clases.clear();
      await db.relaciones.clear();
      await db.colaSync.clear();
    }
  );
}