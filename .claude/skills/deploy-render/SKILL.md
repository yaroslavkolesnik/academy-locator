---
name: deploy-render
description: Deploying Academy Locator to Render with MongoDB Atlas — render.yaml, environment variables, Atlas network access, post-deploy checks, free-tier sleep, and how the built frontend, CSP and map tiles are served. Use when preparing or debugging a deploy, changing render.yaml or env vars, or adding frontend assets that load external resources.
---

# Deploy to Render

The user pushes to GitHub themselves. Do not run `git push`, create remotes or trigger deploys; prepare
changes and tell the user what to push and what to click.

## Blueprint (`render.yaml`)

- Must sit at the **repository root**. If the repo root is a parent folder, add `rootDir: academy-locator`.
- One free web service in `frankfurt`, `NODE_VERSION=22`, `npm ci --include=dev && npm run build` → `npm start`, `healthCheckPath: /api/health`,
  `autoDeploy: true` (every push to the default branch deploys).
- Env vars: `MONGODB_URI` (`sync: false`, entered in the Render UI), `MONGODB_DB=academy_locator`,
  `ADMIN_TOKEN` (`generateValue: true`, visible in Dashboard → Environment), optional `CORS_ORIGIN`.
- A new env var in code → add it to `src/config.js`, `.env.example`, the README table and, if needed in
  production, `render.yaml`.

## First deploy checklist (for the user)

1. Atlas → **Network Access** → allow `0.0.0.0/0` (Render free has no static outbound IPs).
2. Render → **New → Blueprint** → select the repo → enter `MONGODB_URI`.
3. Open `https://<service>.onrender.com/api/health` → expect `"store":"mongo"`.
   `"store":"memory"` means Mongo was unreachable: Network Access, wrong URI or DB user password — the service
   still runs, but writes vanish on restart.
4. Optional before a demo: `npm run seed -- --reset` against the demo DB (skill `mongo-ops`).

## Free tier behavior

- Sleeps after ~15 min without requests; the first request takes up to a minute. Open `/api/health` a few
  minutes before presenting.
- The filesystem is ephemeral — anything not in MongoDB is lost on restart or redeploy.
- `trust proxy` is set to `1` in `app.js` for Render's single proxy; rate limits depend on it.

## Frontend on the same service

- Render builds it: `npm ci --include=dev && npm run build` (dev dependencies are needed for Vite even with
  `NODE_ENV=production`). `public/` is git-ignored.
- `src/app.js` serves `public/` (hashed `assets/` cached as immutable, `index.html` no-cache) and falls back to
  `index.html` for client routes; `/api/*` is never intercepted.
- CSP is helmet's default plus `img-src https://tile.openstreetmap.org`. Fonts and Leaflet are bundled, so no CDN
  entries. `Referrer-Policy: strict-origin-when-cross-origin` is required — OSM serves "Access blocked" tiles to
  requests without `Referer` (`docs/tech/2026-09-17-map-tiles-carto-to-osm.md`).
- OSM's tile policy tolerates a low-traffic demo; real traffic needs a commercial tile provider (new CSP entry +
  test in `tests/api/spa.test.js`).
- Geolocation ("Поруч зі мною") works only on HTTPS or localhost — test it on the Render URL, not over LAN IP.
