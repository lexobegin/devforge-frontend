// src/store/diagramaStore.ts
/**
 * Store del editor de diagramas UML (zustand).
 *
 * Responsabilidades:
 * - Cargar el diagrama completo (GET /diagramas/{id}/completo) y
 *   repartir clases / interfaces / relaciones en colecciones planas.
 * - CRUD de clases, atributos, operaciones, relaciones e interfaces
 *   contra `diagramasApi` (convención Ciclo 2: TODO embebido — los ids
 *   de clase/atributo/... son uuid str, el del diagrama es ObjectId hex).
 * - Actualizaciones OPTIMISTAS con rollback: primero se cambia el estado
 *   local (el lienzo responde al instante), después se persiste por
 *   REST; si la API falla, se restaura el estado previo.
 * - Aplicar cambios REMOTOS que llegan por el WebSocket de colaboración
 *   (aplicar*Remota) SIN marcar cambios pendientes de guardar.
 *
 * El historial fino (undo/redo del editor) vive en
 * features/diagrama-editor/hooks/useDiagramHistory (F52); acá queda un
 * historial local simple por si el editor quiere integrarlo temprano.
 */

import { create } from 'zustand';

import { ApiError, diagramasApi } from '@/api';
import type {
  AtributoUMLCreate,
  AtributoUMLUpdate,
  ClaseUML,
  ClaseUMLCreate,
  ClaseUMLUpdate,
  Diagrama,
  Id,
  InterfazUML,
  InterfazUMLCreate,
  InterfazUMLUpdate,
  OperacionUMLCreate,
  OperacionUMLUpdate,
  RelacionUML,
  RelacionUMLCreate,
  RelacionUMLUpdate,
} from '@/types';

// ======================================================================
// Tipos exportados
// ======================================================================
/** Elemento seleccionado en el lienzo (id uuid de embebido u ObjectId). */
export type ElementoSeleccionado =
  | { tipo: 'clase' | 'interfaz' | 'relacion' | 'diagrama'; id: Id }
  | null;

export type ModoEditor =
  | 'select'
  | 'add-class'
  | 'add-relation'
  | 'add-interface';

/** Snapshot local para el historial simple de deshacer/rehacer. */
interface SnapshotDiagrama {
  clases: ClaseUML[];
  interfaces: InterfazUML[];
  relaciones: RelacionUML[];
}

// ======================================================================
// Estado
// ======================================================================
interface DiagramaState {
  diagrama: Diagrama | null;
  clases: ClaseUML[];
  interfaces: InterfazUML[];
  relaciones: RelacionUML[];
  seleccion: ElementoSeleccionado;
  modoEditor: ModoEditor;
  /** Hay cambios locales que el editor aún no marcó como guardados. */
  haycambiosSinGuardar: boolean;
  historialLocal: {
    undo: SnapshotDiagrama[];
    redo: SnapshotDiagrama[];
  };
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Carga / sesión del editor
  cargarDiagrama: (id: Id) => Promise<void>;
  limpiarDiagrama: () => void;
  setSeleccion: (seleccion: ElementoSeleccionado) => void;
  setModoEditor: (modo: ModoEditor) => void;
  marcarGuardado: () => void;
  deshacerLocal: () => void;
  rehacerLocal: () => void;

  // Clases
  crearClase: (payload: ClaseUMLCreate) => Promise<ClaseUML>;
  actualizarClase: (claseId: Id, payload: ClaseUMLUpdate) => Promise<void>;
  eliminarClase: (claseId: Id) => Promise<void>;
  /** Solo cambia la posición en local; el componente persiste con debounce. */
  moverClase: (claseId: Id, pos_x: number, pos_y: number) => void;

  // Atributos
  agregarAtributo: (claseId: Id, payload: AtributoUMLCreate) => Promise<void>;
  actualizarAtributo: (atributoId: Id, payload: AtributoUMLUpdate) => Promise<void>;
  eliminarAtributo: (atributoId: Id) => Promise<void>;

  // Operaciones
  agregarOperacion: (claseId: Id, payload: OperacionUMLCreate) => Promise<void>;
  actualizarOperacion: (operacionId: Id, payload: OperacionUMLUpdate) => Promise<void>;
  eliminarOperacion: (operacionId: Id) => Promise<void>;

  // Relaciones
  crearRelacion: (payload: RelacionUMLCreate) => Promise<RelacionUML>;
  actualizarRelacion: (relacionId: Id, payload: RelacionUMLUpdate) => Promise<void>;
  eliminarRelacion: (relacionId: Id) => Promise<void>;

  // Interfaces
  crearInterfaz: (payload: InterfazUMLCreate) => Promise<InterfazUML>;
  actualizarInterfaz: (interfazId: Id, payload: InterfazUMLUpdate) => Promise<void>;
  eliminarInterfaz: (interfazId: Id) => Promise<void>;

  // Cambios remotos (WebSocket)
  aplicarClaseRemota: (clase: ClaseUML) => void;
  aplicarClaseEliminada: (claseId: Id) => void;
  aplicarRelacionRemota: (relacion: RelacionUML) => void;
  aplicarRelacionEliminada: (relacionId: Id) => void;

  // Utilidades
  getClase: (claseId: Id) => ClaseUML | undefined;
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

function _snapshot(estado: DiagramaState): SnapshotDiagrama {
  return {
    clases: estado.clases,
    interfaces: estado.interfaces,
    relaciones: estado.relaciones,
  };
}

/** Guarda el estado previo en undo y vacía redo (tras un cambio local). */
function _empujarHistorial(
  set: (
    partial:
      | Partial<DiagramaState>
      | ((state: DiagramaState) => Partial<DiagramaState>)
  ) => void,
  previo: SnapshotDiagrama
): void {
  set((s) => ({
    historialLocal: {
      undo: [...s.historialLocal.undo.slice(-49), previo],
      redo: [],
    },
  }));
}

/** Reemplaza una clase embebida en la colección por id. */
function _reemplazarClase(
  clases: ClaseUML[],
  claseId: Id,
  cambios: Partial<ClaseUML>
): ClaseUML[] {
  return clases.map((c) => (c.id === claseId ? { ...c, ...cambios } : c));
}

/** Inserta o reemplaza un elemento de la colección (upsert remoto). */
function _upsert<T extends { id: Id }>(lista: T[], elemento: T): T[] {
  const idx = lista.findIndex((e) => e.id === elemento.id);
  if (idx === -1) return [...lista, elemento];
  const copia = [...lista];
  copia[idx] = elemento;
  return copia;
}

/** Quita una clase y, en cascada, las relaciones que la referencian. */
function _quitarClaseEnCascada(
  clases: ClaseUML[],
  relaciones: RelacionUML[],
  claseId: Id
): Pick<SnapshotDiagrama, 'clases' | 'relaciones'> {
  return {
    clases: clases.filter((c) => c.id !== claseId),
    relaciones: relaciones.filter(
      (r) => r.id_clase_origen !== claseId && r.id_clase_destino !== claseId
    ),
  };
}

// ======================================================================
// Store
// ======================================================================
export const useDiagramaStore = create<DiagramaState>()((set, get) => ({
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
  // Carga / sesión del editor
  // ------------------------------------------------------------------
  cargarDiagrama: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const completo = await diagramasApi.obtenerCompleto(id);
      const { clases, interfaces, relaciones, ...diagrama } = completo;
      set({
        diagrama,
        clases,
        interfaces,
        relaciones,
        seleccion: null,
        modoEditor: 'select',
        haycambiosSinGuardar: false,
        historialLocal: { undo: [], redo: [] },
      });
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  limpiarDiagrama: () =>
    set({
      diagrama: null,
      clases: [],
      interfaces: [],
      relaciones: [],
      seleccion: null,
      modoEditor: 'select',
      haycambiosSinGuardar: false,
      historialLocal: { undo: [], redo: [] },
      error: null,
    }),

  setSeleccion: (seleccion) => set({ seleccion }),
  setModoEditor: (modoEditor) => set({ modoEditor }),

  marcarGuardado: () => set({ haycambiosSinGuardar: false }),

  deshacerLocal: () => {
    const { historialLocal } = get();
    const previo = historialLocal.undo[historialLocal.undo.length - 1];
    if (!previo) return;
    const actual = _snapshot(get());
    set({
      clases: previo.clases,
      interfaces: previo.interfaces,
      relaciones: previo.relaciones,
      historialLocal: {
        undo: historialLocal.undo.slice(0, -1),
        redo: [...historialLocal.redo, actual],
      },
      haycambiosSinGuardar: true,
    });
  },

  rehacerLocal: () => {
    const { historialLocal } = get();
    const siguiente = historialLocal.redo[historialLocal.redo.length - 1];
    if (!siguiente) return;
    const actual = _snapshot(get());
    set({
      clases: siguiente.clases,
      interfaces: siguiente.interfaces,
      relaciones: siguiente.relaciones,
      historialLocal: {
        undo: [...historialLocal.undo, actual],
        redo: historialLocal.redo.slice(0, -1),
      },
      haycambiosSinGuardar: true,
    });
  },

  // ------------------------------------------------------------------
  // Clases
  // ------------------------------------------------------------------
  crearClase: async (payload) => {
    const diagrama = get().diagrama;
    if (!diagrama) {
      throw new Error('No hay diagrama cargado');
    }
    set({ isSaving: true, error: null });
    try {
      const clase = await diagramasApi.crearClase(diagrama.id, payload);
      _empujarHistorial(set, _snapshot(get()));
      set((s) => ({ clases: [...s.clases, clase], haycambiosSinGuardar: true }));
      return clase;
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  /**
   * Optimista: se aplica en local, se persiste por REST y, si falla,
   * se restaura el estado previo (el lienzo nunca se queda a medias).
   */
  actualizarClase: async (claseId, payload) => {
    const previo = _snapshot(get());
    set((s) => ({
      clases: _reemplazarClase(s.clases, claseId, payload as Partial<ClaseUML>),
      haycambiosSinGuardar: true,
    }));
    set({ isSaving: true, error: null });
    try {
      await diagramasApi.actualizarClase(claseId, payload);
      _empujarHistorial(set, previo);
    } catch (err) {
      set({ clases: previo.clases, error: _msg(err) });
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  eliminarClase: async (claseId) => {
    // Cascada local: las relaciones hacia/desde la clase dejan de existir.
    const previo = _snapshot(get());
    const { clases, relaciones } = _quitarClaseEnCascada(
      get().clases,
      get().relaciones,
      claseId
    );
    set((s) => ({
      clases,
      relaciones,
      // Si se borró lo seleccionado, limpiar la selección.
      seleccion:
        s.seleccion?.id === claseId ? null : s.seleccion,
      haycambiosSinGuardar: true,
    }));
    set({ isSaving: true, error: null });
    try {
      await diagramasApi.eliminarClase(claseId);
      _empujarHistorial(set, previo);
    } catch (err) {
      set({
        clases: previo.clases,
        relaciones: previo.relaciones,
        error: _msg(err),
      });
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  /** Solo local: el componente llama a actualizarClase con debounce. */
  moverClase: (claseId, pos_x, pos_y) =>
    set((s) => ({
      clases: _reemplazarClase(s.clases, claseId, { pos_x, pos_y }),
      haycambiosSinGuardar: true,
    })),

  // ------------------------------------------------------------------
  // Atributos
  // ------------------------------------------------------------------
  agregarAtributo: async (claseId, payload) => {
    const diagrama = get().diagrama;
    if (!diagrama) throw new Error('No hay diagrama cargado');
    set({ isSaving: true, error: null });
    try {
      const atributo = await diagramasApi.agregarAtributo(claseId, payload);
      set((s) => ({
        clases: s.clases.map((c) =>
          c.id === claseId
            ? { ...c, atributos: [...c.atributos, atributo] }
            : c
        ),
        haycambiosSinGuardar: true,
      }));
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  actualizarAtributo: async (atributoId, payload) => {
    set({ isSaving: true, error: null });
    try {
      const actualizado = await diagramasApi.actualizarAtributo(
        atributoId,
        payload
      );
      set((s) => ({
        clases: s.clases.map((c) => ({
          ...c,
          atributos: c.atributos.map((a) =>
            a.id === atributoId ? actualizado : a
          ),
        })),
        haycambiosSinGuardar: true,
      }));
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  eliminarAtributo: async (atributoId) => {
    set({ isSaving: true, error: null });
    try {
      await diagramasApi.eliminarAtributo(atributoId);
      set((s) => ({
        clases: s.clases.map((c) => ({
          ...c,
          atributos: c.atributos.filter((a) => a.id !== atributoId),
        })),
        haycambiosSinGuardar: true,
      }));
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  // ------------------------------------------------------------------
  // Operaciones
  // ------------------------------------------------------------------
  agregarOperacion: async (claseId, payload) => {
    const diagrama = get().diagrama;
    if (!diagrama) throw new Error('No hay diagrama cargado');
    set({ isSaving: true, error: null });
    try {
      const operacion = await diagramasApi.agregarOperacion(claseId, payload);
      set((s) => ({
        clases: s.clases.map((c) =>
          c.id === claseId
            ? { ...c, operaciones: [...c.operaciones, operacion] }
            : c
        ),
        haycambiosSinGuardar: true,
      }));
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  actualizarOperacion: async (operacionId, payload) => {
    set({ isSaving: true, error: null });
    try {
      const actualizada = await diagramasApi.actualizarOperacion(
        operacionId,
        payload
      );
      set((s) => ({
        clases: s.clases.map((c) => ({
          ...c,
          operaciones: c.operaciones.map((o) =>
            o.id === operacionId ? actualizada : o
          ),
        })),
        haycambiosSinGuardar: true,
      }));
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  eliminarOperacion: async (operacionId) => {
    set({ isSaving: true, error: null });
    try {
      await diagramasApi.eliminarOperacion(operacionId);
      set((s) => ({
        clases: s.clases.map((c) => ({
          ...c,
          operaciones: c.operaciones.filter((o) => o.id !== operacionId),
        })),
        haycambiosSinGuardar: true,
      }));
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  // ------------------------------------------------------------------
  // Relaciones
  // ------------------------------------------------------------------
  crearRelacion: async (payload) => {
    const diagrama = get().diagrama;
    if (!diagrama) throw new Error('No hay diagrama cargado');
    const previo = _snapshot(get());
    set({ isSaving: true, error: null });
    try {
      const relacion = await diagramasApi.crearRelacion(diagrama.id, payload);
      _empujarHistorial(set, previo);
      set((s) => ({
        relaciones: [...s.relaciones, relacion],
        haycambiosSinGuardar: true,
      }));
      return relacion;
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  actualizarRelacion: async (relacionId, payload) => {
    const previo = _snapshot(get());
    set((s) => ({
      relaciones: s.relaciones.map((r) =>
        r.id === relacionId ? { ...r, ...payload } : r
      ),
      haycambiosSinGuardar: true,
    }));
    set({ isSaving: true, error: null });
    try {
      await diagramasApi.actualizarRelacion(relacionId, payload);
      _empujarHistorial(set, previo);
    } catch (err) {
      set({ relaciones: previo.relaciones, error: _msg(err) });
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  eliminarRelacion: async (relacionId) => {
    const previo = _snapshot(get());
    set((s) => ({
      relaciones: s.relaciones.filter((r) => r.id !== relacionId),
      seleccion:
        s.seleccion?.id === relacionId ? null : s.seleccion,
      haycambiosSinGuardar: true,
    }));
    set({ isSaving: true, error: null });
    try {
      await diagramasApi.eliminarRelacion(relacionId);
      _empujarHistorial(set, previo);
    } catch (err) {
      set({ relaciones: previo.relaciones, error: _msg(err) });
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  // ------------------------------------------------------------------
  // Interfaces
  // ------------------------------------------------------------------
  crearInterfaz: async (payload) => {
    const diagrama = get().diagrama;
    if (!diagrama) throw new Error('No hay diagrama cargado');
    const previo = _snapshot(get());
    set({ isSaving: true, error: null });
    try {
      const interfaz = await diagramasApi.crearInterfaz(diagrama.id, payload);
      _empujarHistorial(set, previo);
      set((s) => ({
        interfaces: [...s.interfaces, interfaz],
        haycambiosSinGuardar: true,
      }));
      return interfaz;
    } catch (err) {
      set({ error: _msg(err) });
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  actualizarInterfaz: async (interfazId, payload) => {
    const previo = _snapshot(get());
    set((s) => ({
      interfaces: s.interfaces.map((i) =>
        i.id === interfazId ? { ...i, ...payload } : i
      ),
      haycambiosSinGuardar: true,
    }));
    set({ isSaving: true, error: null });
    try {
      await diagramasApi.actualizarInterfaz(interfazId, payload);
      _empujarHistorial(set, previo);
    } catch (err) {
      set({ interfaces: previo.interfaces, error: _msg(err) });
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  eliminarInterfaz: async (interfazId) => {
    const previo = _snapshot(get());
    set((s) => ({
      interfaces: s.interfaces.filter((i) => i.id !== interfazId),
      seleccion: s.seleccion?.id === interfazId ? null : s.seleccion,
      haycambiosSinGuardar: true,
    }));
    set({ isSaving: true, error: null });
    try {
      await diagramasApi.eliminarInterfaz(interfazId);
      _empujarHistorial(set, previo);
    } catch (err) {
      set({ interfaces: previo.interfaces, error: _msg(err) });
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  // ------------------------------------------------------------------
  // Cambios remotos (WebSocket — NO marcan cambios pendientes)
  // ------------------------------------------------------------------
  aplicarClaseRemota: (clase) =>
    set((s) => ({ clases: _upsert(s.clases, clase) })),

  aplicarClaseEliminada: (claseId) =>
    set((s) => {
      const { clases, relaciones } = _quitarClaseEnCascada(
        s.clases,
        s.relaciones,
        claseId
      );
      return {
        clases,
        relaciones,
        seleccion: s.seleccion?.id === claseId ? null : s.seleccion,
      };
    }),

  aplicarRelacionRemota: (relacion) =>
    set((s) => ({ relaciones: _upsert(s.relaciones, relacion) })),

  aplicarRelacionEliminada: (relacionId) =>
    set((s) => ({
      relaciones: s.relaciones.filter((r) => r.id !== relacionId),
      seleccion: s.seleccion?.id === relacionId ? null : s.seleccion,
    })),

  // ------------------------------------------------------------------
  // Utilidades
  // ------------------------------------------------------------------
  getClase: (claseId) => get().clases.find((c) => c.id === claseId),

  limpiarError: () => set({ error: null }),
}));