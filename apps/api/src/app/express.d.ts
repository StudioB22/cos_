import type { Alias } from '@cos/shared';

declare global {
  namespace Express {
    interface Request {
      sessionUserId: string | null;
      currentAliases: Alias[];
    }
  }
}

export {};
