// src/store/proyectoStore.ts
/**
 * Store de proyectos y miembros (zustand).
 *
 * Responsabilidades:
 * - Lista paginada de proyectos con filtros (skip/limit/incluir_archivados).
 * - Proyecto activo (pantalla de detalle) con su lista de miembros.
 * - CRUD de proyectos + gestión de miembros contra `proyectosApi`.
 *
 * Contrato Ciclo 2 (proyectos_router.py):
 * - `obtener` responde ProyectoConMiembros (miembros embebidos).
 * - `{miembro_id}` en las rutas de miembros = **id_usuario** del miembro.
 * - `transferir-propiedad` recibe `nuevo_propietario_id` como query param.
 *
 * FIX de esta tanda (evitar recargas duplicadas): `cargarProyectoActivo`
 * recuerda el `idCargado`; si se pide el MISMO proyecto ya cargado,
 * no repite el GET (los cambios de miembros se aplican en línea tras
 * cada operación, y `transferirPropiedad` fuerza la recarga).
 */

import { create } from 'zustand';

import { ApiError, proyectosApi } from '@/api';
import type {
  Id,
  MiembroProyecto,
  Proyecto,
  ProyectoConMiembros,
  ProyectoCreate,
  ProyectoUpdate,
  ProyectosQuery,
  RolEnProyecto,
} from '@/types';
// (MiembroProyectoUpdate llega por la firma de proyectosApi.cambiarRolMiembro:
//  acá solo se construye { rol_en_proyecto }, que ya lo satisface.)

// ======================================================================
// Estado
// ======================================================================
interface ProyectoState {
  proyectos: Proyecto[];
  total: number;
  filtros: ProyectosQuery;
  /** Proyecto de la pantalla de detalle (con miembros). */
  proyectoActivo: ProyectoConMiembros | null;
  isLoading: boolean;
  isLoadingActivo: boolean;
  /** id del proyecto activo ya cargado (guarda anti-recarga duplicada). */
  idCargado: Id | null;
  error: string | null;

  cargar: (opciones?: { reset?: boolean }) => Promise<void>;
  setFiltros: (filtros: Partial<ProyectosQuery>) => void;
  crear: (payload: ProyectoCreate) => Promise<Proyecto>;
  actualizar: (id: Id, payload: ProyectoUpdate) => Promise<Proyecto>;
  archivar: (id: Id) => Promise<Proyecto>;
  reactivar: (id: Id) => Promise<Proyecto>;
  eliminar: (id: Id) => Promise<void>;
  cargarProyectoActivo: (id: Id, opciones?: { forzar?: boolean }) => Promise<void>;
  limpiarProyectoActivo: () => void;
  agregarMiembro: (proyectoId: Id, idUsuario: Id, rol?: RolEnProyecto) => Promise<MiembroProyecto>;
  cambiarRolMiembro: (proyectoId: Id, idUsuario: Id, rol: RolEnProyecto) => Promise<MiembroProyecto>;
  quitarMiembro: (proyectoId: Id, idUsuario: Id) => Promise<void>;
  transferirPropiedad: (proyectoId: Id, nuevoPropietarioId: Id) => Promise<void>;
  limpiarError: () => void;
}

// ======================================================================
// Helpers
// ======================================================================
function _msg(err: unknown): string {
  if (err instanceof ApiError) return err.detail || 'Error inesperado';
  if (err instanceof Error && err.message) return err.message;
  return 'Error inesperado';
}

/** Actualiza un proyecto dentro de la lista (por si sigue visible). */
function _reemplazarEnLista(
  proyectos: Proyecto[],
  actualizado: Proyecto
): Proyecto[] {
  const idx = proyectos.findIndex((p) => p.id === actualizado.id);
  if (idx === -1) return proyectos;
  const copia = [...proyectos];
  copia[idx] = actualizado;
  return copia;
}

// ======================================================================
// Store
// ======================================================================
export const useProyectoStore = create<ProyectoState>()((set, get) => ({
  proyectos: [],
  total: 0,
  filtros: { incluir_archivados: false, skip: 0, limit: 50 },
  proyectoActivo: null,
  isLoading: false,
  isLoadingActivo: false,
  idCargado: null,
  error: null,

  // ------------------------------------------------------------------
  // Lista
  // ------------------------------------------------------------------
  cargar: async ({ reset = false } = {}) => {
    const filtros = get().filtros;
    const skip = reset ? 0 : filtros.skip ?? 0;
    set({ isLoading: true, error: null });
    try {
      const pagina = await proyectosApi.listar({ ...filtros, skip });
      set((s) => ({
        proyectos: reset ? pagina.items : [...s.proyectos, ...pagina.items],
        total: pagina.total,
        filtros: { ...filtros, skip },
      }));
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  setFiltros: (nuevos) =>
    // Cambiar filtros siempre vuelve a la primera página.
    set((s) => ({ filtros: { ...s.filtros, ...nuevos, skip: 0 } })),

  // ------------------------------------------------------------------
  // CRUD de proyectos
  // ------------------------------------------------------------------
  crear: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const proyecto = await proyectosApi.crear(payload);
      set((s) => ({
        proyectos: [proyecto, ...s.proyectos],
        total: s.total + 1,
      }));
      return proyecto;
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  actualizar: async (id, payload) => {
    set({ error: null });
    try {
      const proyecto = await proyectosApi.actualizar(id, payload);
      set((s) => ({
        proyectos: _reemplazarEnLista(s.proyectos, proyecto),
        // Si es el proyecto activo, actualizar la vista de detalle en
        // línea (los miembros no cambian con un PUT de metadata).
        proyectoActivo:
          s.proyectoActivo?.id === id
            ? { ...s.proyectoActivo, ...proyecto }
            : s.proyectoActivo,
      }));
      return proyecto;
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    }
  },

  archivar: async (id) => {
    set({ error: null });
    try {
      const proyecto = await proyectosApi.archivar(id);
      set((s) => ({ proyectos: _reemplazarEnLista(s.proyectos, proyecto) }));
      return proyecto;
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    }
  },

  reactivar: async (id) => {
    set({ error: null });
    try {
      const proyecto = await proyectosApi.reactivar(id);
      set((s) => ({ proyectos: _reemplazarEnLista(s.proyectos, proyecto) }));
      return proyecto;
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    }
  },

  eliminar: async (id) => {
    set({ error: null });
    try {
      await proyectosApi.eliminar(id);
      set((s) => ({
        proyectos: s.proyectos.filter((p) => p.id !== id),
        total: Math.max(0, s.total - 1),
        proyectoActivo:
          s.proyectoActivo?.id === id ? null : s.proyectoActivo,
        idCargado: s.idCargado === id ? null : s.idCargado,
      }));
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    }
  },

  // ------------------------------------------------------------------
  // Proyecto activo (detalle)
  // ------------------------------------------------------------------
  cargarProyectoActivo: async (id, { forzar = false } = {}) => {
    // FIX (recargas duplicadas): si el MISMO proyecto ya está cargado
    // y no se pide forzar, no repetimos el GET. Las operaciones de
    // miembros actualizan el estado en línea; transferirPropiedad pasa
    // forzar=true porque cambia roles de varios miembros.
    const estado = get();
    if (
      !forzar &&
      estado.idCargado === id &&
      estado.proyectoActivo?.id === id
    ) {
      return;
    }
    set({ isLoadingActivo: true, error: null });
    try {
      const proyecto = await proyectosApi.obtener(id);
      set({ proyectoActivo: proyecto, idCargado: id });
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    } finally {
      set({ isLoadingActivo: false });
    }
  },

  limpiarProyectoActivo: () =>
    set({ proyectoActivo: null, idCargado: null }),

  // ------------------------------------------------------------------
  // Miembros ({miembro_id} de las rutas = id_usuario)
  // ------------------------------------------------------------------
  agregarMiembro: async (proyectoId, idUsuario, rol) => {
    set({ error: null });
    try {
      const miembro = await proyectosApi.agregarMiembro(proyectoId, {
        id_usuario: idUsuario,
        ...(rol ? { rol_en_proyecto: rol } : {}),
      });
      set((s) =>
        s.proyectoActivo?.id === proyectoId
          ? { proyectoActivo: _agregarOModificarMiembro(s.proyectoActivo, miembro) }
          : s
      );
      return miembro;
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    }
  },

  cambiarRolMiembro: async (proyectoId, idUsuario, rol) => {
    set({ error: null });
    try {
      const miembro = await proyectosApi.cambiarRolMiembro(
        proyectoId,
        idUsuario,
        { rol_en_proyecto: rol }
      );
      set((s) =>
        s.proyectoActivo?.id === proyectoId
          ? { proyectoActivo: _agregarOModificarMiembro(s.proyectoActivo, miembro) }
          : s
      );
      return miembro;
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    }
  },

  quitarMiembro: async (proyectoId, idUsuario) => {
    set({ error: null });
    try {
      await proyectosApi.quitarMiembro(proyectoId, idUsuario);
      set((s) =>
        s.proyectoActivo?.id === proyectoId
          ? {
              proyectoActivo: {
                ...s.proyectoActivo,
                miembros: s.proyectoActivo.miembros.filter(
                  (m) => m.id_usuario !== idUsuario
                ),
              },
            }
          : s
      );
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    }
  },

  transferirPropiedad: async (proyectoId, nuevoPropietarioId) => {
    set({ error: null });
    try {
      await proyectosApi.transferirPropiedad(proyectoId, nuevoPropietarioId);
      // Cambian los roles de AL MENOS dos miembros (nuevo propietario y
      // anterior): recarga forzada de la vista de detalle.
      await get().cargarProyectoActivo(proyectoId, { forzar: true });
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    }
  },

  limpiarError: () => set({ error: null }),
}));

// ======================================================================
// Helpers locales (fuera del store para legibilidad)
// ======================================================================
/** Inserta o reemplaza un miembro en el proyecto activo (por id_usuario). */
function _agregarOModificarMiembro(
  proyecto: ProyectoConMiembros,
  miembro: MiembroProyecto
): ProyectoConMiembros {
  const otros = proyecto.miembros.filter(
    (m) => m.id_usuario !== miembro.id_usuario
  );
  return { ...proyecto, miembros: [...otros, miembro] };
}