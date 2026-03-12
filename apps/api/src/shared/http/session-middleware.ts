import cookieParser from 'cookie-parser';
import type { RequestHandler } from 'express';

import { sessionCookieName } from '../../config/session.js';

export const createSessionMiddleware = (cookieSecret: string): RequestHandler[] => [
  cookieParser(cookieSecret),
  (request, _response, next) => {
    const signedValue = request.signedCookies?.[sessionCookieName];
    request.sessionUserId = typeof signedValue === 'string' ? signedValue : null;
    request.currentAliases = [];
    next();
  },
];
