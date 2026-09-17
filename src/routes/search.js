import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { buildSuggestions } from '../services/catalog.js';
import { parseOrThrow, suggestQuerySchema } from '../validation/schemas.js';

export function createSearchRouter({ loadCatalog }) {
  const router = Router();

  router.get(
    '/suggest',
    asyncHandler(async (req, res) => {
      const { q } = parseOrThrow(suggestQuerySchema, req.query);
      res.json(buildSuggestions(await loadCatalog(), q));
    }),
  );

  return router;
}
