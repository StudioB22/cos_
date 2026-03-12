import { loadEnv } from '../../config/env.js';
import { createDatabase, runMigrations, runSeeds } from './database.js';

const command = process.argv[2];
const env = loadEnv();
const database = createDatabase(env.SQLITE_PATH);

if (command === 'migrate') {
  runMigrations(database);
}

if (command === 'seed') {
  runMigrations(database);
  runSeeds(database);
}

database.close();
