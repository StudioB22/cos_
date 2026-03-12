import type { Salon } from '@cos/shared';

import { AppError } from '../../../shared/http/app-error.js';
import { normalizePseudo, normalizeRoomName } from '../../../shared/security/text.js';
import type { AliasRepository } from '../../aliases/application/alias-repository.js';
import type { RoomRepository } from './room-repository.js';

const toSalon = (room: {
  id: string;
  nom: string;
  desc: string;
  type: 'public' | 'private';
  ownerAliasId: string | null;
  ownerAlias: string | null;
  memberAliases: string[];
}): Salon => ({
  id: room.id,
  nom: room.nom,
  desc: room.desc,
  type: room.type,
  ownerAliasId: room.ownerAliasId,
  ownerAlias: room.ownerAlias,
  memberAliases: room.memberAliases,
  isMember: room.type === 'public' || room.memberAliases.length > 0,
});

export class RoomService {
  constructor(
    private readonly roomRepository: RoomRepository,
    private readonly aliasRepository: AliasRepository,
  ) {}

  listRooms(userId: string, aliasPseudo: string): Salon[] {
    const alias = this.aliasRepository.findByPseudo(normalizePseudo(aliasPseudo));

    if (!alias || alias.userId !== userId) {
      throw new AppError('ALIAS_NOT_FOUND', 'Alias does not belong to the current user.', 404);
    }

    return this.roomRepository.listAccessibleRooms(alias.id).map(toSalon);
  }

  createPrivateRoom(
    userId: string,
    input: { alias: string; nom: string; desc: string; type: 'public' | 'private' },
  ): Salon {
    if (input.type !== 'private') {
      throw new AppError('ROOM_TYPE_FORBIDDEN', 'Users can only create private rooms in v1.', 400);
    }

    const ownerAlias = this.aliasRepository.findByPseudo(normalizePseudo(input.alias));

    if (!ownerAlias || ownerAlias.userId !== userId) {
      throw new AppError('ALIAS_NOT_FOUND', 'Owner alias does not belong to the current user.', 404);
    }

    const roomName = normalizeRoomName(input.nom);

    if (this.roomRepository.findByName(roomName)) {
      throw new AppError('ROOM_TAKEN', 'A room with this name already exists.', 409);
    }

    return toSalon(
      this.roomRepository.createPrivateRoom(ownerAlias.id, ownerAlias.pseudo, roomName, input.desc.trim()),
    );
  }

  inviteAlias(
    userId: string,
    roomName: string,
    input: { inviterAlias: string; invitedAlias: string },
  ): Salon {
    const inviter = this.aliasRepository.findByPseudo(normalizePseudo(input.inviterAlias));

    if (!inviter || inviter.userId !== userId) {
      throw new AppError('ALIAS_NOT_FOUND', 'Inviter alias does not belong to the current user.', 404);
    }

    const invited = this.aliasRepository.findByPseudo(normalizePseudo(input.invitedAlias));

    if (!invited) {
      throw new AppError('INVITED_ALIAS_NOT_FOUND', 'Invited alias does not exist.', 404);
    }

    if (inviter.id === invited.id) {
      throw new AppError('INVALID_INVITATION', 'Owner alias is already a member.', 400);
    }

    const room = this.roomRepository.findByName(normalizeRoomName(roomName));

    if (!room) {
      throw new AppError('ROOM_NOT_FOUND', 'Room was not found.', 404);
    }

    if (room.type !== 'private') {
      throw new AppError('ROOM_NOT_PRIVATE', 'Invitations are only available for private rooms.', 400);
    }

    if (!this.roomRepository.isOwner(room.id, inviter.id)) {
      throw new AppError('ROOM_FORBIDDEN', 'Only the private room owner can invite profiles.', 403);
    }

    this.roomRepository.addMember(room.id, invited.id);

    const refreshed = this.roomRepository.findByName(room.nom);

    if (!refreshed) {
      throw new AppError('ROOM_NOT_FOUND', 'Room was not found after invitation.', 404);
    }

    return toSalon(refreshed);
  }
}
