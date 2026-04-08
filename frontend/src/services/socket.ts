import { io, Socket } from 'socket.io-client';
import { getBackendOrigin } from './runtime';
import { traceInfo, traceSocketError, traceSocketInfo, traceSocketWarn } from './trace';

let socket: Socket | null = null;
const wrappedHandlers = new WeakMap<Function, Map<string, Function>>();

function getWrappedHandler<T>(eventName: string, handler: (payload: T) => void) {
  const eventHandlers = wrappedHandlers.get(handler) ?? new Map<string, Function>();
  const existing = eventHandlers.get(eventName);

  if (existing) {
    return existing as (payload: T) => void;
  }

  const wrapped = (payload: T) => {
    traceSocketInfo('Socket event received', eventName, {
      payload,
    });

    try {
      handler(payload);
    } catch (error) {
      traceSocketError('Socket event handler failed', eventName, error, {
        payload,
      });
    }
  };

  eventHandlers.set(eventName, wrapped);
  wrappedHandlers.set(handler, eventHandlers);
  return wrapped;
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(getBackendOrigin(), { transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      traceInfo('socket', 'Socket connected', {
        context: {
          id: socket?.id,
          origin: getBackendOrigin(),
        },
      });
    });

    socket.on('disconnect', (reason) => {
      traceSocketWarn('Socket disconnected', 'disconnect', {
        context: {
          reason,
        },
      });
    });

    socket.on('connect_error', (error) => {
      traceSocketError('Socket connection error', 'connect_error', error, {
        origin: getBackendOrigin(),
      });
    });

    socket.io.on('reconnect_attempt', (attempt) => {
      traceSocketWarn('Socket reconnect attempt', 'reconnect_attempt', {
        attempt,
      });
    });

    socket.io.on('reconnect_error', (error) => {
      traceSocketError('Socket reconnect error', 'reconnect_error', error);
    });
  }
  return socket;
}

export function onSocketEvent<T>(eventName: string, handler: (payload: T) => void) {
  const activeSocket = getSocket();
  const wrapped = getWrappedHandler(eventName, handler);
  activeSocket.on(eventName, wrapped as (payload: T) => void);

  return () => {
    activeSocket.off(eventName, wrapped as (payload: T) => void);
  };
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
