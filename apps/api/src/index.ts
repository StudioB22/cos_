import { createApp } from './app/create-app.js';
import { createAppContext } from './app/context.js';
import { loadEnv } from './config/env.js';
import { createDatabase, runMigrations, runSeeds } from './shared/db/database.js';

const env = loadEnv();
const database = createDatabase(env.SQLITE_PATH);

runMigrations(database);
runSeeds(database);

const context = createAppContext(database, env);
const { httpServer } = createApp(context);

httpServer.listen(env.API_PORT, () => {
  console.log(`COS_ API listening on http://localhost:${env.API_PORT}`);
});
