import type { Database } from 'better-sqlite3';

import { normalizePseudo } from '../../../shared/security/text.js';
import type { AliasRepository } from '../application/alias-repository.js';
import type { AliasRecord } from '../domain/alias-record.js';

interface AliasRow {
  id: string;
  user_id: string;
  pseudo: string;
  salon_favori: string | null;
  created_at: string;
}

const toRecord = (row: AliasRow): AliasRecord => ({
  id: row.id,
  userId: row.user_id,
  pseudo: row.pseudo,
  salonFavori: row.salon_favori,
  createdAt: row.created_at,
});

export class SqliteAliasRepository implements AliasRepository {
  constructor(private readonly database: Database) {}

  findByUserId(userId: string): AliasRecord[] {
    const rows = this.database
      .prepare(
        `
          SELECT id, user_id, pseudo, salon_favori, created_at
          FROM aliases
          WHERE user_id = ?
          ORDER BY created_at ASC
        `,
      )
      .all(userId) as AliasRow[];

    return rows.map(toRecord);
  }

  countByUserId(userId: string): number {
    const row = this.database
      .prepare('SELECT COUNT(*) as count FROM aliases WHERE user_id = ?')
      .get(userId) as { count: number };

    return row.count;
  }

  findByPseudo(pseudo: string): AliasRecord | null {
    const normalized = normalizePseudo(pseudo);
    const row = this.database
      .prepare(
        `
          SELECT id, user_id, pseudo, salon_favori, created_at
          FROM aliases
          WHERE lower(pseudo) = lower(?)
        `,
      )
      .get(normalized) as AliasRow | undefined;

    return row ? toRecord(row) : null;
  }

  findById(id: string): AliasRecord | null {
    const row = this.database
      .prepare(
        `
          SELECT id, user_id, pseudo, salon_favori, created_at
          FROM aliases
          WHERE id = ?
        `,
      )
      .get(id) as AliasRow | undefined;

    return row ? toRecord(row) : null;
  }

  create(userId: string, pseudo: string): AliasRecord {
    const created = {
      id: crypto.randomUUID(),
      userId,
      pseudo,
      salonFavori: null,
      createdAt: new Date().toISOString(),
    };

    this.database
      .prepare(
        `
          INSERT INTO aliases (id, user_id, pseudo, salon_favori, created_at)
          VALUES (@id, @userId, @pseudo, @salonFavori, @createdAt)
        `,
      )
      .run(created);

    return created;
  }

  setFavorite(aliasId: string, salonFavori: string | null): AliasRecord {
    this.database
      .prepare('UPDATE aliases SET salon_favori = ? WHERE id = ?')
      .run(salonFavori, aliasId);

    const updated = this.findById(aliasId);

    if (!updated) {
      throw new Error('Alias not found after update.');
    }

    return updated;
  }

  search(query: string): AliasRecord[] {
    const normalized = `%${normalizePseudo(query)}%`;
    const rows = this.database
      .prepare(
        `
          SELECT id, user_id, pseudo, salon_favori, created_at
          FROM aliases
          WHERE lower(pseudo) LIKE lower(?)
          ORDER BY pseudo ASC
          LIMIT 10
        `,
      )
      .all(normalized) as AliasRow[];

    return rows.map(toRecord);
  }
}
