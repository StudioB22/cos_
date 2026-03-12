import type { SessionIdentity } from '@cos/shared';

import { AppError } from '../../../shared/http/app-error.js';
import { normalizeEmail } from '../../../shared/security/text.js';
import type { AliasRepository } from '../../aliases/application/alias-repository.js';
import type { UserRepository } from './user-repository.js';

const toSessionIdentity = (
  user: { id: string; email: string; createdAt: string },
  aliases: Array<{ id: string; pseudo: string; salonFavori: string | null }>,
): SessionIdentity => ({
  user: {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    aliases,
  },
});

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly aliasRepository: AliasRepository,
  ) {}

  createOrResumeSession(email: string): SessionIdentity {
    const normalizedEmail = normalizeEmail(email);
    const existing = this.userRepository.findByEmail(normalizedEmail);
    const user = existing ?? this.userRepository.create(normalizedEmail);
    const aliases = this.aliasRepository.findByUserId(user.id);

    return toSessionIdentity(user, aliases);
  }

  getSession(userId: string): SessionIdentity {
    const user = this.userRepository.findById(userId);

    if (!user) {
      throw new AppError('UNAUTHORIZED', 'Session user was not found.', 401);
    }

    const aliases = this.aliasRepository.findByUserId(user.id);
    return toSessionIdentity(user, aliases);
  }
}
