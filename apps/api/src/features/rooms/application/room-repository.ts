import type { RoomRecord } from '../domain/room-record.js';

export interface RoomRepository {
  listAccessibleRooms(aliasId: string): RoomRecord[];
  findByName(name: string): RoomRecord | null;
  canAccess(name: string, aliasId: string): boolean;
  createPrivateRoom(ownerAliasId: string, ownerAlias: string, name: string, desc: string): RoomRecord;
  addMember(roomId: string, aliasId: string): void;
  isOwner(roomId: string, aliasId: string): boolean;
}
