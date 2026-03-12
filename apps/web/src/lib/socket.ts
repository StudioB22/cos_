import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ??
  'http://localhost:3001';

interface SocketErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class SocketClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

type SocketAck<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: SocketErrorPayload;
    };

export const createCosSocket = () =>
  io(apiUrl, {
    withCredentials: true,
    autoConnect: false,
    transports: ['websocket'],
  });

export const emitWithAck = <T>(
  socket: Socket,
  event: string,
  payload?: Record<string, unknown>,
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    socket.emit(event, payload, (response: SocketAck<T>) => {
      if (response.ok) {
        resolve(response.data);
        return;
      }

      reject(
        new SocketClientError(response.error.code, response.error.message, response.error.details),
      );
    });
  });
