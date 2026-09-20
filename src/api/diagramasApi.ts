// src/api/diagramasApi.ts
/**
 * Endpoints del módulo de diagramas UML (clases, atributos, operaciones,
 * parámetros, interfaces, relaciones).
 * Corresponde a `app/api/v1/diagramas_router.py` del backend.
 *
 * Es el cliente más extenso porque cubre todas las operaciones del editor.
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
  listarPorProyecto(proyectoId: number): Promise<Diagrama[]> {
    return http.get<Diagrama[]>(`/diagramas/proyecto/${proyectoId}`);
  },

  /** Crea un diagrama dentro de un proyecto. */
  crear(proyectoId: number, payload: DiagramaCreate): Promise<Diagrama> {
    return http.post<Diagrama>(`/diagramas/proyecto/${proyectoId}`, payload);
  },

  /** Obtiene la metadata de un diagrama. */
  obtener(id: number): Promise<Diagrama> {
    return http.get<Diagrama>(`/diagramas/${id}`);
  },

  /**
   * Obtiene el diagrama completo: clases (con atributos y operaciones),
   * interfaces y relaciones. Payload que consume el editor.
   */
  obtenerCompleto(id: number): Promise<DiagramaCompleto> {
    return http.get<DiagramaCompleto>(`/diagramas/${id}/completo`);
  },

  /** Actualiza la metadata del diagrama. */
  actualizar(id: number, payload: DiagramaUpdate): Promise<Diagrama> {
    return http.put<Diagrama>(`/diagramas/${id}`, payload);
  },

  /** Elimina el diagrama y todo su contenido en cascada. */
  eliminar(id: number): Promise<void> {
    return http.delete<void>(`/diagramas/${id}`);
  },

  // ====================================================================
  // CLASES
  // ====================================================================
  listarClases(diagramaId: number): Promise<ClaseUML[]> {
    return http.get<ClaseUML[]>(`/diagramas/${diagramaId}/clases`);
  },

  /** Crea una clase (puede incluir atributos y operaciones anidados). */
  crearClase(diagramaId: number, payload: ClaseUMLCreate): Promise<ClaseUML> {
    return http.post<ClaseUML>(`/diagramas/${diagramaId}/clases`, payload);
  },

  obtenerClase(claseId: number): Promise<ClaseUML> {
    return http.get<ClaseUML>(`/diagramas/clases/${claseId}`);
  },

  actualizarClase(claseId: number, payload: ClaseUMLUpdate): Promise<ClaseUML> {
    return http.put<ClaseUML>(`/diagramas/clases/${claseId}`, payload);
  },

  eliminarClase(claseId: number): Promise<void> {
    return http.delete<void>(`/diagramas/clases/${claseId}`);
  },

  // ====================================================================
  // ATRIBUTOS
  // ====================================================================
  listarAtributos(claseId: number): Promise<AtributoUML[]> {
    return http.get<AtributoUML[]>(`/diagramas/clases/${claseId}/atributos`);
  },

  agregarAtributo(
    claseId: number,
    payload: AtributoUMLCreate
  ): Promise<AtributoUML> {
    return http.post<AtributoUML>(
      `/diagramas/clases/${claseId}/atributos`,
      payload
    );
  },

  actualizarAtributo(
    atributoId: number,
    payload: AtributoUMLUpdate
  ): Promise<AtributoUML> {
    return http.put<AtributoUML>(
      `/diagramas/atributos/${atributoId}`,
      payload
    );
  },

  eliminarAtributo(atributoId: number): Promise<void> {
    return http.delete<void>(`/diagramas/atributos/${atributoId}`);
  },

  // ====================================================================
  // OPERACIONES
  // ====================================================================
  listarOperaciones(claseId: number): Promise<OperacionUML[]> {
    return http.get<OperacionUML[]>(
      `/diagramas/clases/${claseId}/operaciones`
    );
  },

  agregarOperacion(
    claseId: number,
    payload: OperacionUMLCreate
  ): Promise<OperacionUML> {
    return http.post<OperacionUML>(
      `/diagramas/clases/${claseId}/operaciones`,
      payload
    );
  },

  actualizarOperacion(
    operacionId: number,
    payload: OperacionUMLUpdate
  ): Promise<OperacionUML> {
    return http.put<OperacionUML>(
      `/diagramas/operaciones/${operacionId}`,
      payload
    );
  },

  eliminarOperacion(operacionId: number): Promise<void> {
    return http.delete<void>(`/diagramas/operaciones/${operacionId}`);
  },

  // ====================================================================
  // PARÁMETROS
  // ====================================================================
  agregarParametro(
    operacionId: number,
    payload: ParametroOperacionUMLCreate
  ): Promise<ParametroOperacionUML> {
    return http.post<ParametroOperacionUML>(
      `/diagramas/operaciones/${operacionId}/parametros`,
      payload
    );
  },

  actualizarParametro(
    parametroId: number,
    payload: ParametroOperacionUMLUpdate
  ): Promise<ParametroOperacionUML> {
    return http.put<ParametroOperacionUML>(
      `/diagramas/parametros/${parametroId}`,
      payload
    );
  },

  eliminarParametro(parametroId: number): Promise<void> {
    return http.delete<void>(`/diagramas/parametros/${parametroId}`);
  },

  // ====================================================================
  // INTERFACES
  // ====================================================================
  crearInterfaz(
    diagramaId: number,
    payload: InterfazUMLCreate
  ): Promise<InterfazUML> {
    return http.post<InterfazUML>(
      `/diagramas/${diagramaId}/interfaces`,
      payload
    );
  },

  actualizarInterfaz(
    interfazId: number,
    payload: InterfazUMLUpdate
  ): Promise<InterfazUML> {
    return http.put<InterfazUML>(
      `/diagramas/interfaces/${interfazId}`,
      payload
    );
  },

  eliminarInterfaz(interfazId: number): Promise<void> {
    return http.delete<void>(`/diagramas/interfaces/${interfazId}`);
  },

  agregarOperacionInterfaz(
    interfazId: number,
    payload: OperacionInterfazUMLCreate
  ): Promise<OperacionInterfazUML> {
    return http.post<OperacionInterfazUML>(
      `/diagramas/interfaces/${interfazId}/operaciones`,
      payload
    );
  },

  actualizarOperacionInterfaz(
    operacionId: number,
    payload: OperacionInterfazUMLUpdate
  ): Promise<OperacionInterfazUML> {
    return http.put<OperacionInterfazUML>(
      `/diagramas/operaciones-interfaz/${operacionId}`,
      payload
    );
  },

  eliminarOperacionInterfaz(operacionId: number): Promise<void> {
    return http.delete<void>(`/diagramas/operaciones-interfaz/${operacionId}`);
  },

  // ====================================================================
  // RELACIONES
  // ====================================================================
  listarRelaciones(diagramaId: number): Promise<RelacionUML[]> {
    return http.get<RelacionUML[]>(`/diagramas/${diagramaId}/relaciones`);
  },

  crearRelacion(
    diagramaId: number,
    payload: RelacionUMLCreate
  ): Promise<RelacionUML> {
    return http.post<RelacionUML>(
      `/diagramas/${diagramaId}/relaciones`,
      payload
    );
  },

  actualizarRelacion(
    relacionId: number,
    payload: RelacionUMLUpdate
  ): Promise<RelacionUML> {
    return http.put<RelacionUML>(
      `/diagramas/relaciones/${relacionId}`,
      payload
    );
  },

  eliminarRelacion(relacionId: number): Promise<void> {
    return http.delete<void>(`/diagramas/relaciones/${relacionId}`);
  },
};