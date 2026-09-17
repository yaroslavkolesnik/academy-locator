import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { toRecommendationItems } from '../services/catalog.js';
import { buildMapFilters, recommend } from '../services/recommend.js';
import { parseOrThrow } from '../validation/schemas.js';

export function createRecommendationsRouter({ loadCatalog, getSchemas, writeLimit }) {
  const router = Router();

  router.post(
    '/',
    writeLimit,
    asyncHandler(async (req, res) => {
      const input = parseOrThrow((await getSchemas()).recommendations, req.body, 'Некоректні відповіді квізу');
      const catalog = await loadCatalog();
      res.json({
        filters: buildMapFilters(input, catalog.directions),
        items: toRecommendationItems(recommend(input, catalog)),
      });
    }),
  );

  return router;
}
