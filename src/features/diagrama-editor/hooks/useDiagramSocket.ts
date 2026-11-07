// src/features/diagrama-editor/hooks/useDiagramSocket.ts
/**
 * Hook que conecta el WebSocket de colaboración al `diagramaStore` y al
 * `colaboracionStore`.
 *
 * - Abre la conexión al montar (si hay usuario y diagrama).
 * - Aplica cambios remotos al store (aplicarClaseRemota, etc.).
 * - Actualiza la lista de conectados y sus cursores.
 * - Registra los EMISORES en colaboracionStore (setEmisores) para que
 *   cualquier componente del editor pueda mandar cursor / selección /
 *   eventos por el socket sin pasar por este hook.
 * - Cierra la conexión al desmontar (y limpia emisores + presencia).
 *
 * El servidor NO persiste cambios por WS: solo retransmite y registra
 * historial (collaboration_ws.py). La persistencia real la hace el
 * cliente con las llamadas REST habituales del diagramaStore; el WS
 * notifica a los demás colaboradores.
 */

import { useCallback, useEffect, useRef } from 'react';

import { useAuthStore, useColaboracionStore, useDiagramaStore } from '@/store';
import type { ClaseUML, Id, RelacionUML } from '@/types';
import {
  createSocketClient,
  type SocketClient,
  type WSMessage,
} from '@/websocket';

// ======================================================================
// Tipos
// ======================================================================
interface UseDiagramSocketOptions {
  /** ObjectId hex del diagrama (string en el Ciclo 2). */
  diagramaId: Id | null;
  /** Si es false, el hook no abre la conexión (ej. modo solo lectura). */
  enabled?: boolean;
}

interface UseDiagramSocketReturn {
  /** Emitir al servidor que el cursor cambió. Llamar con throttle. */
  emitCursor: (x: number, y: number) => void;
  /** Emitir la selección actual. */
  emitSelection: (tipo: string, id: Id) => void;
  /** Emitir un cambio del diagrama (creación, modificación, borrado). */
  emitDiagramEvent: (type: string, payload: Record<string, unknown>) => void;
}

/** Intervalo mínimo entre emisiones de cursor (50 ms = máx 20/s). */
const CURSOR_THROTTLE_MS = 50;

// ======================================================================
// Hook
// ======================================================================
export function useDiagramSocket({
  diagramaId,
  enabled = true,
}: UseDiagramSocketOptions): UseDiagramSocketReturn {
  const clientRef = useRef<SocketClient | null>(null);

  // --- Stores (acciones estables: zustand no las cambia de identidad) ---
  const usuario = useAuthStore((s) => s.usuario);

  const setConnected = useColaboracionStore((s) => s.setConnected);
  const setConectados = useColaboracionStore((s) => s.setConectados);
  const agregarColaborador = useColaboracionStore((s) => s.agregarColaborador);
  const quitarColaborador = useColaboracionStore((s) => s.quitarColaborador);
  const actualizarCursorRemoto = useColaboracionStore((s) => s.actualizarCursor);
  const actualizarSeleccionRemota = useColaboracionStore(
    (s) => s.actualizarSeleccion
  );
  const limpiarColaboracion = useColaboracionStore((s) => s.limpiar);
  const setMiUsuarioId = useColaboracionStore((s) => s.setMiUsuarioId);
  const setEmisores = useColaboracionStore((s) => s.setEmisores);

  // Acciones del diagramaStore para aplicar cambios remotos
  const aplicarClaseRemota = useDiagramaStore((s) => s.aplicarClaseRemota);
  const aplicarClaseEliminada = useDiagramaStore((s) => s.aplicarClaseEliminada);
  const aplicarRelacionRemota = useDiagramaStore((s) => s.aplicarRelacionRemota);
  const aplicarRelacionEliminada = useDiagramaStore(
    (s) => s.aplicarRelacionEliminada
  );

  // ------------------------------------------------------------------
  // Manejo de mensajes entrantes
  // ------------------------------------------------------------------
  const handleMessage = useCallback(
    (message: WSMessage) => {
      const payload = (message.payload ?? {}) as Record<string, unknown>;
      const sender = message.sender;

      // Ignorar mensajes propios (el backend ya excluye al emisor en el
      // broadcast; esto cubre sync_snapshot y casos futuros).
      if (sender && usuario && sender.id === usuario.id) return;

      switch (message.type) {
        // ---------- Presencia ----------
        case 'join': {
          const id = sender?.id ?? (payload.id_usuario as Id | undefined);
          const nombre =
            sender?.nombre ?? (payload.nombre as string | undefined);
          if (id && nombre) {
            agregarColaborador({ id, nombre });
          }
          break;
        }

        case 'leave': {
          const id = sender?.id ?? (payload.id_usuario as Id | undefined);
          if (id) quitarColaborador(id);
          break;
        }

        case 'cursor_moved':
          if (
            sender &&
            typeof payload.x === 'number' &&
            typeof payload.y === 'number'
          ) {
            actualizarCursorRemoto(sender.id, {
              x: payload.x,
              y: payload.y,
            });
          }
          break;

        case 'selection_changed':
          if (
            sender &&
            typeof payload.tipo === 'string' &&
            typeof payload.id === 'string'
          ) {
            actualizarSeleccionRemota(sender.id, {
              tipo: payload.tipo,
              id: payload.id,
            });
          }
          break;

        case 'sync_snapshot':
          if (Array.isArray(payload.conectados)) {
            setConectados(
              payload.conectados as Array<{ id: Id; nombre: string }>
            );
          }
          break;

        // ---------- Cambios en clases ----------
        case 'class_created':
        case 'class_updated':
          if (typeof payload.id === 'string') {
            aplicarClaseRemota(payload as unknown as ClaseUML);
          }
          break;

        case 'class_deleted': {
          const claseId = (payload.id ?? payload.id_clase) as Id | undefined;
          if (typeof claseId === 'string') aplicarClaseEliminada(claseId);
          break;
        }

        // ---------- Cambios en relaciones ----------
        case 'relation_created':
        case 'relation_updated':
          if (typeof payload.id === 'string') {
            aplicarRelacionRemota(payload as unknown as RelacionUML);
          }
          break;

        case 'relation_deleted': {
          const relId = (payload.id ?? payload.id_relacion) as Id | undefined;
          if (typeof relId === 'string') aplicarRelacionEliminada(relId);
          break;
        }

        // ---------- Eventos no manejados ----------
        default:
          // Los cambios de atributos/operaciones se reflejan recargando
          // la clase completa desde el backend (para simplificar).
          // En iteraciones futuras se pueden aplicar incrementalmente.
          break;
      }
    },
    [
      usuario,
      agregarColaborador,
      quitarColaborador,
      actualizarCursorRemoto,
      actualizarSeleccionRemota,
      setConectados,
      aplicarClaseRemota,
      aplicarClaseEliminada,
      aplicarRelacionRemota,
      aplicarRelacionEliminada,
    ]
  );

  // ------------------------------------------------------------------
  // Conexión al montar / cierre al desmontar
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!diagramaId || !enabled || !usuario) return;

    setMiUsuarioId(usuario.id);

    const client = createSocketClient(diagramaId, {
      onOpen: () => {
        setConnected(true);
      },
      onClose: () => {
        setConnected(false);
      },
      onMessage: handleMessage,
      onStatusChange: (status) => {
        setConnected(status === 'connected');
      },
    });

    // Emisores disponibles para TODO el editor vía colaboracionStore
    // (el lienzo llama setEmisores una vez y emite desde cualquier lado).
    setEmisores({
      cursor: (x: number, y: number) => client.sendCursor(x, y),
      seleccion: (tipo: string, id: Id) => client.sendSelection(tipo, id),
      evento: (tipo: string, payload: Record<string, unknown>) =>
        client.sendDiagramEvent(tipo, payload),
    });

    client.connect();
    clientRef.current = client;

    return () => {
      client.close();
      clientRef.current = null;
      // Emisores fuera antes que la presencia (nadie debe emitir con el
      // socket ya cerrado).
      setEmisores({ cursor: null, seleccion: null, evento: null });
      limpiarColaboracion();
      setMiUsuarioId(null);
    };
    // handleMessage cambia con la identidad del usuario; el efecto
    // depende de usuario?.id. El client no debe recrearse por cada
    // render de handleMessage: el handler queda capturado al conectar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagramaId, enabled, usuario?.id]);

  // ------------------------------------------------------------------
  // Emisores directos (con throttle para el cursor)
  // ------------------------------------------------------------------
  const lastCursorSent = useRef(0);

  const emitCursor = useCallback((x: number, y: number) => {
    const now = Date.now();
    // Throttle: máx 20 emisiones por segundo (50 ms).
    if (now - lastCursorSent.current < CURSOR_THROTTLE_MS) return;
    lastCursorSent.current = now;
    clientRef.current?.sendCursor(x, y);
  }, []);

  const emitSelection = useCallback((tipo: string, id: Id) => {
    clientRef.current?.sendSelection(tipo, id);
  }, []);

  const emitDiagramEvent = useCallback(
    (type: string, payload: Record<string, unknown>) => {
      clientRef.current?.sendDiagramEvent(type, payload);
    },
    []
  );

  return {
    emitCursor,
    emitSelection,
    emitDiagramEvent,
  };
}

export default useDiagramSocket;