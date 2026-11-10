import type { ApiError } from '@cos/shared';
import { ZodError } from 'zod';

import { AppError } from './app-error.js';

/** One mapping for both transports (HTTP, Socket.io): internal messages never reach the client. */
export const toApiError = (error: unknown): { status: number; body: ApiError } => {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: { code: error.code, message: error.message, details: error.details },
    };
  }

  if (error instanceof ZodError) {
    return {
      status: 400,
      body: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload.',
        details: error.flatten(),
      },
    };
  }

  console.error(error);
  return { status: 500, body: { code: 'INTERNAL_ERROR', message: 'Unexpected server error.' } };
};
