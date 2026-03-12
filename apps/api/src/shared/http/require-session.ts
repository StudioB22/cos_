import type { Request } from 'express';

import { AppError } from './app-error.js';

export const requireSessionUserId = (request: Request): string => {
  if (!request.sessionUserId) {
    throw new AppError('UNAUTHORIZED', 'Authentication required.', 401);
  }

  return request.sessionUserId;
};
