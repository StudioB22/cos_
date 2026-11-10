import type { ApiError } from '@cos/shared';
import {
  chatSendSocketSchema,
  dmSendSocketSchema,
  ignoreSocketSchema,
  ignoreStateSocketSchema,
  joinRoomSocketSchema,
} from '@cos/shared';
import cookie from 'cookie';
import cookieParser from 'cookie-parser';
import type { Server } from 'socket.io';

import type { AppContext } from '../../../app/context.js';
import { sessionCookieName } from '../../../config/session.js';
import { toApiError } from '../../../shared/http/to-api-error.js';

type SocketSuccess<T> = { ok: true; data: T };
type SocketFailure = { ok: false; error: ApiError };
type SocketAck<T> = (payload: SocketSuccess<T> | SocketFailure) => void;

const toSocketError = (error: unknown): SocketFailure => ({
  ok: false,
  error: toApiError(error).body,
});

const emitPresence = (io: Server, context: AppContext, roomName: string) => {
  io.to(roomName).emit('presence:update', context.realtimeService.getRoomState(roomName).occupants);
};

const emitRoomState = (io: Server, context: AppContext, roomName: string) => {
  io.to(roomName).emit('room:state', context.realtimeService.getRoomState(roomName));
  emitPresence(io, context, roomName);
};

const emitRoomMessage = (
  io: Server,
  context: AppContext,
  roomName: string,
  payload: { authorAlias: string; [key: string]: unknown },
) => {
  const roomSockets = context.realtimeService.getRoomSocketAliases(roomName);

  for (const [socketId, alias] of roomSockets.entries()) {
    if (context.realtimeService.isIgnoring(alias, payload.authorAlias)) {
      continue;
    }

    io.to(socketId).emit('chat:new', payload);
  }

  emitPresence(io, context, roomName);
};

export const registerRealtimeHandlers = (io: Server, context: AppContext) => {
  io.use((socket, next) => {
    const rawCookies = cookie.parse(socket.handshake.headers.cookie ?? '');
    const value = rawCookies[sessionCookieName];
    const sessionUserId = cookieParser.signedCookie(value ?? '', context.env.COOKIE_SECRET);

    if (typeof sessionUserId !== 'string' || !sessionUserId) {
      next(new Error('Unauthorized'));
      return;
    }

    socket.data.userId = sessionUserId;
    next();
  });

  io.on('connection', (socket) => {
    socket.on('room:join', (payload, ack: SocketAck<unknown>) => {
      try {
        const input = joinRoomSocketSchema.parse(payload);
        const result = context.realtimeService.joinRoom({
          socketId: socket.id,
          userId: socket.data.userId as string,
          aliasPseudo: input.alias,
          roomName: input.roomName,
        });

        if (result.previousRoomName && result.previousRoomName !== input.roomName) {
          socket.leave(result.previousRoomName);
          emitRoomState(io, context, result.previousRoomName);
        }

        void socket.join(result.roomState.roomName);
        emitRoomState(io, context, result.roomState.roomName);
        ack({ ok: true, data: result.roomState });
      } catch (error) {
        ack(toSocketError(error));
      }
    });

    socket.on('room:leave', (_payload, ack: SocketAck<{ left: boolean }>) => {
      try {
        const previousRoom = context.realtimeService.leaveRoom(socket.id);

        if (previousRoom) {
          void socket.leave(previousRoom);
          emitRoomState(io, context, previousRoom);
        }

        ack({ ok: true, data: { left: Boolean(previousRoom) } });
      } catch (error) {
        ack(toSocketError(error));
      }
    });

    socket.on('chat:send', (payload, ack: SocketAck<unknown>) => {
      try {
        const input = chatSendSocketSchema.parse(payload);
        const message = context.realtimeService.sendRoomMessage({
          userId: socket.data.userId as string,
          aliasPseudo: input.alias,
          roomName: input.roomName,
          content: input.content,
          smiley: input.smiley ?? null,
        });

        emitRoomMessage(io, context, message.roomName, message);
        ack({ ok: true, data: message });
      } catch (error) {
        ack(toSocketError(error));
      }
    });

    socket.on('dm:send', (payload, ack: SocketAck<unknown>) => {
      try {
        const input = dmSendSocketSchema.parse(payload);
        const message = context.realtimeService.sendDirectMessage({
          userId: socket.data.userId as string,
          fromAlias: input.fromAlias,
          toAlias: input.toAlias,
          content: input.content,
          smiley: input.smiley ?? null,
        });

        const senderSockets = context.realtimeService.getSocketsForAlias(message.fromAlias);
        const recipientSockets = context.realtimeService.getSocketsForAlias(message.toAlias);

        for (const socketId of senderSockets) {
          io.to(socketId).emit('dm:new', message);
        }

        if (!context.realtimeService.isIgnoring(message.toAlias, message.fromAlias)) {
          for (const socketId of recipientSockets) {
            io.to(socketId).emit('dm:new', message);
          }
        }

        ack({ ok: true, data: message });
      } catch (error) {
        ack(toSocketError(error));
      }
    });

    socket.on('ignore:add', (payload, ack: SocketAck<{ ignoredAliases: string[] }>) => {
      try {
        const input = ignoreSocketSchema.parse(payload);
        const ignoredAliases = context.realtimeService.addIgnore({
          userId: socket.data.userId as string,
          aliasPseudo: input.alias,
          ignoredAlias: input.ignoredAlias,
        });

        ack({ ok: true, data: { ignoredAliases } });
      } catch (error) {
        ack(toSocketError(error));
      }
    });

    socket.on('ignore:remove', (payload, ack: SocketAck<{ ignoredAliases: string[] }>) => {
      try {
        const input = ignoreSocketSchema.parse(payload);
        const ignoredAliases = context.realtimeService.removeIgnore({
          userId: socket.data.userId as string,
          aliasPseudo: input.alias,
          ignoredAlias: input.ignoredAlias,
        });

        ack({ ok: true, data: { ignoredAliases } });
      } catch (error) {
        ack(toSocketError(error));
      }
    });

    socket.on('ignore:list', (payload, ack: SocketAck<{ ignoredAliases: string[] }>) => {
      try {
        const input = ignoreStateSocketSchema.parse(payload);
        const ignoredAliases = context.realtimeService.getIgnoredAliases(input.alias);
        ack({ ok: true, data: { ignoredAliases } });
      } catch (error) {
        ack(toSocketError(error));
      }
    });

    socket.on('disconnect', () => {
      const previousRoom = context.realtimeService.disconnect(socket.id);
      if (previousRoom) {
        emitRoomState(io, context, previousRoom);
      }
    });
  });
};
