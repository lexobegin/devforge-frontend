// src/api/proyectosApi.ts
/**
 * Endpoints del módulo de proyectos y miembros.
 * Corresponde a `app/api/v1/proyectos_router.py` del backend Ciclo 2.
 *
 * Rutas (verificadas contra el router):
 *   GET    /proyectos                                  → página (skip/limit/incluir_archivados/todos)
 *   POST   /proyectos                                  → 201 Proyecto
 *   GET    /proyectos/{id}                             → ProyectoConMiembros
 *   PUT    /proyectos/{id}                             → Proyecto
 *   POST   /proyectos/{id}/archivar                    → Proyecto
 *   POST   /proyectos/{id}/reactivar                   → Proyecto
 *   DELETE /proyectos/{id}                             → 204
 *   GET    /proyectos/{id}/miembros                    → MiembroProyecto[]
 *   GET    /proyectos/{id}/candidatos                  → UsuarioCandidato[] (B23)
 *   POST   /proyectos/{id}/miembros                    → 201 MiembroProyecto
 *   PUT    /proyectos/{id}/miembros/{miembro_id}       → MiembroProyecto
 *   DELETE /proyectos/{id}/miembros/{miembro_id}       → 204
 *   POST   /proyectos/{id}/transferir-propiedad        → MiembroProyecto
 *
 * Nota Ciclo 2: los miembros van embebidos, así que `{miembro_id}` en
 * las rutas de miembros es el **id_usuario** del miembro (ver
 * proyecto_service.py). Los ids viajan como string (ObjectId hex).
 */

import { http } from './httpClient';
import type {
  CandidatosQuery,
  Id,
  MiembroProyecto,
  MiembroProyectoCreate,
  MiembroProyectoUpdate,
  PaginatedResponse,
  Proyecto,
  ProyectoConMiembros,
  ProyectoCreate,
  ProyectoUpdate,
  ProyectosQuery,
  UsuarioCandidato,
} from '@/types';

export const proyectosApi = {
  // ====================================================================
  // PROYECTOS
  // ====================================================================
  /** Lista los proyectos del usuario (o todos si es ADMIN con `todos=true`). */
  listar(params: ProyectosQuery = {}): Promise<PaginatedResponse<Proyecto>> {
    return http.get<PaginatedResponse<Proyecto>>('/proyectos', { params });
  },

  /** Crea un proyecto. El creador queda como PROPIETARIO automáticamente. */
  crear(payload: ProyectoCreate): Promise<Proyecto> {
    return http.post<Proyecto>('/proyectos', payload);
  },

  /** Obtiene un proyecto con su lista de miembros (con_miembros=True). */
  obtener(id: Id): Promise<ProyectoConMiembros> {
    return http.get<ProyectoConMiembros>(`/proyectos/${id}`);
  },

  /** Actualiza nombre/descripción/estado de un proyecto. */
  actualizar(id: Id, payload: ProyectoUpdate): Promise<Proyecto> {
    return http.put<Proyecto>(`/proyectos/${id}`, payload);
  },

  /** Archiva un proyecto (solo PROPIETARIO). */
  archivar(id: Id): Promise<Proyecto> {
    return http.post<Proyecto>(`/proyectos/${id}/archivar`);
  },

  /** Reactiva un proyecto archivado (solo PROPIETARIO). */
  reactivar(id: Id): Promise<Proyecto> {
    return http.post<Proyecto>(`/proyectos/${id}/reactivar`);
  },

  /** Elimina un proyecto y todo lo asociado en cascada (solo PROPIETARIO). */
  eliminar(id: Id): Promise<void> {
    return http.delete<void>(`/proyectos/${id}`);
  },

  // ====================================================================
  // MIEMBROS
  // ====================================================================
  /** Lista los miembros del proyecto. */
  listarMiembros(proyectoId: Id): Promise<MiembroProyecto[]> {
    return http.get<MiembroProyecto[]>(`/proyectos/${proyectoId}/miembros`);
  },

  /**
   * Tanda B23: candidatos a miembro (usuarios activos que AÚN no son
   * miembros), con búsqueda opcional por nombre/email. Repara el 403
   * del modal: sustituye a `usuariosApi.listar` (solo-ADMIN) para el
   * PROPIETARIO con rol global DESARROLLADOR.
   */
  listarCandidatos(
    proyectoId: Id,
    params: CandidatosQuery = {}
  ): Promise<UsuarioCandidato[]> {
    return http.get<UsuarioCandidato[]>(
      `/proyectos/${proyectoId}/candidatos`,
      { params }
    );
  },

  /** Agrega un miembro al proyecto (solo PROPIETARIO). */
  agregarMiembro(
    proyectoId: Id,
    payload: MiembroProyectoCreate
  ): Promise<MiembroProyecto> {
    return http.post<MiembroProyecto>(
      `/proyectos/${proyectoId}/miembros`,
      payload
    );
  },

  /**
   * Cambia el rol de un miembro (solo PROPIETARIO).
   * `miembroId` = id_usuario del miembro (los miembros van embebidos).
   */
  cambiarRolMiembro(
    proyectoId: Id,
    miembroId: Id,
    payload: MiembroProyectoUpdate
  ): Promise<MiembroProyecto> {
    return http.put<MiembroProyecto>(
      `/proyectos/${proyectoId}/miembros/${miembroId}`,
      payload
    );
  },

  /**
   * Quita a un miembro del proyecto. `miembroId` = id_usuario del miembro.
   * Un miembro también puede quitarse a sí mismo (salirse).
   */
  quitarMiembro(proyectoId: Id, miembroId: Id): Promise<void> {
    return http.delete<void>(
      `/proyectos/${proyectoId}/miembros/${miembroId}`
    );
  },

  /**
   * Transfiere la propiedad del proyecto a otro miembro (query param
   * `nuevo_propietario_id`, como lo declara el router).
   */
  transferirPropiedad(
    proyectoId: Id,
    nuevoPropietarioId: Id
  ): Promise<MiembroProyecto> {
    return http.post<MiembroProyecto>(
      `/proyectos/${proyectoId}/transferir-propiedad`,
      undefined,
      { params: { nuevo_propietario_id: nuevoPropietarioId } }
    );
  },
};