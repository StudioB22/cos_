import type { NextFunction, Request, Response } from 'express';

import { AppError } from './app-error.js';

export const errorMiddleware = (
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
) => {
  if (error instanceof AppError) {
    return response.status(error.status).json({
      code: error.code,
      message: error.message,
      details: error.details,
    });
  }

  const message = error instanceof Error ? error.message : 'Unknown server error';
  return response.status(500).json({
    code: 'INTERNAL_ERROR',
    message,
  });
};
