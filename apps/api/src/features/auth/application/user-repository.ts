import type { UserRecord } from '../domain/user-record.js';

export interface UserRepository {
  findByEmail(email: string): UserRecord | null;
  findById(id: string): UserRecord | null;
  create(email: string): UserRecord;
}
