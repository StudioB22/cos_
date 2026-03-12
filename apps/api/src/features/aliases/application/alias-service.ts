import type { Alias } from '@cos/shared';

import { AppError } from '../../../shared/http/app-error.js';
import { normalizePseudo, normalizeRoomName } from '../../../shared/security/text.js';
import type { RoomRepository } from '../../rooms/application/room-repository.js';
import type { AliasRepository } from './alias-repository.js';

const toAlias = (alias: { id: string; pseudo: string; salonFavori: string | null }): Alias => ({
  id: alias.id,
  pseudo: alias.pseudo,
  salonFavori: alias.salonFavori,
});

export class AliasService {
  constructor(
    private readonly aliasRepository: AliasRepository,
    private readonly roomRepository: RoomRepository,
  ) {}

  createAlias(userId: string, pseudo: string): Alias {
    if (this.aliasRepository.countByUserId(userId) >= 3) {
      throw new AppError('ALIAS_LIMIT_REACHED', 'A user can reserve up to three aliases.', 400);
    }

    const normalizedPseudo = normalizePseudo(pseudo);
    const existing = this.aliasRepository.findByPseudo(normalizedPseudo);

    if (existing) {
      throw new AppError('ALIAS_TAKEN', 'This alias is already reserved.', 409);
    }

    return toAlias(this.aliasRepository.create(userId, normalizedPseudo));
  }

  setFavorite(userId: string, pseudo: string, salonFavori: string): Alias {
    const alias = this.aliasRepository.findByPseudo(pseudo);

    if (!alias || alias.userId !== userId) {
      throw new AppError('ALIAS_NOT_FOUND', 'Alias does not belong to the current user.', 404);
    }

    const roomName = normalizeRoomName(salonFavori);
    const canAccess = this.roomRepository.canAccess(roomName, alias.id);

    if (!canAccess) {
      throw new AppError('ROOM_FORBIDDEN', 'Alias cannot favorite an inaccessible room.', 403);
    }

    return toAlias(this.aliasRepository.setFavorite(alias.id, roomName));
  }

  listAliases(userId: string): Alias[] {
    return this.aliasRepository.findByUserId(userId).map(toAlias);
  }

  searchAliases(query: string): Alias[] {
    if (!query.trim()) {
      return [];
    }

    return this.aliasRepository.search(query).map(toAlias);
  }
}
