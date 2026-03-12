import type { DirectMessage, RoomMessage, RoomStateMember } from '@cos/shared';

interface SocketState {
  alias: string | null;
  roomName: string | null;
}

const appendBounded = <T>(current: T[], item: T, limit = 80): T[] => {
  const next = [...current, item];
  return next.slice(-limit);
};

export class InMemoryRealtimeStore {
  private readonly roomMessages = new Map<string, RoomMessage[]>();
  private readonly roomOccupants = new Map<string, Map<string, string>>();
  private readonly aliasSockets = new Map<string, Set<string>>();
  private readonly socketState = new Map<string, SocketState>();
  private readonly ignoreLists = new Map<string, Set<string>>();
  private readonly directMessages = new Map<string, DirectMessage[]>();

  getSocketState(socketId: string): SocketState {
    return this.socketState.get(socketId) ?? { alias: null, roomName: null };
  }

  assignSocketAlias(socketId: string, alias: string) {
    const previous = this.getSocketState(socketId);

    if (previous.alias && previous.alias !== alias) {
      const previousSockets = this.aliasSockets.get(previous.alias);
      previousSockets?.delete(socketId);
      if (previousSockets?.size === 0) {
        this.aliasSockets.delete(previous.alias);
      }
    }

    const socketState = this.getSocketState(socketId);
    socketState.alias = alias;
    this.socketState.set(socketId, socketState);

    const sockets = this.aliasSockets.get(alias) ?? new Set<string>();
    sockets.add(socketId);
    this.aliasSockets.set(alias, sockets);
  }

  joinRoom(socketId: string, alias: string, roomName: string): string | null {
    const current = this.getSocketState(socketId);
    const previousRoomName = current.roomName;

    if (previousRoomName && previousRoomName !== roomName) {
      this.leaveRoom(socketId);
    }

    this.assignSocketAlias(socketId, alias);

    const room = this.roomOccupants.get(roomName) ?? new Map<string, string>();
    room.set(socketId, alias);
    this.roomOccupants.set(roomName, room);

    this.socketState.set(socketId, { alias, roomName });

    return previousRoomName;
  }

  leaveRoom(socketId: string): string | null {
    const current = this.getSocketState(socketId);

    if (!current.roomName) {
      return null;
    }

    const room = this.roomOccupants.get(current.roomName);
    room?.delete(socketId);
    if (room && room.size === 0) {
      this.roomOccupants.delete(current.roomName);
    }

    this.socketState.set(socketId, { alias: current.alias, roomName: null });
    return current.roomName;
  }

  disconnect(socketId: string): string | null {
    const current = this.getSocketState(socketId);
    const previousRoom = this.leaveRoom(socketId);

    if (current.alias) {
      const sockets = this.aliasSockets.get(current.alias);
      sockets?.delete(socketId);
      if (sockets?.size === 0) {
        this.aliasSockets.delete(current.alias);
      }
    }

    this.socketState.delete(socketId);
    return previousRoom;
  }

  appendRoomMessage(roomName: string, message: RoomMessage) {
    const existing = this.roomMessages.get(roomName) ?? [];
    this.roomMessages.set(roomName, appendBounded(existing, message));
  }

  getRoomMessages(roomName: string): RoomMessage[] {
    return this.roomMessages.get(roomName) ?? [];
  }

  getOccupants(roomName: string): RoomStateMember[] {
    const room = this.roomOccupants.get(roomName) ?? new Map<string, string>();
    const counts = new Map<string, number>();

    for (const alias of room.values()) {
      counts.set(alias, (counts.get(alias) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([alias, socketCount]) => ({ alias, socketCount }))
      .sort((left, right) => left.alias.localeCompare(right.alias));
  }

  getRoomSocketAliases(roomName: string): Map<string, string> {
    return new Map(this.roomOccupants.get(roomName) ?? []);
  }

  addIgnore(alias: string, ignoredAlias: string): string[] {
    const ignored = this.ignoreLists.get(alias) ?? new Set<string>();
    ignored.add(ignoredAlias);
    this.ignoreLists.set(alias, ignored);
    return [...ignored].sort();
  }

  removeIgnore(alias: string, ignoredAlias: string): string[] {
    const ignored = this.ignoreLists.get(alias) ?? new Set<string>();
    ignored.delete(ignoredAlias);
    if (ignored.size === 0) {
      this.ignoreLists.delete(alias);
      return [];
    }

    this.ignoreLists.set(alias, ignored);
    return [...ignored].sort();
  }

  isIgnoring(alias: string, potentialSender: string): boolean {
    return this.ignoreLists.get(alias)?.has(potentialSender) ?? false;
  }

  getIgnoredAliases(alias: string): string[] {
    return [...(this.ignoreLists.get(alias) ?? new Set<string>())].sort();
  }

  appendDirectMessage(message: DirectMessage) {
    const key = [message.fromAlias, message.toAlias].sort().join('::');
    const existing = this.directMessages.get(key) ?? [];
    this.directMessages.set(key, appendBounded(existing, message));
  }

  getDirectMessages(aliasA: string, aliasB: string): DirectMessage[] {
    return this.directMessages.get([aliasA, aliasB].sort().join('::')) ?? [];
  }

  getSocketsForAlias(alias: string): string[] {
    return [...(this.aliasSockets.get(alias) ?? new Set<string>())];
  }
}
