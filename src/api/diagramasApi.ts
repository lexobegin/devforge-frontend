// src/api/diagramasApi.ts
/**
 * Endpoints del módulo de diagramas UML (clases, atributos, operaciones,
 * parámetros, interfaces, relaciones).
 * Corresponde a `app/api/v1/diagramas_router.py` del backend Ciclo 2.
 *
 * Es el cliente más extenso porque cubre todas las operaciones del editor.
 *
 * Convención de ids (Ciclo 2, todo embebido):
 * - `diagramaId` / `proyectoId`: ObjectId hex del documento (string).
 * - `claseId` / `atributoId` / `operacionId` / `parametroId` /
 *   `interfazId` / `operacionInterfazId` / `relacionId`: uuid str del
 *   elemento embebido (los mismos que pinta el lienzo).
 */

import { http } from './httpClient';
import type {
  AtributoUML,
  AtributoUMLCreate,
  AtributoUMLUpdate,
  ClaseUML,
  ClaseUMLCreate,
  ClaseUMLUpdate,
  Diagrama,
  DiagramaCompleto,
  DiagramaCreate,
  DiagramaUpdate,
  Id,
  InterfazUML,
  InterfazUMLCreate,
  InterfazUMLUpdate,
  OperacionInterfazUML,
  OperacionInterfazUMLCreate,
  OperacionInterfazUMLUpdate,
  OperacionUML,
  OperacionUMLCreate,
  OperacionUMLUpdate,
  ParametroOperacionUML,
  ParametroOperacionUMLCreate,
  ParametroOperacionUMLUpdate,
  RelacionUML,
  RelacionUMLCreate,
  RelacionUMLUpdate,
} from '@/types';

export const diagramasApi = {
  // ====================================================================
  // DIAGRAMAS
  // ====================================================================
  /** Lista los diagramas de un proyecto. */
  listarPorProyecto(proyectoId: Id): Promise<Diagrama[]> {
    return http.get<Diagrama[]>(`/diagramas/proyecto/${proyectoId}`);
  },

  /** Crea un diagrama dentro de un proyecto. */
  crear(proyectoId: Id, payload: DiagramaCreate): Promise<Diagrama> {
    return http.post<Diagrama>(`/diagramas/proyecto/${proyectoId}`, payload);
  },

  /** Obtiene la metadata de un diagrama. */
  obtener(id: Id): Promise<Diagrama> {
    return http.get<Diagrama>(`/diagramas/${id}`);
  },

  /**
   * Obtiene el diagrama completo: clases (con atributos, operaciones y
   * parámetros), interfaces (con sus operaciones) y relaciones. Payload
   * que consume el editor.
   */
  obtenerCompleto(id: Id): Promise<DiagramaCompleto> {
    return http.get<DiagramaCompleto>(`/diagramas/${id}/completo`);
  },

  /** Actualiza la metadata del diagrama (nombre, version_uml). */
  actualizar(id: Id, payload: DiagramaUpdate): Promise<Diagrama> {
    return http.put<Diagrama>(`/diagramas/${id}`, payload);
  },

  /** Elimina el diagrama y todo su contenido en cascada. */
  eliminar(id: Id): Promise<void> {
    return http.delete<void>(`/diagramas/${id}`);
  },

  // ====================================================================
  // CLASES
  // ====================================================================
  /** Lista las clases del diagrama. */
  listarClases(diagramaId: Id): Promise<ClaseUML[]> {
    return http.get<ClaseUML[]>(`/diagramas/${diagramaId}/clases`);
  },

  /** Crea una clase (puede incluir atributos y operaciones anidados). */
  crearClase(diagramaId: Id, payload: ClaseUMLCreate): Promise<ClaseUML> {
    return http.post<ClaseUML>(`/diagramas/${diagramaId}/clases`, payload);
  },

  /** Obtiene una clase con sus atributos y operaciones. */
  obtenerClase(claseId: Id): Promise<ClaseUML> {
    return http.get<ClaseUML>(`/diagramas/clases/${claseId}`);
  },

  actualizarClase(claseId: Id, payload: ClaseUMLUpdate): Promise<ClaseUML> {
    return http.put<ClaseUML>(`/diagramas/clases/${claseId}`, payload);
  },

  /** Elimina la clase y sus relaciones asociadas. */
  eliminarClase(claseId: Id): Promise<void> {
    return http.delete<void>(`/diagramas/clases/${claseId}`);
  },

  // ====================================================================
  // ATRIBUTOS
  // ====================================================================
  /** Lista los atributos de una clase. */
  listarAtributos(claseId: Id): Promise<AtributoUML[]> {
    return http.get<AtributoUML[]>(`/diagramas/clases/${claseId}/atributos`);
  },

  /** Agrega un atributo a la clase. */
  agregarAtributo(
    claseId: Id,
    payload: AtributoUMLCreate
  ): Promise<AtributoUML> {
    return http.post<AtributoUML>(
      `/diagramas/clases/${claseId}/atributos`,
      payload
    );
  },

  actualizarAtributo(
    atributoId: Id,
    payload: AtributoUMLUpdate
  ): Promise<AtributoUML> {
    return http.put<AtributoUML>(
      `/diagramas/atributos/${atributoId}`,
      payload
    );
  },

  eliminarAtributo(atributoId: Id): Promise<void> {
    return http.delete<void>(`/diagramas/atributos/${atributoId}`);
  },

  // ====================================================================
  // OPERACIONES
  // ====================================================================
  /** Lista las operaciones de una clase. */
  listarOperaciones(claseId: Id): Promise<OperacionUML[]> {
    return http.get<OperacionUML[]>(
      `/diagramas/clases/${claseId}/operaciones`
    );
  },

  /** Agrega una operación (con parámetros anidados) a la clase. */
  agregarOperacion(
    claseId: Id,
    payload: OperacionUMLCreate
  ): Promise<OperacionUML> {
    return http.post<OperacionUML>(
      `/diagramas/clases/${claseId}/operaciones`,
      payload
    );
  },

  actualizarOperacion(
    operacionId: Id,
    payload: OperacionUMLUpdate
  ): Promise<OperacionUML> {
    return http.put<OperacionUML>(
      `/diagramas/operaciones/${operacionId}`,
      payload
    );
  },

  /** Elimina la operación y sus parámetros. */
  eliminarOperacion(operacionId: Id): Promise<void> {
    return http.delete<void>(`/diagramas/operaciones/${operacionId}`);
  },

  // ====================================================================
  // PARÁMETROS
  // ====================================================================
  /** Agrega un parámetro a la operación. */
  agregarParametro(
    operacionId: Id,
    payload: ParametroOperacionUMLCreate
  ): Promise<ParametroOperacionUML> {
    return http.post<ParametroOperacionUML>(
      `/diagramas/operaciones/${operacionId}/parametros`,
      payload
    );
  },

  actualizarParametro(
    parametroId: Id,
    payload: ParametroOperacionUMLUpdate
  ): Promise<ParametroOperacionUML> {
    return http.put<ParametroOperacionUML>(
      `/diagramas/parametros/${parametroId}`,
      payload
    );
  },

  eliminarParametro(parametroId: Id): Promise<void> {
    return http.delete<void>(`/diagramas/parametros/${parametroId}`);
  },

  // ====================================================================
  // INTERFACES
  // ====================================================================
  /** Crea una interfaz en el diagrama (con operaciones anidadas). */
  crearInterfaz(
    diagramaId: Id,
    payload: InterfazUMLCreate
  ): Promise<InterfazUML> {
    return http.post<InterfazUML>(
      `/diagramas/${diagramaId}/interfaces`,
      payload
    );
  },

  actualizarInterfaz(
    interfazId: Id,
    payload: InterfazUMLUpdate
  ): Promise<InterfazUML> {
    return http.put<InterfazUML>(
      `/diagramas/interfaces/${interfazId}`,
      payload
    );
  },

  eliminarInterfaz(interfazId: Id): Promise<void> {
    return http.delete<void>(`/diagramas/interfaces/${interfazId}`);
  },

  /** Agrega una operación a la interfaz. */
  agregarOperacionInterfaz(
    interfazId: Id,
    payload: OperacionInterfazUMLCreate
  ): Promise<OperacionInterfazUML> {
    return http.post<OperacionInterfazUML>(
      `/diagramas/interfaces/${interfazId}/operaciones`,
      payload
    );
  },

  actualizarOperacionInterfaz(
    operacionId: Id,
    payload: OperacionInterfazUMLUpdate
  ): Promise<OperacionInterfazUML> {
    return http.put<OperacionInterfazUML>(
      `/diagramas/operaciones-interfaz/${operacionId}`,
      payload
    );
  },

  eliminarOperacionInterfaz(operacionId: Id): Promise<void> {
    return http.delete<void>(`/diagramas/operaciones-interfaz/${operacionId}`);
  },

  // ====================================================================
  // RELACIONES
  // ====================================================================
  /** Lista las relaciones del diagrama. */
  listarRelaciones(diagramaId: Id): Promise<RelacionUML[]> {
    return http.get<RelacionUML[]>(`/diagramas/${diagramaId}/relaciones`);
  },

  /**
   * Crea una relación entre dos clases del MISMO diagrama. El backend
   * rechaza duplicados del mismo tipo entre las mismas clases (409).
   */
  crearRelacion(
    diagramaId: Id,
    payload: RelacionUMLCreate
  ): Promise<RelacionUML> {
    return http.post<RelacionUML>(
      `/diagramas/${diagramaId}/relaciones`,
      payload
    );
  },

  actualizarRelacion(
    relacionId: Id,
    payload: RelacionUMLUpdate
  ): Promise<RelacionUML> {
    return http.put<RelacionUML>(
      `/diagramas/relaciones/${relacionId}`,
      payload
    );
  },

  eliminarRelacion(relacionId: Id): Promise<void> {
    return http.delete<void>(`/diagramas/relaciones/${relacionId}`);
  },
};