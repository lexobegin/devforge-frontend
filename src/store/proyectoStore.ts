// src/store/proyectoStore.ts
/**
 * Store de proyectos.
 *
 * Mantiene:
 * - Lista de proyectos del usuario.
 * - Proyecto activo (con sus miembros).
 * - Filtros de listado (archivados, etc.).
 */

import { create } from 'zustand';

import { ApiError, proyectosApi } from '@/api';
import type {
  MiembroProyecto,
  MiembroProyectoCreate,
  MiembroProyectoUpdate,
  Proyecto,
  ProyectoConMiembros,
  ProyectoCreate,
  ProyectoUpdate,
  RolEnProyecto,
} from '@/types';

// ======================================================================
// Tipos
// ======================================================================
interface ProyectoState {
  // --- Lista ---
  proyectos: Proyecto[];
  total: number;
  isLoading: boolean;
  error: string | null;
  filtros: {
    incluir_archivados: boolean;
    skip: number;
    limit: number;
  };

  // --- Proyecto activo ---
  proyectoActivo: ProyectoConMiembros | null;
  isLoadingActivo: boolean;
  idCargado: number | null; 

  // --- Acciones: lista ---
  cargar: (params?: { reset?: boolean }) => Promise<void>;
  setFiltros: (filtros: Partial<ProyectoState['filtros']>) => void;

  // --- Acciones: CRUD ---
  crear: (payload: ProyectoCreate) => Promise<Proyecto>;
  actualizar: (id: number, payload: ProyectoUpdate) => Promise<Proyecto>;
  archivar: (id: number) => Promise<void>;
  reactivar: (id: number) => Promise<void>;
  eliminar: (id: number) => Promise<void>;

  // --- Acciones: proyecto activo ---
  cargarProyectoActivo: (id: number) => Promise<void>;
  limpiarProyectoActivo: () => void;

  // --- Acciones: miembros ---
  agregarMiembro: (
    proyectoId: number,
    payload: MiembroProyectoCreate
  ) => Promise<MiembroProyecto>;
  cambiarRolMiembro: (
    proyectoId: number,
    miembroId: number,
    rol: RolEnProyecto
  ) => Promise<MiembroProyecto>;
  quitarMiembro: (proyectoId: number, miembroId: number) => Promise<void>;
  transferirPropiedad: (
    proyectoId: number,
    nuevoPropietarioId: number
  ) => Promise<void>;

  // --- Utilidades ---
  limpiarError: () => void;
}

// ======================================================================
// Store
// ======================================================================
export const useProyectoStore = create<ProyectoState>((set, get) => ({
  proyectos: [],
  total: 0,
  isLoading: false,
  error: null,
  filtros: {
    incluir_archivados: false,
    skip: 0,
    limit: 50,
  },

  proyectoActivo: null,
  isLoadingActivo: false,
  idCargado: null,

  // ------------------------------------------------------------------
  // Cargar lista
  // ------------------------------------------------------------------
  cargar: async ({ reset = false } = {}) => {
    const filtros = get().filtros;
    const skip = reset ? 0 : filtros.skip;

    set({ isLoading: true, error: null });
    try {
      const { items, total } = await proyectosApi.listar({
        skip,
        limit: filtros.limit,
        incluir_archivados: filtros.incluir_archivados,
      });

      set({
        proyectos: reset ? items : [...get().proyectos, ...items],
        total,
        isLoading: false,
        filtros: { ...filtros, skip },
      });
    } catch (err) {
      set({ isLoading: false, error: _msg(err) });
    }
  },

  setFiltros: (nuevos) => {
    set((state) => ({
      filtros: { ...state.filtros, ...nuevos },
    }));
  },

  // ------------------------------------------------------------------
  // CRUD
  // ------------------------------------------------------------------
  crear: async (payload) => {
    set({ error: null });
    try {
      const proyecto = await proyectosApi.crear(payload);
      set((state) => ({
        proyectos: [proyecto, ...state.proyectos],
        total: state.total + 1,
      }));
      return proyecto;
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    }
  },

  actualizar: async (id, payload) => {
    set({ error: null });
    try {
      const actualizado = await proyectosApi.actualizar(id, payload);
      set((state) => ({
        proyectos: state.proyectos.map((p) =>
          p.id === id ? actualizado : p
        ),
        proyectoActivo:
          state.proyectoActivo?.id === id
            ? { ...state.proyectoActivo, ...actualizado }
            : state.proyectoActivo,
      }));
      return actualizado;
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    }
  },

  archivar: async (id) => {
    try {
      const actualizado = await proyectosApi.archivar(id);
      set((state) => ({
        proyectos: state.proyectos.map((p) =>
          p.id === id ? actualizado : p
        ),
      }));
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    }
  },

  reactivar: async (id) => {
    try {
      const actualizado = await proyectosApi.reactivar(id);
      set((state) => ({
        proyectos: state.proyectos.map((p) =>
          p.id === id ? actualizado : p
        ),
      }));
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    }
  },

  eliminar: async (id) => {
    try {
      await proyectosApi.eliminar(id);
      set((state) => ({
        proyectos: state.proyectos.filter((p) => p.id !== id),
        total: Math.max(0, state.total - 1),
        proyectoActivo:
          state.proyectoActivo?.id === id ? null : state.proyectoActivo,
      }));
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    }
  },

  // ------------------------------------------------------------------
  // Proyecto activo
  // ------------------------------------------------------------------
  /*cargarProyectoActivo: async (id) => {
    set({ isLoadingActivo: true, error: null });
    try {
      const proyecto = await proyectosApi.obtener(id);
      set({ proyectoActivo: proyecto, isLoadingActivo: false });
    } catch (err) {
      set({ isLoadingActivo: false, error: _msg(err) });
    }
  },*/

  cargarProyectoActivo: async (id) => {
  const state = get();
  
  // ✅ FIX: Si ya está cargado el mismo proyecto, no hacer nada
  if (state.idCargado === id && state.proyectoActivo?.id === id) {
    return;
  }
  
  set({ isLoadingActivo: true, error: null });
  try {
    const proyecto = await proyectosApi.obtener(id);
    set({ 
      proyectoActivo: proyecto, 
      isLoadingActivo: false,
      idCargado: id,
    });
  } catch (err) {
    set({ isLoadingActivo: false, error: _msg(err) });
  }
},

  //limpiarProyectoActivo: () => set({ proyectoActivo: null }),
  limpiarProyectoActivo: () => set({ proyectoActivo: null, idCargado: null }),

  // ------------------------------------------------------------------
  // Miembros
  // ------------------------------------------------------------------
  agregarMiembro: async (proyectoId, payload) => {
    try {
      const miembro = await proyectosApi.agregarMiembro(proyectoId, payload);
      set((state) => {
        if (state.proyectoActivo?.id !== proyectoId) return {};
        return {
          proyectoActivo: {
            ...state.proyectoActivo,
            miembros: [...state.proyectoActivo.miembros, miembro],
          },
        };
      });
      return miembro;
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    }
  },

  cambiarRolMiembro: async (proyectoId, miembroId, rol) => {
    try {
      const actualizado = await proyectosApi.cambiarRolMiembro(
        proyectoId,
        miembroId,
        { rol_en_proyecto: rol } as MiembroProyectoUpdate
      );
      set((state) => {
        if (state.proyectoActivo?.id !== proyectoId) return {};
        return {
          proyectoActivo: {
            ...state.proyectoActivo,
            miembros: state.proyectoActivo.miembros.map((m) =>
              m.id === miembroId ? actualizado : m
            ),
          },
        };
      });
      return actualizado;
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    }
  },

  quitarMiembro: async (proyectoId, miembroId) => {
    try {
      await proyectosApi.quitarMiembro(proyectoId, miembroId);
      set((state) => {
        if (state.proyectoActivo?.id !== proyectoId) return {};
        return {
          proyectoActivo: {
            ...state.proyectoActivo,
            miembros: state.proyectoActivo.miembros.filter(
              (m) => m.id !== miembroId
            ),
          },
        };
      });
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    }
  },

  transferirPropiedad: async (proyectoId, nuevoPropietarioId) => {
    try {
      await proyectosApi.transferirPropiedad(proyectoId, nuevoPropietarioId);
      // Recargar el proyecto activo para tener el nuevo estado de miembros
      await get().cargarProyectoActivo(proyectoId);
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    }
  },

  // ------------------------------------------------------------------
  // Utilidades
  // ------------------------------------------------------------------
  limpiarError: () => set({ error: null }),
}));

// ======================================================================
// Helper
// ======================================================================
function _msg(err: unknown): string {
  if (err instanceof ApiError) return err.detail;
  if (err instanceof Error) return err.message;
  return 'Error inesperado';
}