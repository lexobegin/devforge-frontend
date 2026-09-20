// src/offline/diagramaLocalRepo.ts
/**
 * Repositorio local del diagrama (IndexedDB).
 *
 * Ofrece las operaciones CRUD contra IndexedDB que el store del diagrama
 * usa cuando el usuario está offline o como caché primaria.
 *
 * No habla con el backend: eso lo hace el `syncManager`.
 */

import type { ClaseUML, DiagramaCompleto, RelacionUML } from '@/types';
import {
  db,
  type ClaseLocal,
  type DiagramaLocal,
  type RelacionLocal,
} from './indexedDbClient';

export const diagramaLocalRepo = {
  // ==================================================================
  // DIAGRAMA
  // ==================================================================
  async guardarDiagrama(diagrama: DiagramaCompleto): Promise<void> {
    const local: DiagramaLocal = {
      id: diagrama.id,
      id_proyecto: diagrama.id_proyecto,
      nombre: diagrama.nombre,
      version_uml: diagrama.version_uml,
      numero_version: diagrama.numero_version,
      id_creador: diagrama.id_creador,
      created_at: diagrama.created_at,
      updated_at: diagrama.updated_at,
      local_updated_at: Date.now(),
    };
    await db.diagramas.put(local);
  },

  async obtenerDiagrama(
    diagramaId: number
  ): Promise<DiagramaLocal | undefined> {
    return db.diagramas.get(diagramaId);
  },

  async listarPorProyecto(proyectoId: number): Promise<DiagramaLocal[]> {
    return db.diagramas.where('id_proyecto').equals(proyectoId).toArray();
  },

  // ==================================================================
  // DIAGRAMA COMPLETO (con clases + relaciones)
  // ==================================================================
  async guardarDiagramaCompleto(diagrama: DiagramaCompleto): Promise<void> {
    await db.transaction('rw', db.diagramas, db.clases, db.relaciones, async () => {
      await diagramaLocalRepo.guardarDiagrama(diagrama);

      // Reemplazar clases y relaciones del diagrama
      await db.clases.where('id_diagrama').equals(diagrama.id).delete();
      await db.relaciones.where('id_diagrama').equals(diagrama.id).delete();

      const clases: ClaseLocal[] = diagrama.clases.map((c) => ({
        id: c.id,
        id_diagrama: c.id_diagrama,
        data: c,
        local_updated_at: Date.now(),
      }));
      const relaciones: RelacionLocal[] = diagrama.relaciones.map((r) => ({
        id: r.id,
        id_diagrama: r.id_diagrama,
        data: r,
        local_updated_at: Date.now(),
      }));

      if (clases.length > 0) await db.clases.bulkPut(clases);
      if (relaciones.length > 0) await db.relaciones.bulkPut(relaciones);
    });
  },

  async obtenerDiagramaCompleto(
    diagramaId: number
  ): Promise<DiagramaCompleto | null> {
    const diagrama = await db.diagramas.get(diagramaId);
    if (!diagrama) return null;

    const clases = await db.clases
      .where('id_diagrama')
      .equals(diagramaId)
      .toArray();
    const relaciones = await db.relaciones
      .where('id_diagrama')
      .equals(diagramaId)
      .toArray();

    return {
      id: diagrama.id,
      id_proyecto: diagrama.id_proyecto,
      nombre: diagrama.nombre,
      version_uml: diagrama.version_uml,
      numero_version: diagrama.numero_version,
      id_creador: diagrama.id_creador,
      created_at: diagrama.created_at,
      updated_at: diagrama.updated_at,
      clases: clases.map((c) => c.data),
      interfaces: [], // Interfaces no se cachean por ahora
      relaciones: relaciones.map((r) => r.data),
    };
  },

  // ==================================================================
  // CLASES
  // ==================================================================
  async guardarClase(clase: ClaseUML): Promise<void> {
    await db.clases.put({
      id: clase.id,
      id_diagrama: clase.id_diagrama,
      data: clase,
      local_updated_at: Date.now(),
    });
  },

  async guardarClases(clases: ClaseUML[]): Promise<void> {
    if (clases.length === 0) return;
    await db.clases.bulkPut(
      clases.map((c) => ({
        id: c.id,
        id_diagrama: c.id_diagrama,
        data: c,
        local_updated_at: Date.now(),
      }))
    );
  },

  async obtenerClase(claseId: number): Promise<ClaseUML | undefined> {
    const local = await db.clases.get(claseId);
    return local?.data;
  },

  async listarClases(diagramaId: number): Promise<ClaseUML[]> {
    const items = await db.clases
      .where('id_diagrama')
      .equals(diagramaId)
      .toArray();
    return items.map((c) => c.data);
  },

  async eliminarClase(claseId: number): Promise<void> {
    await db.clases.delete(claseId);
  },

  // ==================================================================
  // RELACIONES
  // ==================================================================
  async guardarRelacion(relacion: RelacionUML): Promise<void> {
    await db.relaciones.put({
      id: relacion.id,
      id_diagrama: relacion.id_diagrama,
      data: relacion,
      local_updated_at: Date.now(),
    });
  },

  async guardarRelaciones(relaciones: RelacionUML[]): Promise<void> {
    if (relaciones.length === 0) return;
    await db.relaciones.bulkPut(
      relaciones.map((r) => ({
        id: r.id,
        id_diagrama: r.id_diagrama,
        data: r,
        local_updated_at: Date.now(),
      }))
    );
  },

  async listarRelaciones(diagramaId: number): Promise<RelacionUML[]> {
    const items = await db.relaciones
      .where('id_diagrama')
      .equals(diagramaId)
      .toArray();
    return items.map((r) => r.data);
  },

  async eliminarRelacion(relacionId: number): Promise<void> {
    await db.relaciones.delete(relacionId);
  },
};