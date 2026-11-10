import { describe, expect, it } from 'vitest';

import { AliasService } from '../../src/features/aliases/application/alias-service.js';
import type { AliasRepository } from '../../src/features/aliases/application/alias-repository.js';
import type { AliasRecord } from '../../src/features/aliases/domain/alias-record.js';
import type { RoomRepository } from '../../src/features/rooms/application/room-repository.js';
import { AppError } from '../../src/shared/http/app-error.js';

const record = (overrides: Partial<AliasRecord> = {}): AliasRecord => ({
  id: 'alias-1',
  userId: 'user-1',
  pseudo: 'Neo',
  salonFavori: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

/** In-memory alias port: the service's own domain is exercised, only the boundaries are faked. */
const aliasRepository = (aliases: AliasRecord[]): AliasRepository => ({
  findByUserId: (userId) => aliases.filter((alias) => alias.userId === userId),
  countByUserId: (userId) => aliases.filter((alias) => alias.userId === userId).length,
  findByPseudo: (pseudo) => aliases.find((alias) => alias.pseudo === pseudo) ?? null,
  findById: (id) => aliases.find((alias) => alias.id === id) ?? null,
  create: (userId, pseudo) => record({ id: `alias-${aliases.length + 1}`, userId, pseudo }),
  setFavorite: (aliasId, salonFavori) => record({ id: aliasId, salonFavori }),
  search: (query) =>
    aliases.filter((alias) => alias.pseudo.toLowerCase().includes(query.toLowerCase())),
});

const roomRepository = (accessible: boolean): RoomRepository => ({
  listAccessibleRooms: () => [],
  findByName: () => null,
  canAccess: () => accessible,
  createPrivateRoom: () => {
    throw new Error('not used');
  },
  addMember: () => undefined,
  isOwner: () => false,
});

describe('AliasService', () => {
  it('creates a trimmed alias when the user is under the limit and the pseudo is free', () => {
    const service = new AliasService(aliasRepository([]), roomRepository(true));

    expect(service.createAlias('user-1', '  Trinity ')).toEqual({
      id: 'alias-1',
      pseudo: 'Trinity',
      salonFavori: null,
    });
  });

  it('refuses a fourth alias and a pseudo already reserved', () => {
    const three = [
      record({ id: 'a' }),
      record({ id: 'b', pseudo: 'Two' }),
      record({ id: 'c', pseudo: 'Three' }),
    ];
    const full = new AliasService(aliasRepository(three), roomRepository(true));
    const taken = new AliasService(aliasRepository([record()]), roomRepository(true));

    expect(() => full.createAlias('user-1', 'Four')).toThrow(AppError);
    expect(() => taken.createAlias('user-2', 'Neo')).toThrowError('already reserved');
  });

  it('sets a favorite room only on an owned alias that can access the room', () => {
    const owned = new AliasService(aliasRepository([record()]), roomRepository(true));
    const forbidden = new AliasService(aliasRepository([record()]), roomRepository(false));
    const other = new AliasService(
      aliasRepository([record({ userId: 'user-9' })]),
      roomRepository(true),
    );

    expect(owned.setFavorite('user-1', 'Neo', ' General ').salonFavori).toBe('general');
    expect(() => forbidden.setFavorite('user-1', 'Neo', 'secret')).toThrowError('inaccessible');
    expect(() => other.setFavorite('user-1', 'Neo', 'general')).toThrowError('does not belong');
  });

  it('lists the user aliases and searches by substring, returning nothing on a blank query', () => {
    const service = new AliasService(
      aliasRepository([record(), record({ id: 'alias-2', userId: 'user-2', pseudo: 'Morpheus' })]),
      roomRepository(true),
    );

    expect(service.listAliases('user-1').map((alias) => alias.pseudo)).toEqual(['Neo']);
    expect(service.searchAliases('morph').map((alias) => alias.id)).toEqual(['alias-2']);
    expect(service.searchAliases('   ')).toEqual([]);
  });
});
