import { createAliasInputSchema, updateFavoriteInputSchema } from '@cos/shared';
import { Router } from 'express';

import type { AppContext } from '../../../app/context.js';
import { asyncHandler } from '../../../shared/http/async-handler.js';
import { requireSessionUserId } from '../../../shared/http/require-session.js';

export const aliasRouter = (context: AppContext) => {
  const router = Router();

  router.post(
    '/',
    asyncHandler(async (request, response) => {
      const userId = requireSessionUserId(request);
      const input = createAliasInputSchema.parse(request.body);

      context.aliasService.createAlias(userId, input.pseudo);
      response.status(201).json(context.authService.getSession(userId));
    }),
  );

  router.patch(
    '/favorite',
    asyncHandler(async (request, response) => {
      const userId = requireSessionUserId(request);
      const input = updateFavoriteInputSchema.parse(request.body);

      const alias = context.aliasService.setFavorite(userId, input.pseudo, input.salonFavori);
      response.json({ alias, aliases: context.aliasService.listAliases(userId) });
    }),
  );

  router.get(
    '/directory',
    asyncHandler(async (request, response) => {
      requireSessionUserId(request);
      const query = typeof request.query.query === 'string' ? request.query.query : '';
      response.json({ aliases: context.aliasService.searchAliases(query) });
    }),
  );

  return router;
};
