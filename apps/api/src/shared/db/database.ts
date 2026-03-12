import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import Database from 'better-sqlite3';

import { publicRoomsSeed } from './public-room-seed.js';

export type SqliteDatabase = Database.Database;

const migrationStatements = [
  `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS aliases (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      pseudo TEXT NOT NULL UNIQUE,
      salon_favori TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (salon_favori) REFERENCES salons(nom) ON DELETE SET NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS salons (
      id TEXT PRIMARY KEY,
      nom TEXT NOT NULL UNIQUE,
      desc TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('public', 'private')),
      owner_alias_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (owner_alias_id) REFERENCES aliases(id) ON DELETE SET NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS salon_memberships (
      salon_id TEXT NOT NULL,
      alias_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('owner', 'member')),
      created_at TEXT NOT NULL,
      PRIMARY KEY (salon_id, alias_id),
      FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
      FOREIGN KEY (alias_id) REFERENCES aliases(id) ON DELETE CASCADE
    )
  `,
  'CREATE INDEX IF NOT EXISTS idx_aliases_user_id ON aliases (user_id)',
  'CREATE INDEX IF NOT EXISTS idx_memberships_alias_id ON salon_memberships (alias_id)',
  'CREATE INDEX IF NOT EXISTS idx_salons_type ON salons (type)',
];

export const createDatabase = (path: string): SqliteDatabase => {
  mkdirSync(dirname(path), { recursive: true });
  const database = new Database(path);
  database.pragma('foreign_keys = ON');
  return database;
};

export const runMigrations = (database: SqliteDatabase) => {
  const transaction = database.transaction(() => {
    for (const statement of migrationStatements) {
      database.exec(statement);
    }
  });

  transaction();
};

export const runSeeds = (database: SqliteDatabase) => {
  const insertRoom = database.prepare(
    `
      INSERT OR IGNORE INTO salons (id, nom, desc, type, owner_alias_id, created_at)
      VALUES (@id, @nom, @desc, @type, NULL, @created_at)
    `,
  );

  const transaction = database.transaction(() => {
    for (const room of publicRoomsSeed) {
      insertRoom.run({
        id: crypto.randomUUID(),
        nom: room.nom,
        desc: room.desc,
        type: room.type,
        created_at: new Date().toISOString(),
      });
    }
  });

  transaction();
};
