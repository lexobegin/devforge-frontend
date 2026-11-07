// src/offline/diagramaLocalRepo.ts
/**
 * Repositorio local del diagrama (IndexedDB).
 *
 * Ofrece las operaciones CRUD contra IndexedDB que el store del diagrama
 * usa cuando el usuario está offline o como caché primaria.
 *
 * No habla con el backend: eso lo hace el `syncManager`.
 *
 * ⚠️ Modelo del backend CICLO 2: ClaseUML y RelacionUML viven EMBEBIDAS
 * en el Diagrama y NO traen id_diagrama. Por eso los guardados sueltos
 * reciben el `idDiagrama` por parámetro y lo estampan en el registro
 * local (ClaseLocal/RelacionLocal).
 */

import type { ClaseUML, DiagramaCompleto, RelacionUML } from '@/types';
import type { Id } from '@/types/common';
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
    diagramaId: Id
  ): Promise<DiagramaLocal | undefined> {
    return db.diagramas.get(diagramaId);
  },

  async listarPorProyecto(proyectoId: Id): Promise<DiagramaLocal[]> {
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
        id_diagrama: diagrama.id, // embebida: el diagrama es la fuente
        data: c,
        local_updated_at: Date.now(),
      }));
      const relaciones: RelacionLocal[] = diagrama.relaciones.map((r) => ({
        id: r.id,
        id_diagrama: diagrama.id,
        data: r,
        local_updated_at: Date.now(),
      }));

      if (clases.length > 0) await db.clases.bulkPut(clases);
      if (relaciones.length > 0) await db.relaciones.bulkPut(relaciones);
    });
  },

  async obtenerDiagramaCompleto(
    diagramaId: Id
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
  async guardarClase(idDiagrama: Id, clase: ClaseUML): Promise<void> {
    await db.clases.put({
      id: clase.id,
      id_diagrama: idDiagrama,
      data: clase,
      local_updated_at: Date.now(),
    });
  },

  async guardarClases(idDiagrama: Id, clases: ClaseUML[]): Promise<void> {
    if (clases.length === 0) return;
    await db.clases.bulkPut(
      clases.map((c) => ({
        id: c.id,
        id_diagrama: idDiagrama,
        data: c,
        local_updated_at: Date.now(),
      }))
    );
  },

  async obtenerClase(claseId: Id): Promise<ClaseUML | undefined> {
    const local = await db.clases.get(claseId);
    return local?.data;
  },

  async listarClases(diagramaId: Id): Promise<ClaseUML[]> {
    const items = await db.clases
      .where('id_diagrama')
      .equals(diagramaId)
      .toArray();
    return items.map((c) => c.data);
  },

  async eliminarClase(claseId: Id): Promise<void> {
    await db.clases.delete(claseId);
  },

  // ==================================================================
  // RELACIONES
  // ==================================================================
  async guardarRelacion(idDiagrama: Id, relacion: RelacionUML): Promise<void> {
    await db.relaciones.put({
      id: relacion.id,
      id_diagrama: idDiagrama,
      data: relacion,
      local_updated_at: Date.now(),
    });
  },

  async guardarRelaciones(
    idDiagrama: Id,
    relaciones: RelacionUML[]
  ): Promise<void> {
    if (relaciones.length === 0) return;
    await db.relaciones.bulkPut(
      relaciones.map((r) => ({
        id: r.id,
        id_diagrama: idDiagrama,
        data: r,
        local_updated_at: Date.now(),
      }))
    );
  },

  async listarRelaciones(diagramaId: Id): Promise<RelacionUML[]> {
    const items = await db.relaciones
      .where('id_diagrama')
      .equals(diagramaId)
      .toArray();
    return items.map((r) => r.data);
  },

  async eliminarRelacion(relacionId: Id): Promise<void> {
    await db.relaciones.delete(relacionId);
  },
};