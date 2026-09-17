import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createErrorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createRateLimit } from './middleware/rateLimits.js';
import { createAdminRouter } from './routes/admin.js';
import { createCoursesRouter } from './routes/courses.js';
import { createInstitutionsRouter } from './routes/institutions.js';
import { createMetaRouter } from './routes/meta.js';
import { createRecommendationsRouter } from './routes/recommendations.js';
import { createSearchRouter } from './routes/search.js';
import {
  createCatalogFiltersSchema,
  createInstitutionSubmissionSchema,
  createRecommendationsBodySchema,
} from './validation/schemas.js';

const PUBLIC_DIR = fileURLToPath(new URL('../public/', import.meta.url));

// Налаштований Express-додаток без listen — використовується server.js і тестами
export function createApp({ store, config, logger = console, publicDir = PUBLIC_DIR }) {
  const app = express();

  // Render ставить один проксі перед сервісом — потрібно для коректного IP у rate limit
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // CSP за замовчуванням helmet + тайли карти OpenStreetMap (усе інше — з власного домену)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { 'img-src': ["'self'", 'data:', 'https://tile.openstreetmap.org'] },
      },
      // Тайли OSM без заголовка Referer повертають заглушку «Access blocked»; стороннім сайтам іде лише origin
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );
  app.use(compression());
  if (config.corsOrigins.length > 0) app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '20kb' }));

  // Довідники не змінюються під час роботи процесу — читаємо один раз
  let referencePromise;
  const getReference = () => {
    referencePromise ??= store.getReference().catch((err) => {
      referencePromise = undefined;
      throw err;
    });
    return referencePromise;
  };

  // Схеми, що залежать від довідників (напрямки, межі міста)
  let schemasPromise;
  const getSchemas = () => {
    schemasPromise ??= getReference().then(({ city, directions }) => {
      const directionIds = directions.map((d) => d.id);
      return {
        filters: createCatalogFiltersSchema({ directionIds }),
        submission: createInstitutionSubmissionSchema({ bounds: city.bounds, directionIds }),
        recommendations: createRecommendationsBodySchema({ directionIds }),
      };
    });
    return schemasPromise;
  };

  const loadCatalog = async () => {
    const [institutions, courses, { directions, categories }] = await Promise.all([
      store.listInstitutions(),
      store.listCourses(),
      getReference(),
    ]);
    return { institutions, courses, directions, categories };
  };

  // Один спільний лічильник для всіх POST-запитів
  const writeLimit = createRateLimit(config.writeRateLimit);
  const deps = { store, getReference, getSchemas, loadCatalog, writeLimit };

  const api = express.Router();
  api.use(createRateLimit(config.rateLimit));
  api.use(createMetaRouter(deps));
  api.use('/institutions', createInstitutionsRouter(deps));
  api.use('/courses', createCoursesRouter(deps));
  api.use('/search', createSearchRouter(deps));
  api.use('/recommendations', createRecommendationsRouter(deps));
  if (config.adminToken) api.use('/admin', createAdminRouter({ ...deps, adminToken: config.adminToken }));
  api.use(notFoundHandler);

  app.use('/api', api);
  // Зібраний фронтенд: хешовані assets кешуються назавжди, index.html — ні
  app.use(
    express.static(publicDir, {
      index: false,
      setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.set('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    }),
  );

  // SPA fallback: клієнтські маршрути (/institutions/khpi) після перезавантаження віддають index.html
  const indexHtml = path.join(publicDir, 'index.html');
  app.get(/^(?!\/api(\/|$)).*/, (req, res, next) => {
    if (path.extname(req.path) || !existsSync(indexHtml)) return next();
    res.set('Cache-Control', 'no-cache');
    res.sendFile(indexHtml);
  });

  app.use(createErrorHandler({ logger }));
  return app;
}
