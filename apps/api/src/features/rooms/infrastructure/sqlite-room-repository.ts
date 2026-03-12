import type { Database } from 'better-sqlite3';

import { normalizeRoomName } from '../../../shared/security/text.js';
import type { RoomRepository } from '../application/room-repository.js';
import type { RoomRecord } from '../domain/room-record.js';

interface RoomRow {
  id: string;
  nom: string;
  desc: string;
  type: 'public' | 'private';
  owner_alias_id: string | null;
  owner_alias: string | null;
  created_at: string;
}

const mapMembers = (
  database: Database,
  roomId: string,
): {
  ownerAlias: string | null;
  memberAliases: string[];
} => {
  const rows = database
    .prepare(
      `
        SELECT a.pseudo, sm.role
        FROM salon_memberships sm
        INNER JOIN aliases a ON a.id = sm.alias_id
        WHERE sm.salon_id = ?
        ORDER BY sm.role DESC, a.pseudo ASC
      `,
    )
    .all(roomId) as Array<{ pseudo: string; role: 'owner' | 'member' }>;

  return {
    ownerAlias: rows.find((row) => row.role === 'owner')?.pseudo ?? null,
    memberAliases: rows.map((row) => row.pseudo),
  };
};

const toRecord = (database: Database, row: RoomRow): RoomRecord => {
  const members = mapMembers(database, row.id);

  return {
    id: row.id,
    nom: row.nom,
    desc: row.desc,
    type: row.type,
    ownerAliasId: row.owner_alias_id,
    ownerAlias: row.owner_alias ?? members.ownerAlias,
    memberAliases: members.memberAliases,
    createdAt: row.created_at,
  };
};

export class SqliteRoomRepository implements RoomRepository {
  constructor(private readonly database: Database) {}

  listAccessibleRooms(aliasId: string): RoomRecord[] {
    const rows = this.database
      .prepare(
        `
          SELECT DISTINCT
            s.id,
            s.nom,
            s.desc,
            s.type,
            s.owner_alias_id,
            owner_alias.pseudo AS owner_alias,
            s.created_at
          FROM salons s
          LEFT JOIN salon_memberships sm ON sm.salon_id = s.id
          LEFT JOIN aliases owner_alias ON owner_alias.id = s.owner_alias_id
          WHERE s.type = 'public' OR sm.alias_id = ?
          ORDER BY s.type ASC, s.nom ASC
        `,
      )
      .all(aliasId) as RoomRow[];

    return rows.map((row) => toRecord(this.database, row));
  }

  findByName(name: string): RoomRecord | null {
    const normalized = normalizeRoomName(name);
    const row = this.database
      .prepare(
        `
          SELECT
            s.id,
            s.nom,
            s.desc,
            s.type,
            s.owner_alias_id,
            owner_alias.pseudo AS owner_alias,
            s.created_at
          FROM salons s
          LEFT JOIN aliases owner_alias ON owner_alias.id = s.owner_alias_id
          WHERE lower(s.nom) = lower(?)
        `,
      )
      .get(normalized) as RoomRow | undefined;

    return row ? toRecord(this.database, row) : null;
  }

  canAccess(name: string, aliasId: string): boolean {
    const normalized = normalizeRoomName(name);
    const room = this.database
      .prepare(
        `
          SELECT
            CASE
              WHEN s.type = 'public' THEN 1
              WHEN EXISTS (
                SELECT 1
                FROM salon_memberships sm
                WHERE sm.salon_id = s.id AND sm.alias_id = ?
              ) THEN 1
              ELSE 0
            END AS allowed
          FROM salons s
          WHERE lower(s.nom) = lower(?)
        `,
      )
      .get(aliasId, normalized) as { allowed: number } | undefined;

    return Boolean(room?.allowed);
  }

  createPrivateRoom(ownerAliasId: string, ownerAlias: string, name: string, desc: string): RoomRecord {
    const now = new Date().toISOString();
    const roomId = crypto.randomUUID();

    const transaction = this.database.transaction(() => {
      this.database
        .prepare(
          `
            INSERT INTO salons (id, nom, desc, type, owner_alias_id, created_at)
            VALUES (?, ?, ?, 'private', ?, ?)
          `,
        )
        .run(roomId, name, desc, ownerAliasId, now);

      this.database
        .prepare(
          `
            INSERT INTO salon_memberships (salon_id, alias_id, role, created_at)
            VALUES (?, ?, 'owner', ?)
          `,
        )
        .run(roomId, ownerAliasId, now);
    });

    transaction();

    return {
      id: roomId,
      nom: name,
      desc,
      type: 'private',
      ownerAliasId,
      ownerAlias,
      memberAliases: [ownerAlias],
      createdAt: now,
    };
  }

  addMember(roomId: string, aliasId: string): void {
    this.database
      .prepare(
        `
          INSERT OR IGNORE INTO salon_memberships (salon_id, alias_id, role, created_at)
          VALUES (?, ?, 'member', ?)
        `,
      )
      .run(roomId, aliasId, new Date().toISOString());
  }

  isOwner(roomId: string, aliasId: string): boolean {
    const row = this.database
      .prepare(
        `
          SELECT COUNT(*) as count
          FROM salon_memberships
          WHERE salon_id = ? AND alias_id = ? AND role = 'owner'
        `,
      )
      .get(roomId, aliasId) as { count: number };

    return row.count > 0;
  }
}
