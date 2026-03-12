import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';

import request from 'supertest';

import { createAppContext } from '../../src/app/context.js';
import { createApp } from '../../src/app/create-app.js';
import type { Env } from '../../src/config/env.js';
import { createDatabase, runMigrations, runSeeds } from '../../src/shared/db/database.js';

export const createTestHarness = () => {
  const directory = mkdtempSync(join(tmpdir(), 'cos-api-'));
  const sqlitePath = join(directory, 'cos.sqlite');
  const env: Env = {
    NODE_ENV: 'test',
    API_PORT: 0,
    SQLITE_PATH: sqlitePath,
    COOKIE_SECRET: 'test-secret-123',
    ALLOWED_ORIGIN: 'http://localhost:4173',
  };

  const database = createDatabase(sqlitePath);
  runMigrations(database);
  runSeeds(database);

  const context = createAppContext(database, env);
  const { app, httpServer, io } = createApp(context);

  return {
    env,
    context,
    app,
    io,
    httpServer,
    request: request(app),
    async listen() {
      await new Promise<void>((resolve) => {
        httpServer.listen(0, () => resolve());
      });

      return (httpServer.address() as AddressInfo).port;
    },
    async close() {
      io.close();
      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
      });
      database.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
};
