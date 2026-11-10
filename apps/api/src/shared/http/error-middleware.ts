import type { NextFunction, Request, Response } from 'express';

import { toApiError } from './to-api-error.js';

export const errorMiddleware = (
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
) => {
  const { status, body } = toApiError(error);
  return response.status(status).json(body);
};
