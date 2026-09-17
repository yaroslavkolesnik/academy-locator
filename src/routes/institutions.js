import { Router } from 'express';
import { AppError, ErrorCode } from '../errors.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  buildDirectionCourses,
  buildInstitutionCard,
  buildInstitutionMarkers,
  toPublicInstitution,
} from '../services/catalog.js';
import { directionCoursesParamsSchema, idParamSchema, parseOrThrow } from '../validation/schemas.js';

export function createInstitutionsRouter({ store, loadCatalog, getSchemas, writeLimit }) {
  const router = Router();

  const parseFilters = async (req) => parseOrThrow((await getSchemas()).filters, req.query);

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const filters = await parseFilters(req);
      res.json(buildInstitutionMarkers(await loadCatalog(), filters));
    }),
  );

  // «Додати заклад»: заявка одразу з'являється на карті зі статусом pending
  router.post(
    '/',
    writeLimit,
    asyncHandler(async (req, res) => {
      const input = parseOrThrow((await getSchemas()).submission, req.body, 'Некоректні дані форми');
      const institution = await store.createInstitution(input);
      res.status(201).json({ institution: toPublicInstitution(institution) });
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = parseOrThrow(idParamSchema, req.params);
      const filters = await parseFilters(req);
      const card = buildInstitutionCard(await loadCatalog(), id, filters);
      if (!card) throw new AppError(ErrorCode.NOT_FOUND, 'Заклад не знайдено');
      res.json(card);
    }),
  );

  router.get(
    '/:id/directions/:slug/courses',
    asyncHandler(async (req, res) => {
      const { id, slug } = parseOrThrow(directionCoursesParamsSchema, req.params);
      const filters = await parseFilters(req);
      const result = buildDirectionCourses(await loadCatalog(), id, slug, filters);
      if (!result) throw new AppError(ErrorCode.NOT_FOUND, 'Заклад не знайдено');
      if (result.directionNotFound) throw new AppError(ErrorCode.NOT_FOUND, 'Напрямок не знайдено');
      res.json(result);
    }),
  );

  return router;
}
