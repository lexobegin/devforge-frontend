// src/features/diagrama-editor/hooks/useDiagramSocket.ts
/**
 * Hook que conecta el WebSocket de colaboración al `diagramaStore` y al
 * `colaboracionStore`.
 *
 * - Abre la conexión al montar.
 * - Envía eventos al servidor cuando el usuario hace cambios.
 * - Aplica cambios remotos al store (con `aplicarClaseRemota`, etc.).
 * - Actualiza la lista de conectados y sus cursores.
 * - Cierra la conexión al desmontar.
 *
 * El servidor NO persiste cambios por WS: solo retransmite. La persistencia
 * real la hace el cliente con las llamadas REST habituales; el WS notifica
 * a los demás colaboradores.
 */

import { useCallback, useEffect, useRef } from 'react';

import { useAuthStore, useColaboracionStore, useDiagramaStore } from '@/store';
import {
  createSocketClient,
  type SocketClient,
  type WSMessage,
} from '@/websocket';

// ======================================================================
// Tipos
// ======================================================================
interface UseDiagramSocketOptions {
  diagramaId: number | null;
  /** Si es false, el hook no abre la conexión (ej. modo LECTOR sin cambios). */
  enabled?: boolean;
}

interface UseDiagramSocketReturn {
  /** Emitir al servidor que el cursor cambió. Se llama con throttle. */
  emitCursor: (x: number, y: number) => void;
  /** Emitir la selección actual. */
  emitSelection: (tipo: string, id: number) => void;
  /** Emitir un cambio del diagrama (creación, modificación, borrado). */
  emitDiagramEvent: (type: string, payload: Record<string, unknown>) => void;
}

// ======================================================================
// Hook
// ======================================================================
export function useDiagramSocket({
  diagramaId,
  enabled = true,
}: UseDiagramSocketOptions): UseDiagramSocketReturn {
  const clientRef = useRef<SocketClient | null>(null);

  // --- Stores ---
  const usuario = useAuthStore((s) => s.usuario);

  const setConnected = useColaboracionStore((s) => s.setConnected);
  const setConectados = useColaboracionStore((s) => s.setConectados);
  const agregarColaborador = useColaboracionStore((s) => s.agregarColaborador);
  const quitarColaborador = useColaboracionStore((s) => s.quitarColaborador);
  const actualizarCursorRemoto = useColaboracionStore(
    (s) => s.actualizarCursor
  );
  const actualizarSeleccionRemota = useColaboracionStore(
    (s) => s.actualizarSeleccion
  );
  const limpiarColaboracion = useColaboracionStore((s) => s.limpiar);
  const setMiUsuarioId = useColaboracionStore((s) => s.setMiUsuarioId);

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
      const payload = message.payload ?? {};
      const sender = message.sender;

      // Ignorar mensajes propios (por robustez: el backend ya excluye al emisor)
      if (sender && usuario && sender.id === usuario.id) return;

      switch (message.type) {
        // ---------- Presencia ----------
        case 'join':
          if (sender) {
            agregarColaborador({ id: sender.id, nombre: sender.nombre });
          }
          break;

        case 'leave':
          if (sender) {
            quitarColaborador(sender.id);
          }
          break;

        case 'cursor_moved':
          if (sender && typeof payload.x === 'number' && typeof payload.y === 'number') {
            actualizarCursorRemoto(sender.id, {
              x: payload.x as number,
              y: payload.y as number,
            });
          }
          break;

        case 'selection_changed':
          if (
            sender &&
            typeof payload.tipo === 'string' &&
            typeof payload.id === 'number'
          ) {
            actualizarSeleccionRemota(sender.id, {
              tipo: payload.tipo as string,
              id: payload.id as number,
            });
          }
          break;

        case 'sync_snapshot':
          if (Array.isArray(payload.conectados)) {
            setConectados(
              payload.conectados as Array<{ id: number; nombre: string }>
            );
          }
          break;

        // ---------- Cambios en clases ----------
        case 'class_created':
        case 'class_updated':
          aplicarClaseRemota(payload as never);
          break;

        case 'class_deleted': {
          const claseId = (payload.id ?? payload.id_clase) as number | undefined;
          if (typeof claseId === 'number') aplicarClaseEliminada(claseId);
          break;
        }

        // ---------- Cambios en relaciones ----------
        case 'relation_created':
        case 'relation_updated':
          aplicarRelacionRemota(payload as never);
          break;

        case 'relation_deleted': {
          const relId = (payload.id ?? payload.id_relacion) as number | undefined;
          if (typeof relId === 'number') aplicarRelacionEliminada(relId);
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
  // Conexión al montar
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

    client.connect();
    clientRef.current = client;

    return () => {
      client.close();
      clientRef.current = null;
      limpiarColaboracion();
      setMiUsuarioId(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagramaId, enabled, usuario?.id]);

  // ------------------------------------------------------------------
  // Emisores (con throttle para el cursor)
  // ------------------------------------------------------------------
  const lastCursorSent = useRef(0);

  const emitCursor = useCallback((x: number, y: number) => {
    const now = Date.now();
    // Throttle: máx 20 emisiones por segundo (50ms)
    if (now - lastCursorSent.current < 50) return;
    lastCursorSent.current = now;
    clientRef.current?.sendCursor(x, y);
  }, []);

  const emitSelection = useCallback((tipo: string, id: number) => {
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