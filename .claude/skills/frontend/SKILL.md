---
name: frontend
description: Architecture and procedures for the Academy Locator React frontend in web/ (map, panels, filters in the URL, forms, quiz, admin) and how to verify it in the browser. Use when changing anything under web/, adding a screen or panel, touching the map, markers or tiles, writing frontend tests, or debugging the built app served from public/.
---

# Frontend

## Shape

- `web/` is the Vite root (React 19, react-router **7.18** — not 8.x, different API; react-leaflet 5).
  `npm run build` writes to `public/` (git-ignored); Express serves it with an SPA fallback (`src/app.js`).
  Render builds it with `npm ci --include=dev && npm run build`.
- One `package.json` for backend and frontend. Frontend never imports from `src/`; copy tiny helpers
  (`web/src/map/geo.js` mirrors `isWithinBounds`).
- Dev loop: `npm run dev` (API) + `npm run dev:web` (Vite :5173, proxies `/api`; override with
  `API_PROXY_TARGET`). CSP and Referrer-Policy apply only to the built app — check tiles against
  `npm run build` + `npm start`.
- Map tiles: OpenStreetMap (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`), desaturated by CSS in
  `map/MapView.module.css`. CARTO now requires a key. OSM needs a `Referer`, so the server sends
  `Referrer-Policy: strict-origin-when-cross-origin` — see `docs/tech/2026-09-17-map-tiles-carto-to-osm.md`.
  A new external resource needs a CSP directive in `src/app.js` plus a test in `tests/api/spa.test.js`.

## State model

- **The URL is the state.** Route = screen (`/`, `/institutions/:id`, `/institutions/:id/:slug`,
  `/courses/:courseId`, `/add`, `/quiz` over results, `/admin` outside the map layout). Query = filters
  (`q`, `category`, `direction`, `age`, `price`, `format`, `type`, `near`). Pure helpers in
  `web/src/state/filters.js`; `useFilters()` writes with `replace`; keep filters on every in-app link with `useLinkTo()`.
- `MetaProvider` loads `/api/meta` once: `useMeta()` gives labels, age groups, `colorByCode` — never hardcode
  STEAM colors.
- `MapProvider` (inside `MapLayout`) owns markers (`/api/institutions` with current filters,
  `keepPreviousData`), `selectedId` (panels call `useSelectedInstitution(id)`), quiz highlight (auto-clears when
  the filters string changes), `pickPoint` for `/add`, geolocation (`enableNear`, `locate`) and
  `refreshCatalog()` after writes.
- Reads: `useApi(path, { query, headers, refreshKey, keepPreviousData, enabled })` — aborts stale requests, sets
  `slow` after 3 s (Render cold start). Writes: `request()`; errors are `ApiError { code, message, details }`;
  map `details` to fields with `forms/formErrors.js#mapFieldErrors`.
- Quiz → map: `quiz/quizInput.js#resultMapFilters` adds every recommended course's direction, otherwise
  category-level recommendations disappear from the map.

## Procedure: add a panel (screen)

1. Spec and plan approved (CLAUDE.md hard rule 1).
2. Pure logic first in a `*.js` module with a `*.spec.js`.
3. Component in `web/src/panels/` (or a feature folder) with `Panels.module.css` shared classes
   (`section`, `stack`, `eyebrow`, `title`, `muted`, `notice`, `list`, `dot`):
   loading → `Skeleton` (pass `slow`), `NOT_FOUND` → `NotFoundPanel`, other errors → `ErrorState` with `reload`.
4. Route in `web/src/App.jsx` inside `<Route element={<MapLayout />}>` before `*`.
5. Spec: `renderWithProviders(<MapProvider><Panel /></MapProvider>, { route, path })` + `mockFetch({...})` from
   `web/src/testing/fixtures.jsx` (longest prefix wins; add fixtures in the real API shape).
6. `npm run test:web`, then verify in the browser (below).

## Conventions and pitfalls

- Test helpers live in `web/src/testing/`, **not** `web/src/test/`: `node --test` runs every `.js` under any
  folder named `test`. Frontend specs are `*.spec.{js,jsx}`.
- Named exports; CSS Modules next to components; tokens in `web/src/styles/tokens.css`; no inline style objects
  except CSS custom properties (`style={{ '--dot-color': color }}`).
- UI text Ukrainian with `’`; icons only from `lucide-react` (quiz emoji mapped in `quiz/icons.js`).
- Chips/options are `<button aria-pressed>`; dialogs use `ui/Dialog.jsx` (native `<dialog>`); forms use
  `ui/Field.jsx` (label, hint, error wiring).
- Marker HTML is a string for Leaflet — pass every data string through `escapeHtml` (submission names are public input).
- Animate `transform`/`opacity`, not `height`/`width` (the design hook flags it). Muted cards use a muted
  background + muted title, not `opacity` (contrast dropped to 2.9:1).
- Focus after async validation: `setTimeout(..., 0)`, not `requestAnimationFrame` (paused in background tabs).
- DOM order in `layout/MapLayout.jsx` is the Tab order (panel → actions → map); `.map { z-index: 0 }` keeps
  Leaflet panes under the panel.
- Desktop breakpoint `min-width: 1024px` via `useMediaQuery(DESKTOP_QUERY)`; mobile uses the bottom sheet
  (`layout/Panel.jsx`, snaps `peek|half|full`, `useSheet().setSnap`). jsdom has no `matchMedia` → tests run in mobile layout.

## Verify in the browser

1. `npm run build`, then skill `verify-api` step 1 (server on port 3999, MemoryStore, `ADMIN_TOKEN=smoke-token`).
2. `claude-in-chrome`. The controlled window is **hidden**: `resize_window` does not change the viewport,
   screenshots often time out (retry once), CSS transitions and rAF are paused.
   - Drive flows with `javascript_tool` (click via DOM, set React inputs through the native value setter +
     `input` event). `aside form` also matches the search form — use `form:not([role=search])`.
   - Responsive checks: replace the body of a same-origin page with `<iframe width height src=route>` and measure
     inside it; loops longer than 45 s must run in the page background and be polled.
3. Read the console with a pattern (`Content Security Policy|Refused|rror`) after a reload.
4. Stop the server (skill `verify-api` step 3); report which checks were not possible in the hidden window.
