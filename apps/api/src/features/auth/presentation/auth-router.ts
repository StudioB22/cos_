import { authSessionInputSchema } from '@cos/shared';
import { Router } from 'express';

import type { AppContext } from '../../../app/context.js';
import { sessionCookieMaxAgeMs, sessionCookieName } from '../../../config/session.js';
import { asyncHandler } from '../../../shared/http/async-handler.js';
import { requireSessionUserId } from '../../../shared/http/require-session.js';

const sessionCookieOptions = (isProduction: boolean) => ({
  httpOnly: true,
  signed: true,
  sameSite: 'lax' as const,
  secure: isProduction,
  maxAge: sessionCookieMaxAgeMs,
});

export const authRouter = (context: AppContext) => {
  const router = Router();

  router.post(
    '/session',
    asyncHandler(async (request, response) => {
      const input = authSessionInputSchema.parse(request.body);
      const session = context.authService.createOrResumeSession(input.email);

      response.cookie(
        sessionCookieName,
        session.user.id,
        sessionCookieOptions(context.env.NODE_ENV === 'production'),
      );

      response.status(201).json(session);
    }),
  );

  router.post(
    '/logout',
    asyncHandler(async (_request, response) => {
      response.clearCookie(sessionCookieName, {
        httpOnly: true,
        signed: true,
        sameSite: 'lax',
      });

      response.status(204).send();
    }),
  );

  router.get(
    '/me',
    asyncHandler(async (request, response) => {
      const userId = requireSessionUserId(request);
      const session = context.authService.getSession(userId);
      response.json(session);
    }),
  );

  return router;
};
