import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { AGE_GROUPS, FORMATS, INSTITUTION_TYPES, LEVELS, PRICE_OPTIONS } from '../validation/schemas.js';

const REFERENCE_CACHE = 'public, max-age=300';

export function createMetaRouter({ store, getReference }) {
  const router = Router();

  router.get('/health', (req, res) => {
    res.json({ status: 'ok', store: store.kind, uptimeSec: Math.round(process.uptime()) });
  });

  router.get(
    '/meta',
    asyncHandler(async (req, res) => {
      const { city, categories, directions } = await getReference();
      const { dataNotice, ...cityInfo } = city;
      res.set('Cache-Control', REFERENCE_CACHE).json({
        city: cityInfo,
        categories,
        directions: directions.map(({ id, slug, name, categoryCode, keywords }) => ({
          id,
          slug,
          name,
          categoryCode,
          keywords,
        })),
        institutionTypes: INSTITUTION_TYPES,
        formats: FORMATS,
        ageGroups: AGE_GROUPS,
        levels: LEVELS,
        priceOptions: PRICE_OPTIONS,
        dataNotice,
      });
    }),
  );

  router.get(
    '/quiz',
    asyncHandler(async (req, res) => {
      const { quiz } = await getReference();
      res.set('Cache-Control', REFERENCE_CACHE).json(quiz);
    }),
  );

  return router;
}
