import http from 'node:http';

import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { Server } from 'socket.io';

import { authRouter } from '../features/auth/presentation/auth-router.js';
import { aliasRouter } from '../features/aliases/presentation/alias-router.js';
import { registerRealtimeHandlers } from '../features/realtime/presentation/register-realtime-handlers.js';
import { roomRouter } from '../features/rooms/presentation/room-router.js';
import type { AppContext } from './context.js';
import { errorMiddleware } from '../shared/http/error-middleware.js';
import { createSessionMiddleware } from '../shared/http/session-middleware.js';

export const createApp = (context: AppContext) => {
  const app = express();
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: context.env.ALLOWED_ORIGIN,
      credentials: true,
    },
  });

  app.use(
    cors({
      origin: context.env.ALLOWED_ORIGIN,
      credentials: true,
    }),
  );
  app.use(helmet());
  app.use(express.json());
  app.use(...createSessionMiddleware(context.env.COOKIE_SECRET));

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok', service: 'cos-api' });
  });

  const authRateLimit = rateLimit({
    windowMs: 60_000,
    limit: 8,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/auth', authRateLimit);
  app.use('/auth', authRouter(context));
  app.use('/aliases', aliasRouter(context));
  app.use('/salons', roomRouter(context));
  app.use(errorMiddleware);

  registerRealtimeHandlers(io, context);

  return { app, httpServer, io };
};
