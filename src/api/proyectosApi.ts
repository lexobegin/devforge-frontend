// src/api/proyectosApi.ts
/**
 * Endpoints del módulo de proyectos y miembros.
 * Corresponde a `app/api/v1/proyectos_router.py` del backend.
 */

import { http } from './httpClient';
import type {
  MiembroProyecto,
  MiembroProyectoCreate,
  MiembroProyectoUpdate,
  PaginatedResponse,
  Proyecto,
  ProyectoConMiembros,
  ProyectoCreate,
  ProyectoUpdate,
  ProyectosQuery,
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

  /** Obtiene un proyecto con su lista de miembros. */
  obtener(id: number): Promise<ProyectoConMiembros> {
    return http.get<ProyectoConMiembros>(`/proyectos/${id}`);
  },

  /** Actualiza nombre/descripción/estado de un proyecto. */
  actualizar(id: number, payload: ProyectoUpdate): Promise<Proyecto> {
    return http.put<Proyecto>(`/proyectos/${id}`, payload);
  },

  /** Archiva un proyecto (solo PROPIETARIO). */
  archivar(id: number): Promise<Proyecto> {
    return http.post<Proyecto>(`/proyectos/${id}/archivar`);
  },

  /** Reactiva un proyecto archivado (solo PROPIETARIO). */
  reactivar(id: number): Promise<Proyecto> {
    return http.post<Proyecto>(`/proyectos/${id}/reactivar`);
  },

  /** Elimina un proyecto (solo PROPIETARIO). */
  eliminar(id: number): Promise<void> {
    return http.delete<void>(`/proyectos/${id}`);
  },

  // ====================================================================
  // MIEMBROS
  // ====================================================================
  /** Lista los miembros del proyecto. */
  listarMiembros(proyectoId: number): Promise<MiembroProyecto[]> {
    return http.get<MiembroProyecto[]>(`/proyectos/${proyectoId}/miembros`);
  },

  /** Agrega un miembro al proyecto (solo PROPIETARIO). */
  agregarMiembro(
    proyectoId: number,
    payload: MiembroProyectoCreate
  ): Promise<MiembroProyecto> {
    return http.post<MiembroProyecto>(
      `/proyectos/${proyectoId}/miembros`,
      payload
    );
  },

  /** Cambia el rol de un miembro (solo PROPIETARIO). */
  cambiarRolMiembro(
    proyectoId: number,
    miembroId: number,
    payload: MiembroProyectoUpdate
  ): Promise<MiembroProyecto> {
    return http.put<MiembroProyecto>(
      `/proyectos/${proyectoId}/miembros/${miembroId}`,
      payload
    );
  },

  /** Quita a un miembro del proyecto. */
  quitarMiembro(proyectoId: number, miembroId: number): Promise<void> {
    return http.delete<void>(
      `/proyectos/${proyectoId}/miembros/${miembroId}`
    );
  },

  /** Transfiere la propiedad del proyecto a otro miembro. */
  transferirPropiedad(
    proyectoId: number,
    nuevoPropietarioId: number
  ): Promise<MiembroProyecto> {
    return http.post<MiembroProyecto>(
      `/proyectos/${proyectoId}/transferir-propiedad`,
      undefined,
      { params: { nuevo_propietario_id: nuevoPropietarioId } }
    );
  },
};