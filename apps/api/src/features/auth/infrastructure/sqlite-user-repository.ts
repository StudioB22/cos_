import type { Database } from 'better-sqlite3';

import type { UserRepository } from '../application/user-repository.js';
import type { UserRecord } from '../domain/user-record.js';

interface UserRow {
  id: string;
  email: string;
  created_at: string;
}

const toRecord = (row: UserRow): UserRecord => ({
  id: row.id,
  email: row.email,
  createdAt: row.created_at,
});

export class SqliteUserRepository implements UserRepository {
  constructor(private readonly database: Database) {}

  findByEmail(email: string): UserRecord | null {
    const row = this.database
      .prepare('SELECT id, email, created_at FROM users WHERE email = ?')
      .get(email) as UserRow | undefined;

    return row ? toRecord(row) : null;
  }

  findById(id: string): UserRecord | null {
    const row = this.database
      .prepare('SELECT id, email, created_at FROM users WHERE id = ?')
      .get(id) as UserRow | undefined;

    return row ? toRecord(row) : null;
  }

  create(email: string): UserRecord {
    const created = {
      id: crypto.randomUUID(),
      email,
      createdAt: new Date().toISOString(),
    };

    this.database
      .prepare('INSERT INTO users (id, email, created_at) VALUES (@id, @email, @createdAt)')
      .run(created);

    return created;
  }
}
