import { createRoomInputSchema, inviteAliasInputSchema, listRoomsQuerySchema } from '@cos/shared';
import { Router } from 'express';
import { z } from 'zod';

import type { AppContext } from '../../../app/context.js';
import { asyncHandler } from '../../../shared/http/async-handler.js';
import { requireSessionUserId } from '../../../shared/http/require-session.js';

const roomParamsSchema = z.object({ roomName: z.string() });

export const roomRouter = (context: AppContext) => {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (request, response) => {
      const userId = requireSessionUserId(request);
      const input = listRoomsQuerySchema.parse(request.query);
      response.json({ rooms: context.roomService.listRooms(userId, input.alias) });
    }),
  );

  router.post(
    '/',
    asyncHandler(async (request, response) => {
      const userId = requireSessionUserId(request);
      const input = createRoomInputSchema.parse(request.body);
      const room = context.roomService.createPrivateRoom(userId, input);
      response.status(201).json({ room });
    }),
  );

  router.post(
    '/:roomName/invitations',
    asyncHandler(async (request, response) => {
      const userId = requireSessionUserId(request);
      const input = inviteAliasInputSchema.parse(request.body);
      const { roomName } = roomParamsSchema.parse(request.params);
      const room = context.roomService.inviteAlias(userId, roomName, input);
      response.status(201).json({ room });
    }),
  );

  return router;
};
