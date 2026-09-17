import { Router } from 'express';
import { AppError, ErrorCode } from '../errors.js';
import { createAdminAuth } from '../middleware/adminAuth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { buildAdminRegistrations } from '../services/catalog.js';
import { byCreatedAtDesc } from '../store/records.js';
import { idParamSchema, institutionStatusBodySchema, parseOrThrow } from '../validation/schemas.js';

// Підключається лише коли задано ADMIN_TOKEN. Відповіді містять персональні дані — не кешуються.
export function createAdminRouter({ store, loadCatalog, adminToken }) {
  const router = Router();
  router.use(createAdminAuth(adminToken));

  router.get(
    '/submissions',
    asyncHandler(async (req, res) => {
      const institutions = await store.listInstitutions();
      const items = institutions.filter((i) => i.status === 'pending').sort(byCreatedAtDesc);
      res.json({ items });
    }),
  );

  router.patch(
    '/institutions/:id',
    asyncHandler(async (req, res) => {
      const { id } = parseOrThrow(idParamSchema, req.params);
      const { status } = parseOrThrow(institutionStatusBodySchema, req.body);
      const institution = await store.updateInstitutionStatus(id, status);
      if (!institution) throw new AppError(ErrorCode.NOT_FOUND, 'Заклад не знайдено');
      res.json({ institution });
    }),
  );

  router.get(
    '/registrations',
    asyncHandler(async (req, res) => {
      const [registrations, catalog] = await Promise.all([store.listRegistrations(), loadCatalog()]);
      res.json({ items: buildAdminRegistrations(registrations, catalog) });
    }),
  );

  return router;
}
