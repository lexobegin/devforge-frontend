// src/websocket/socketClient.ts
/**
 * Cliente WebSocket para la colaboración en tiempo real.
 *
 * Responsabilidades:
 * - Abrir y mantener la conexión WS al diagrama actual.
 * - Enviar mensajes tipados al servidor.
 * - Recibir y parsear mensajes entrantes.
 * - Reconectar automáticamente con backoff exponencial.
 * - Notificar cambios de estado (connected / reconnecting / disconnected).
 * - 🎯 MODO LOCAL (Camino A): construye la URL con la base local cuando
 *   `estaEnModoLocal()` está activo y, si el httpClient conmuta a modo
 *   local (evento `devforge:modo-local`), reconecta contra
 *   `env.localWsBaseUrl` sin esperar el ciclo de reconexión.
 *
 * La URL del WebSocket tiene la forma (collaboration_ws.py):
 *   <wsBase>/ws/diagramas/<id>?token=<jwt>
 *
 * El id del diagrama es string (ObjectId hex) y el token de acceso se
 * lee del localStorage en cada conexión (así funciona correctamente
 * tras un refresh).
 *
 * Nota del servidor: el WS NO persiste cambios, solo retransmite y
 * registra historial; la persistencia la hacen las llamadas REST.
 */

import { env, buildDiagramWsUrl } from '@/config/env';
import { estaEnModoLocal, tokenStorage } from '@/api';
import {
  WS_CLOSE_CODES,
  describeCloseCode,
  type SocketHandlers,
  type SocketStatus,
  type WSMessage,
} from './collaborationEvents';

// ======================================================================
// Opciones
// ======================================================================
interface SocketClientOptions {
  /** ObjectId hex del diagrama (contrato Ciclo 2: ids string). */
  diagramaId: string;
  handlers?: SocketHandlers;
  /** Máximo de intentos de reconexión. -1 = infinito. */
  maxReconnectAttempts?: number;
  /** Delay inicial de reconexión en ms (se duplica en cada intento). */
  initialReconnectDelayMs?: number;
  /** Delay máximo entre intentos (tope del backoff). */
  maxReconnectDelayMs?: number;
}

// ======================================================================
// Constantes
// ======================================================================
/** Keepalive del cliente: ping cada 30 s (WS_HEARTBEAT_INTERVAL=30). */
const HEARTBEAT_INTERVAL_MS = 30_000;
/** Tope del backoff de reconexión por defecto. */
const MAX_RECONNECT_DELAY_MS = 30_000;

// ======================================================================
// Cliente
// ======================================================================
export class SocketClient {
  private ws: WebSocket | null = null;
  private diagramaId: string;
  private handlers: SocketHandlers;
  private status: SocketStatus = 'idle';

  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private initialReconnectDelayMs: number;
  private maxReconnectDelayMs: number;

  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private manualClose = false;

  /** Listener del evento global de modo local (para poder quitarlo). */
  private readonly onModoLocal: () => void;

  constructor(options: SocketClientOptions) {
    this.diagramaId = options.diagramaId;
    this.handlers = options.handlers ?? {};
    this.maxReconnectAttempts =
      options.maxReconnectAttempts ?? env.ws.reconnectMaxAttempts;
    this.initialReconnectDelayMs =
      options.initialReconnectDelayMs ?? env.ws.reconnectInitialDelayMs;
    this.maxReconnectDelayMs =
      options.maxReconnectDelayMs ?? MAX_RECONNECT_DELAY_MS;

    // Camino A: si el httpClient activa el modo local (backend caído),
    // reconectar el WS contra el backend local inmediatamente.
    this.onModoLocal = () => {
      if (this.manualClose) return;
      if (this.status === 'connected' || this.status === 'connecting' || this.status === 'reconnecting') {
        this.cerrarSocketSilencioso();
        this.openSocket();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('devforge:modo-local', this.onModoLocal);
    }
  }

  // ------------------------------------------------------------------
  // API pública
  // ------------------------------------------------------------------
  getStatus(): SocketStatus {
    return this.status;
  }

  connect(): void {
    this.manualClose = false;
    this.openSocket();
  }

  /** Cierra la conexión y limpia timers + listener de modo local. */
  close(): void {
    this.manualClose = true;
    this.clearTimers();
    if (typeof window !== 'undefined') {
      window.removeEventListener('devforge:modo-local', this.onModoLocal);
    }
    this.cerrarSocketSilencioso();
    this.setStatus('idle');
  }

  /** Envía un mensaje tipado al servidor. */
  send<T = unknown>(type: string, payload: T = {} as T): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    try {
      this.ws.send(
        JSON.stringify({
          type,
          payload,
          timestamp: new Date().toISOString(),
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  /** Atajo para actualizar el cursor (frecuente, sin sobrecarga). */
  sendCursor(x: number, y: number): boolean {
    return this.send('cursor_moved', { x, y });
  }

  /** Atajo para informar la selección actual (id uuid del elemento). */
  sendSelection(tipo: string, id: string): boolean {
    return this.send('selection_changed', { tipo, id });
  }

  /** Atajo para emitir un cambio del diagrama (lo registra el backend). */
  sendDiagramEvent(type: string, payload: Record<string, unknown>): boolean {
    return this.send(type, payload);
  }

  /** Pide al servidor un snapshot fresco de conectados. */
  requestSync(): boolean {
    return this.send('request_sync', {});
  }

  // ------------------------------------------------------------------
  // Internos
  // ------------------------------------------------------------------
  private openSocket(): void {
    const token = tokenStorage.getAccess();
    if (!token) {
      this.setStatus('disconnected');
      this.handlers.onError?.(new Event('no-token'));
      return;
    }

    this.setStatus(
      this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting'
    );

    // Camino A: usarLocal=true cuando el fallback ya está activo.
    const url = buildDiagramWsUrl(this.diagramaId, token, estaEnModoLocal());
    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch {
      this.setStatus('disconnected');
      this.scheduleReconnect();
      return;
    }
    this.ws = socket;

    socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus('connected');
      this.handlers.onOpen?.();
      this.startHeartbeat();
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WSMessage;
        // Responder a ping del servidor con pong (robustez: el backend
        // solo responde pings, pero el protocolo lo permite).
        if (data.type === 'ping') {
          this.send('pong', {});
          return;
        }
        // El pong del server es solo keepalive: no llega a los handlers.
        if (data.type === 'pong') return;
        this.handlers.onMessage?.(data);
      } catch {
        // Mensaje no parseable: ignorar
      }
    };

    socket.onerror = (event) => {
      this.handlers.onError?.(event);
    };

    socket.onclose = (event) => {
      this.stopHeartbeat();
      const estabaConectado = this.status === 'connected';
      this.setStatus('disconnected');
      this.handlers.onClose?.(event);

      // No reconectar si fue cierre manual o error de auth/permisos
      // (4401 token / 4403 permisos / 4404 diagrama: reintentar no ayuda).
      if (this.manualClose) return;
      if (
        event.code === WS_CLOSE_CODES.UNAUTHORIZED ||
        event.code === WS_CLOSE_CODES.FORBIDDEN ||
        event.code === WS_CLOSE_CODES.NOT_FOUND
      ) {
        console.warn(
          '[WS] Cierre sin reintento:',
          describeCloseCode(event.code)
        );
        return;
      }

      // Si la caída vino de una sesión establecida, el backoff reinicia.
      if (estabaConectado) {
        this.reconnectAttempts = 0;
      }
      this.scheduleReconnect();
    };
  }

  /** Cierra el socket sin disparar reconexión (para el modo local). */
  private cerrarSocketSilencioso(): void {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      try {
        this.ws.close(WS_CLOSE_CODES.NORMAL, 'Cierre manual');
      } catch {
        /* noop */
      }
      this.ws = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.manualClose) return;
    if (
      this.maxReconnectAttempts >= 0 &&
      this.reconnectAttempts >= this.maxReconnectAttempts
    ) {
      this.setStatus('disconnected');
      return;
    }

    const delay = Math.min(
      this.initialReconnectDelayMs * 2 ** this.reconnectAttempts,
      this.maxReconnectDelayMs
    );
    this.reconnectAttempts++;

    this.clearReconnectTimer();
    this.reconnectTimer = window.setTimeout(() => {
      this.openSocket();
    }, delay);
  }

  // ------------------------------------------------------------------
  // Heartbeat (el cliente manda ping; el backend responde pong)
  // ------------------------------------------------------------------
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      this.send('ping', {});
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearReconnectTimer();
    this.stopHeartbeat();
  }

  private setStatus(status: SocketStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.handlers.onStatusChange?.(status);
  }
}

// ======================================================================
// Factory
// ======================================================================
export function createSocketClient(
  diagramaId: string,
  handlers: SocketHandlers = {}
): SocketClient {
  return new SocketClient({ diagramaId, handlers });
}