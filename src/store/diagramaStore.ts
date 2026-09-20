// src/store/diagramaStore.ts
/**
 * Store del diagrama UML.
 *
 * Este es el store más complejo porque maneja el estado del lienzo:
 * - Metadata del diagrama.
 * - Lista de clases, atributos, operaciones, interfaces, relaciones.
 * - Selección actual (para el panel de propiedades).
 * - Sincronización con el backend tras cada cambio.
 *
 * Convención: los métodos de mutación actualizan el estado local de
 * inmediato (optimistic UI) y luego sincronizan con el backend. Si el
 * backend falla, se hace rollback del estado local.
 */

import { create } from 'zustand';

import { diagramasApi, ApiError } from '@/api';
import type {
  AtributoUML,
  AtributoUMLCreate,
  AtributoUMLUpdate,
  ClaseUML,
  ClaseUMLCreate,
  ClaseUMLUpdate,
  Diagrama,
  DiagramaCompleto,
  InterfazUML,
  InterfazUMLCreate,
  InterfazUMLUpdate,
  OperacionUML,
  OperacionUMLCreate,
  OperacionUMLUpdate,
  RelacionUML,
  RelacionUMLCreate,
  RelacionUMLUpdate,
} from '@/types';

// ======================================================================
// Tipos
// ======================================================================
export type ElementoSeleccionado =
  | { tipo: 'clase'; id: number }
  | { tipo: 'interfaz'; id: number }
  | { tipo: 'relacion'; id: number }
  | { tipo: 'diagrama'; id: number }
  | null;

interface DiagramaState {
  // --- Metadata ---
  diagrama: Diagrama | null;
  clases: ClaseUML[];
  interfaces: InterfazUML[];
  relaciones: RelacionUML[];

  // --- Selección ---
  seleccion: ElementoSeleccionado;

  // --- UI state del editor ---
  modoEditor: 'select' | 'add-class' | 'add-relation' | 'add-interface';
  haycambiosSinGuardar: boolean;
  historialLocal: { undo: unknown[]; redo: unknown[] };

  // --- Loading ---
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // --- Acciones: carga ---
  cargarDiagrama: (id: number) => Promise<void>;
  limpiar: () => void;

  // --- Acciones: selección y modo ---
  seleccionar: (elemento: ElementoSeleccionado) => void;
  setModoEditor: (modo: DiagramaState['modoEditor']) => void;

  // --- Acciones: clases ---
  crearClase: (payload: ClaseUMLCreate) => Promise<ClaseUML>;
  actualizarClase: (id: number, payload: ClaseUMLUpdate) => Promise<void>;
  eliminarClase: (id: number) => Promise<void>;
  moverClase: (id: number, pos_x: number, pos_y: number) => void;

  // --- Acciones: atributos ---
  agregarAtributo: (
    claseId: number,
    payload: AtributoUMLCreate
  ) => Promise<AtributoUML>;
  actualizarAtributo: (
    claseId: number,
    atributoId: number,
    payload: AtributoUMLUpdate
  ) => Promise<void>;
  eliminarAtributo: (claseId: number, atributoId: number) => Promise<void>;

  // --- Acciones: operaciones ---
  agregarOperacion: (
    claseId: number,
    payload: OperacionUMLCreate
  ) => Promise<OperacionUML>;
  actualizarOperacion: (
    claseId: number,
    operacionId: number,
    payload: OperacionUMLUpdate
  ) => Promise<void>;
  eliminarOperacion: (claseId: number, operacionId: number) => Promise<void>;

  // --- Acciones: relaciones ---
  crearRelacion: (payload: RelacionUMLCreate) => Promise<RelacionUML>;
  actualizarRelacion: (
    id: number,
    payload: RelacionUMLUpdate
  ) => Promise<void>;
  eliminarRelacion: (id: number) => Promise<void>;

  // --- Acciones: interfaces ---
  crearInterfaz: (payload: InterfazUMLCreate) => Promise<InterfazUML>;
  actualizarInterfaz: (
    id: number,
    payload: InterfazUMLUpdate
  ) => Promise<void>;
  eliminarInterfaz: (id: number) => Promise<void>;

  // --- Acciones: desde WebSocket (aplican cambios de otros colaboradores) ---
  aplicarClaseRemota: (clase: ClaseUML) => void;
  aplicarClaseEliminada: (claseId: number) => void;
  aplicarRelacionRemota: (relacion: RelacionUML) => void;
  aplicarRelacionEliminada: (relacionId: number) => void;

  // --- Utilidades ---
  getClase: (id: number) => ClaseUML | undefined;
  limpiarError: () => void;
}

// ======================================================================
// Store
// ======================================================================
export const useDiagramaStore = create<DiagramaState>((set, get) => ({
  // --- Estado inicial ---
  diagrama: null,
  clases: [],
  interfaces: [],
  relaciones: [],
  seleccion: null,
  modoEditor: 'select',
  haycambiosSinGuardar: false,
  historialLocal: { undo: [], redo: [] },
  isLoading: false,
  isSaving: false,
  error: null,

  // ------------------------------------------------------------------
  // Carga
  // ------------------------------------------------------------------
  cargarDiagrama: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const completo: DiagramaCompleto = await diagramasApi.obtenerCompleto(id);
      set({
        diagrama: {
          id: completo.id,
          id_proyecto: completo.id_proyecto,
          nombre: completo.nombre,
          version_uml: completo.version_uml,
          numero_version: completo.numero_version,
          id_creador: completo.id_creador,
          created_at: completo.created_at,
          updated_at: completo.updated_at,
        },
        clases: completo.clases,
        interfaces: completo.interfaces,
        relaciones: completo.relaciones,
        seleccion: null,
        isLoading: false,
        haycambiosSinGuardar: false,
      });
    } catch (err) {
      set({ isLoading: false, error: _msg(err) });
    }
  },

  limpiar: () =>
    set({
      diagrama: null,
      clases: [],
      interfaces: [],
      relaciones: [],
      seleccion: null,
      modoEditor: 'select',
      haycambiosSinGuardar: false,
      error: null,
    }),

  // ------------------------------------------------------------------
  // Selección / modo
  // ------------------------------------------------------------------
  seleccionar: (elemento) => set({ seleccion: elemento }),
  setModoEditor: (modo) => set({ modoEditor: modo }),

  // ------------------------------------------------------------------
  // Clases
  // ------------------------------------------------------------------
  crearClase: async (payload) => {
    const diagrama = get().diagrama;
    if (!diagrama) throw new Error('No hay diagrama cargado');

    set({ isSaving: true, error: null });
    try {
      const clase = await diagramasApi.crearClase(diagrama.id, payload);
      set((state) => ({
        clases: [...state.clases, clase],
        isSaving: false,
        haycambiosSinGuardar: true,
      }));
      return clase;
    } catch (err) {
      set({ isSaving: false, error: _msg(err) });
      throw err;
    }
  },

  actualizarClase: async (id, payload) => {
    const anterior = get().clases.find((c) => c.id === id);
    if (!anterior) return;
    console.log('[actualizarClase] payload:', payload); 
    // Optimistic update
    set((state) => ({
      clases: state.clases.map((c) =>
        c.id === id ? { ...c, ...payload } : c
      ),
    }));

    try {
      const actualizada = await diagramasApi.actualizarClase(id, payload);
      set((state) => ({
        clases: state.clases.map((c) =>
          c.id === id ? actualizada : c
        ),
      }));
    } catch (err) {
      // Rollback
      set((state) => ({
        clases: state.clases.map((c) => (c.id === id ? anterior : c)),
        error: _msg(err),
      }));
      throw err;
    }
  },

  eliminarClase: async (id) => {
    const anterior = get().clases;
    const relacionesAnteriores = get().relaciones;

    // Optimistic
    set((state) => ({
      clases: state.clases.filter((c) => c.id !== id),
      relaciones: state.relaciones.filter(
        (r) => r.id_clase_origen !== id && r.id_clase_destino !== id
      ),
      seleccion:
        state.seleccion?.tipo === 'clase' && state.seleccion.id === id
          ? null
          : state.seleccion,
    }));

    try {
      await diagramasApi.eliminarClase(id);
    } catch (err) {
      // Rollback
      set({ clases: anterior, relaciones: relacionesAnteriores, error: _msg(err) });
      throw err;
    }
  },

  moverClase: (id, pos_x, pos_y) => {
    // Solo actualiza el estado local. El guardado real lo hace el
    // componente que maneja el drag stop (con debounce).
    set((state) => ({
      clases: state.clases.map((c) =>
        c.id === id ? { ...c, pos_x, pos_y } : c
      ),
    }));
  },

  // ------------------------------------------------------------------
  // Atributos
  // ------------------------------------------------------------------
  agregarAtributo: async (claseId, payload) => {
    const diagrama = get().diagrama;
    if (!diagrama) throw new Error('No hay diagrama cargado');

    set({ isSaving: true, error: null });
    try {
      const atributo = await diagramasApi.agregarAtributo(claseId, payload);
      set((state) => ({
        clases: state.clases.map((c) =>
          c.id === claseId
            ? { ...c, atributos: [...c.atributos, atributo] }
            : c
        ),
        isSaving: false,
      }));
      return atributo;
    } catch (err) {
      set({ isSaving: false, error: _msg(err) });
      throw err;
    }
  },

  actualizarAtributo: async (claseId, atributoId, payload) => {
    try {
      const actualizado = await diagramasApi.actualizarAtributo(
        atributoId,
        payload
      );
      set((state) => ({
        clases: state.clases.map((c) =>
          c.id === claseId
            ? {
                ...c,
                atributos: c.atributos.map((a) =>
                  a.id === atributoId ? actualizado : a
                ),
              }
            : c
        ),
      }));
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    }
  },

  eliminarAtributo: async (claseId, atributoId) => {
    const anterior = get().clases;
    set((state) => ({
      clases: state.clases.map((c) =>
        c.id === claseId
          ? {
              ...c,
              atributos: c.atributos.filter((a) => a.id !== atributoId),
            }
          : c
      ),
    }));
    try {
      await diagramasApi.eliminarAtributo(atributoId);
    } catch (err) {
      set({ clases: anterior, error: _msg(err) });
      throw err;
    }
  },

  // ------------------------------------------------------------------
  // Operaciones
  // ------------------------------------------------------------------
  agregarOperacion: async (claseId, payload) => {
    set({ isSaving: true, error: null });
    try {
      const operacion = await diagramasApi.agregarOperacion(claseId, payload);
      set((state) => ({
        clases: state.clases.map((c) =>
          c.id === claseId
            ? { ...c, operaciones: [...c.operaciones, operacion] }
            : c
        ),
        isSaving: false,
      }));
      return operacion;
    } catch (err) {
      set({ isSaving: false, error: _msg(err) });
      throw err;
    }
  },

  actualizarOperacion: async (claseId, operacionId, payload) => {
    try {
      const actualizada = await diagramasApi.actualizarOperacion(
        operacionId,
        payload
      );
      set((state) => ({
        clases: state.clases.map((c) =>
          c.id === claseId
            ? {
                ...c,
                operaciones: c.operaciones.map((o) =>
                  o.id === operacionId ? actualizada : o
                ),
              }
            : c
        ),
      }));
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    }
  },

  eliminarOperacion: async (claseId, operacionId) => {
    const anterior = get().clases;
    set((state) => ({
      clases: state.clases.map((c) =>
        c.id === claseId
          ? {
              ...c,
              operaciones: c.operaciones.filter((o) => o.id !== operacionId),
            }
          : c
      ),
    }));
    try {
      await diagramasApi.eliminarOperacion(operacionId);
    } catch (err) {
      set({ clases: anterior, error: _msg(err) });
      throw err;
    }
  },

  // ------------------------------------------------------------------
  // Relaciones
  // ------------------------------------------------------------------
  crearRelacion: async (payload) => {
    const diagrama = get().diagrama;
    if (!diagrama) throw new Error('No hay diagrama cargado');

    set({ isSaving: true, error: null });
    try {
      const relacion = await diagramasApi.crearRelacion(diagrama.id, payload);
      set((state) => ({
        relaciones: [...state.relaciones, relacion],
        isSaving: false,
      }));
      return relacion;
    } catch (err) {
      set({ isSaving: false, error: _msg(err) });
      throw err;
    }
  },

  actualizarRelacion: async (id, payload) => {
    try {
      const actualizada = await diagramasApi.actualizarRelacion(id, payload);
      set((state) => ({
        relaciones: state.relaciones.map((r) =>
          r.id === id ? actualizada : r
        ),
      }));
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    }
  },

  eliminarRelacion: async (id) => {
    const anterior = get().relaciones;
    set((state) => ({
      relaciones: state.relaciones.filter((r) => r.id !== id),
      seleccion:
        state.seleccion?.tipo === 'relacion' && state.seleccion.id === id
          ? null
          : state.seleccion,
    }));
    try {
      await diagramasApi.eliminarRelacion(id);
    } catch (err) {
      set({ relaciones: anterior, error: _msg(err) });
      throw err;
    }
  },

  // ------------------------------------------------------------------
  // Interfaces
  // ------------------------------------------------------------------
  crearInterfaz: async (payload) => {
    const diagrama = get().diagrama;
    if (!diagrama) throw new Error('No hay diagrama cargado');

    const interfaz = await diagramasApi.crearInterfaz(diagrama.id, payload);
    set((state) => ({ interfaces: [...state.interfaces, interfaz] }));
    return interfaz;
  },

  actualizarInterfaz: async (id, payload) => {
    const actualizada = await diagramasApi.actualizarInterfaz(id, payload);
    set((state) => ({
      interfaces: state.interfaces.map((i) =>
        i.id === id ? actualizada : i
      ),
    }));
  },

  eliminarInterfaz: async (id) => {
    const anterior = get().interfaces;
    set((state) => ({
      interfaces: state.interfaces.filter((i) => i.id !== id),
    }));
    try {
      await diagramasApi.eliminarInterfaz(id);
    } catch (err) {
      set({ interfaces: anterior, error: _msg(err) });
      throw err;
    }
  },

  // ------------------------------------------------------------------
  // Cambios remotos (desde WebSocket)
  // ------------------------------------------------------------------
  aplicarClaseRemota: (clase) =>
    set((state) => ({
      clases: state.clases.some((c) => c.id === clase.id)
        ? state.clases.map((c) => (c.id === clase.id ? clase : c))
        : [...state.clases, clase],
    })),

  aplicarClaseEliminada: (claseId) =>
    set((state) => ({
      clases: state.clases.filter((c) => c.id !== claseId),
      relaciones: state.relaciones.filter(
        (r) => r.id_clase_origen !== claseId && r.id_clase_destino !== claseId
      ),
    })),

  aplicarRelacionRemota: (relacion) =>
    set((state) => ({
      relaciones: state.relaciones.some((r) => r.id === relacion.id)
        ? state.relaciones.map((r) =>
            r.id === relacion.id ? relacion : r
          )
        : [...state.relaciones, relacion],
    })),

  aplicarRelacionEliminada: (relacionId) =>
    set((state) => ({
      relaciones: state.relaciones.filter((r) => r.id !== relacionId),
    })),

  // ------------------------------------------------------------------
  // Utilidades
  // ------------------------------------------------------------------
  getClase: (id) => get().clases.find((c) => c.id === id),
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