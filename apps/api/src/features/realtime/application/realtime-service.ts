import type { DirectMessage, RoomMessage, RoomState, SmileyCode } from '@cos/shared';

import { AppError } from '../../../shared/http/app-error.js';
import { normalizePseudo, normalizeRoomName, sanitizeMessage } from '../../../shared/security/text.js';
import { WindowRateLimiter } from '../../../shared/security/window-rate-limiter.js';
import type { AliasRepository } from '../../aliases/application/alias-repository.js';
import type { RoomRepository } from '../../rooms/application/room-repository.js';
import { InMemoryRealtimeStore } from '../infrastructure/in-memory-realtime-store.js';

export class RealtimeService {
  private readonly chatLimiter = new WindowRateLimiter(
    8,
    10_000,
    'CHAT_RATE_LIMIT',
    'Too many room messages in a short period.',
  );

  private readonly dmLimiter = new WindowRateLimiter(
    6,
    10_000,
    'DM_RATE_LIMIT',
    'Too many private messages in a short period.',
  );

  constructor(
    private readonly roomRepository: RoomRepository,
    private readonly aliasRepository: AliasRepository,
    private readonly store: InMemoryRealtimeStore,
  ) {}

  joinRoom(params: {
    socketId: string;
    userId: string;
    aliasPseudo: string;
    roomName: string;
  }): { roomState: RoomState; previousRoomName: string | null } {
    const alias = this.aliasRepository.findByPseudo(normalizePseudo(params.aliasPseudo));

    if (!alias || alias.userId !== params.userId) {
      throw new AppError('ALIAS_NOT_FOUND', 'Alias does not belong to the current session.', 404);
    }

    const roomName = normalizeRoomName(params.roomName);

    if (!this.roomRepository.canAccess(roomName, alias.id)) {
      throw new AppError('ROOM_FORBIDDEN', 'Alias cannot access this room.', 403);
    }

    const previousRoomName = this.store.joinRoom(params.socketId, alias.pseudo, roomName);

    return {
      previousRoomName,
      roomState: this.getRoomState(roomName),
    };
  }

  leaveRoom(socketId: string): string | null {
    return this.store.leaveRoom(socketId);
  }

  disconnect(socketId: string): string | null {
    return this.store.disconnect(socketId);
  }

  getRoomState(roomName: string): RoomState {
    const normalized = normalizeRoomName(roomName);
    return {
      roomName: normalized,
      messages: this.store.getRoomMessages(normalized),
      occupants: this.store.getOccupants(normalized),
    };
  }

  sendRoomMessage(params: {
    userId: string;
    aliasPseudo: string;
    roomName: string;
    content: string;
    smiley: SmileyCode | null;
  }): RoomMessage {
    const alias = this.aliasRepository.findByPseudo(normalizePseudo(params.aliasPseudo));

    if (!alias || alias.userId !== params.userId) {
      throw new AppError('ALIAS_NOT_FOUND', 'Alias does not belong to the current session.', 404);
    }

    const roomName = normalizeRoomName(params.roomName);

    if (!this.roomRepository.canAccess(roomName, alias.id)) {
      throw new AppError('ROOM_FORBIDDEN', 'Alias cannot access this room.', 403);
    }

    this.chatLimiter.hit(alias.pseudo);

    const message: RoomMessage = {
      id: crypto.randomUUID(),
      roomName,
      authorAlias: alias.pseudo,
      content: sanitizeMessage(params.content),
      smiley: params.smiley ?? null,
      createdAt: new Date().toISOString(),
      kind: 'message',
    };

    this.store.appendRoomMessage(roomName, message);
    return message;
  }

  sendDirectMessage(params: {
    userId: string;
    fromAlias: string;
    toAlias: string;
    content: string;
    smiley: SmileyCode | null;
  }): DirectMessage {
    const sender = this.aliasRepository.findByPseudo(normalizePseudo(params.fromAlias));

    if (!sender || sender.userId !== params.userId) {
      throw new AppError('ALIAS_NOT_FOUND', 'Sender alias does not belong to the current session.', 404);
    }

    const recipient = this.aliasRepository.findByPseudo(normalizePseudo(params.toAlias));

    if (!recipient) {
      throw new AppError('RECIPIENT_NOT_FOUND', 'Recipient alias does not exist.', 404);
    }

    if (recipient.id === sender.id) {
      throw new AppError('INVALID_DM', 'An alias cannot send a DM to itself.', 400);
    }

    this.dmLimiter.hit(sender.pseudo);

    const message: DirectMessage = {
      id: crypto.randomUUID(),
      fromAlias: sender.pseudo,
      toAlias: recipient.pseudo,
      content: sanitizeMessage(params.content),
      smiley: params.smiley ?? null,
      createdAt: new Date().toISOString(),
    };

    this.store.appendDirectMessage(message);
    return message;
  }

  addIgnore(params: { userId: string; aliasPseudo: string; ignoredAlias: string }): string[] {
    const alias = this.aliasRepository.findByPseudo(normalizePseudo(params.aliasPseudo));

    if (!alias || alias.userId !== params.userId) {
      throw new AppError('ALIAS_NOT_FOUND', 'Alias does not belong to the current session.', 404);
    }

    const ignored = this.aliasRepository.findByPseudo(normalizePseudo(params.ignoredAlias));

    if (!ignored) {
      throw new AppError('IGNORED_ALIAS_NOT_FOUND', 'Ignored alias does not exist.', 404);
    }

    if (ignored.id === alias.id) {
      throw new AppError('INVALID_IGNORE', 'An alias cannot ignore itself.', 400);
    }

    return this.store.addIgnore(alias.pseudo, ignored.pseudo);
  }

  removeIgnore(params: { userId: string; aliasPseudo: string; ignoredAlias: string }): string[] {
    const alias = this.aliasRepository.findByPseudo(normalizePseudo(params.aliasPseudo));

    if (!alias || alias.userId !== params.userId) {
      throw new AppError('ALIAS_NOT_FOUND', 'Alias does not belong to the current session.', 404);
    }

    return this.store.removeIgnore(alias.pseudo, normalizePseudo(params.ignoredAlias));
  }

  getIgnoredAliases(alias: string): string[] {
    return this.store.getIgnoredAliases(alias);
  }

  isIgnoring(alias: string, potentialSender: string): boolean {
    return this.store.isIgnoring(alias, potentialSender);
  }

  getRoomSocketAliases(roomName: string): Map<string, string> {
    return this.store.getRoomSocketAliases(normalizeRoomName(roomName));
  }

  getSocketsForAlias(alias: string): string[] {
    return this.store.getSocketsForAlias(alias);
  }
}
