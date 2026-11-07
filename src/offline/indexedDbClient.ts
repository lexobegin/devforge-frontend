// src/offline/indexedDbClient.ts
/**
 * Cliente IndexedDB basado en Dexie.
 *
 * Define las tablas locales que espejan (parcialmente) el modelo del
 * backend. Se guarda lo mínimo necesario para que el editor funcione
 * offline:
 *
 * - diagramas:      metadata del diagrama
 * - clases:         clases UML (snapshot completo, con atributos y
 *                   operaciones embebidos, tal como las trae
 *                   DiagramaCompletoResponse)
 * - relaciones:     relaciones UML
 * - colaSync:       cambios pendientes de enviar al backend (batch FIFO
 *                   de /sincronizacion/batch)
 * - colaIA (v2):    prompts del Agente Dev encolados mientras el
 *                   navegador está offline (offline/iaOfflineQueue.ts)
 *
 * ⚠️ Modelo del backend CICLO 2: las clases y relaciones viven EMBEBIDAS
 * en el documento Diagrama (no tienen id_diagrama propio) y todos los ids
 * son `Id` (string hex de ObjectId / uuid del elemento embebido). El
 * id_diagrama de cada tabla local lo aporta el REPOSITORIO
 * (diagramaLocalRepo) cuando guarda, no el tipo del backend.
 *
 * Todo se indexa por id (el id real del backend) y por diagrama_id
 * (para queries locales por diagrama).
 */

import Dexie, { type Table } from 'dexie';

import type { ClaseUML, RelacionUML } from '@/types';
import type { Id } from '@/types/common';
import type { PromptIARequest } from '@/api';

// ======================================================================
// Tipos de las tablas locales
// ======================================================================
export interface DiagramaLocal {
  /** ObjectId hex del diagrama (clave primaria). */
  id: Id;
  id_proyecto: Id;
  nombre: string;
  version_uml: string;
  numero_version: number;
  id_creador: Id;
  created_at: string;
  updated_at: string;
  /** Timestamp de última actualización local (ms epoch). */
  local_updated_at: number;
}

export interface ClaseLocal {
  /** Id real de la clase embebida (uuid). */
  id: Id;
  id_diagrama: Id;
  /** Snapshot completo de la clase (atributos y operaciones incluidos). */
  data: ClaseUML;
  /** Timestamp de última actualización local. */
  local_updated_at: number;
}

export interface RelacionLocal {
  id: Id;
  id_diagrama: Id;
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
  /** Id autogenerado por Dexie (++localId). */
  localId?: number;
  /** Id temporal local (string único por operación). */
  id_temporal_local: string;
  id_diagrama: Id;
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

/**
 * Prompt del Agente Dev (módulo G) encolado mientras no hay conexión.
 * El flujo del chat (iaApi.enviarPrompt → acciones_propuestas →
 * confirmación) requiere backend, así que offline el prompt espera acá
 * y se reenvía tal cual al recuperar conexión.
 */
export interface ItemColaIA {
  /** Id autogenerado por Dexie (++localId) — orden FIFO de la cola. */
  localId?: number;
  /** La ruta del prompt cuelga del proyecto: /ia/proyectos/{id}/prompt. */
  id_proyecto: Id;
  /** Request original (texto_prompt, origen, id_diagrama, contexto). */
  request: PromptIARequest;
  estado: 'PENDIENTE' | 'ENVIANDO' | 'ENVIADO' | 'ERROR';
  intentos: number;
  ultimo_error?: string;
  /** ISO de creación local. */
  creado_en: string;
  /** ISO del reenvío exitoso (housekeeping). */
  enviado_en?: string | null;
}

// ======================================================================
// Base de datos
// ======================================================================
class DevForgeDB extends Dexie {
  diagramas!: Table<DiagramaLocal, Id>;
  clases!: Table<ClaseLocal, Id>;
  relaciones!: Table<RelacionLocal, Id>;
  colaSync!: Table<ItemColaSync, number>;
  colaIA!: Table<ItemColaIA, number>;

  constructor() {
    super('devforge_offline');

    // Versión 1 del esquema (Bloque F: offline del editor + cola sync)
    this.version(1).stores({
      diagramas: 'id, id_proyecto',
      clases: 'id, id_diagrama',
      relaciones: 'id, id_diagrama',
      colaSync: '++localId, id_diagrama, estado, timestamp_local',
    });

    // Versión 2 (F26): cola del Agente Dev offline. En dexie cada
    // versión declara solo el DELTA: las 4 tablas de v1 se heredan.
    this.version(2).stores({
      colaIA: '++localId, id_proyecto, estado, creado_en',
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

/**
 * Limpia toda la base local (útil al hacer logout o cambio de usuario).
 * Incluye la cola IA: los prompts del chat son datos del usuario y no
 * deben sobrevivir a la sesión.
 */
export async function limpiarBaseLocal(): Promise<void> {
  await db.transaction(
    'rw',
    db.diagramas,
    db.clases,
    db.relaciones,
    db.colaSync,
    db.colaIA,
    async () => {
      await db.diagramas.clear();
      await db.clases.clear();
      await db.relaciones.clear();
      await db.colaSync.clear();
      await db.colaIA.clear();
    }
  );
}