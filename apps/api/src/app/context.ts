import type { Env } from '../config/env.js';
import type { SqliteDatabase } from '../shared/db/database.js';
import { AliasService } from '../features/aliases/application/alias-service.js';
import { SqliteAliasRepository } from '../features/aliases/infrastructure/sqlite-alias-repository.js';
import { AuthService } from '../features/auth/application/auth-service.js';
import { SqliteUserRepository } from '../features/auth/infrastructure/sqlite-user-repository.js';
import { RealtimeService } from '../features/realtime/application/realtime-service.js';
import { InMemoryRealtimeStore } from '../features/realtime/infrastructure/in-memory-realtime-store.js';
import { RoomService } from '../features/rooms/application/room-service.js';
import { SqliteRoomRepository } from '../features/rooms/infrastructure/sqlite-room-repository.js';

export const createAppContext = (database: SqliteDatabase, env: Env) => {
  const userRepository = new SqliteUserRepository(database);
  const aliasRepository = new SqliteAliasRepository(database);
  const roomRepository = new SqliteRoomRepository(database);
  const authService = new AuthService(userRepository, aliasRepository);
  const aliasService = new AliasService(aliasRepository, roomRepository);
  const roomService = new RoomService(roomRepository, aliasRepository);
  const realtimeStore = new InMemoryRealtimeStore();
  const realtimeService = new RealtimeService(roomRepository, aliasRepository, realtimeStore);

  return {
    env,
    authService,
    aliasService,
    roomService,
    realtimeService,
  };
};

export type AppContext = ReturnType<typeof createAppContext>;
