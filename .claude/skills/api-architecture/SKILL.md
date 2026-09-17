---
name: api-architecture
description: Architecture of the Academy Locator API and the procedure for adding or changing an endpoint. Use when touching src/ (routes, services, store, validation, middleware), adding a response field, changing filter or recommendation behavior, or deciding where new code belongs.
---

# API architecture

## Layers

```
src/server.js     loads .env, createStore(), createApp(), listen, SIGTERM → store.close()
src/app.js        createApp({ store, config, logger, publicDir }) — middleware, routers, shared deps; no listen;
                  also serves public/ (built frontend) with an SPA fallback, CSP + Referrer-Policy for map tiles
src/routes/*      parse input (parseOrThrow) → call services → res.json; nothing else
src/services/*    pure functions over plain arrays; build every response body
src/store/*       memoryStore | mongoStore with one async interface
src/validation/schemas.js   Zod schemas + ALL enums and labels
src/errors.js + middleware/errorHandler.js   AppError(code) → HTTP status
```

Routes never shape responses by hand and never import the store implementation directly — they receive
`deps = { store, getReference, getSchemas, loadCatalog, writeLimit }` from `app.js`.

## Store contract

Methods (all async): `getReference, listInstitutions, getInstitution, listCourses({institutionId}),
getCourse, createInstitution, updateInstitutionStatus, createRegistration(courseId, input),
listRegistrations, close`, plus `kind: 'memory' | 'mongo'`.

- `store/index.js#createStore` picks Mongo when `MONGODB_URI` connects, else memory (warning logged).
- New documents are built only in `store/records.js` (server sets `id`, `status`, `source`, `createdAt`),
  so both stores produce identical shapes and clients cannot set service fields.
- Reference data (city, categories, directions, quiz) always comes from `data/seed/*.json`, even in Mongo mode.
- Seat booking is atomic: Mongo `findOneAndUpdate({ seatsLeft: { $gt: 0 } }, $inc -1)`; memory decrements
  with no `await` between check and write. `seatsLeft: null` = unlimited. Errors: `NOT_FOUND`, `NO_SEATS`.
- Changing the interface → update both stores and `tests/store/storeContract.js` (runs against both).

## Behavior that spans files

- **Filters** (`services/filters.js`): list values OR, different filters AND; age = range overlap
  (`course.ageMin <= ageTo && course.ageMax >= ageFrom`); `q` requires every token across course title,
  direction name + keywords, institution names. `type` and `lat/lng` are not course filters.
- **Map rule** (`applyFilters`): hide `rejected`; `pending` is public; with any course filter active keep only
  institutions with ≥1 matching course. Institution cards never hide directions — they report `matchedCourseCount`.
- **Private fields**: pass every public institution through `catalog.js#toPublicInstitution` (strips `contactPerson`).
  Admin routes return full documents.
- **Recommendations** (`services/recommend.js`): hard = age, `price: 'free'`, seats > 0, institution `approved`,
  interest match when interests given; soft weights = direction 0.5 > category 0.25, format 0.3, distance 0.2
  (linear to 10 km); normalized to 0..1; best course per institution first, then fill.
- **Schemas that depend on reference data** (direction ids, city bounds) are factories; `app.js#getSchemas`
  builds them once. Query lists accept `a,b` and repeated params; empty params are ignored.
- **Errors**: throw `new AppError(ErrorCode.X, 'Ukrainian message', details?)`. Status map lives in
  `middleware/errorHandler.js`; unknown errors → generic 500 and a log line. Body:
  `{ error: { code, message, details? } }`.
- **Limits and admin**: global `/api` rate limit; one shared `writeLimit` instance on every POST route;
  `/api/admin` is mounted only when `ADMIN_TOKEN` is set (else 404), auth via `X-Admin-Token`, `no-store`.
- Express 4 does not catch async errors: wrap handlers in `asyncHandler`.

## Procedure: add or change an endpoint

Spec and plan must already be approved (CLAUDE.md hard rule 1).

1. **Schema** — add or extend a Zod schema in `src/validation/schemas.js`; reuse `listParam`, `optionalField`,
   existing enums. Reference-dependent → extend the factory and `getSchemas` in `app.js`.
2. **Test first** — add cases to `tests/api/<area>.test.js` using `makeApp()` from `tests/helpers/app.js`
   (`makeApp({ env: { ADMIN_TOKEN: 'x' } })`, `makeApp({ store })` for custom stores). Cover 2xx, 400 with the
   `details[].path`, 404/409 where relevant. Service logic gets a unit test in `tests/services/`.
3. **Service** — response builder in `src/services/catalog.js` (or a new pure module in `services/`).
4. **Route** — in the matching `src/routes/*.js`: `asyncHandler`, `parseOrThrow` for params/query/body,
   `writeLimit` on POST, throw `AppError` for 404/409.
5. **Wire** — new router → `app.js` before `notFoundHandler`.
6. **Docs** — update the endpoint table in `README.md`.
7. **Verify** — `npm test`; for user-visible flows also skill `verify-api`.
