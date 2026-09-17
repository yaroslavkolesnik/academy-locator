import { Router } from 'express';
import { AppError, ErrorCode } from '../errors.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { buildCourseDetails } from '../services/catalog.js';
import { isPubliclyVisible } from '../services/filters.js';
import { idParamSchema, parseOrThrow, registrationBodySchema } from '../validation/schemas.js';

export function createCoursesRouter({ store, getReference, writeLimit }) {
  const router = Router();

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const { id } = parseOrThrow(idParamSchema, req.params);
      const course = await store.getCourse(id);
      const [institution, { directions, categories }] = await Promise.all([
        course ? store.getInstitution(course.institutionId) : null,
        getReference(),
      ]);

      const details = buildCourseDetails({ course, institution, directions, categories });
      if (!details) throw new AppError(ErrorCode.NOT_FOUND, 'Курс не знайдено');
      res.json(details);
    }),
  );

  router.post(
    '/:id/registrations',
    writeLimit,
    asyncHandler(async (req, res) => {
      const { id } = parseOrThrow(idParamSchema, req.params);
      const input = parseOrThrow(registrationBodySchema, req.body, 'Некоректні дані форми');

      const course = await store.getCourse(id);
      const institution = course ? await store.getInstitution(course.institutionId) : null;
      if (!institution || !isPubliclyVisible(institution)) {
        throw new AppError(ErrorCode.NOT_FOUND, 'Курс не знайдено');
      }

      const { registration, course: updated } = await store.createRegistration(id, input);
      res.status(201).json({
        id: registration.id,
        courseId: registration.courseId,
        status: 'received',
        seatsLeft: updated.seatsLeft,
      });
    }),
  );

  return router;
}
