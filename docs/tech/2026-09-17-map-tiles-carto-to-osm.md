# Map tiles: CARTO Positron replaced by OpenStreetMap; helmet's no-referrer broke OSM

Date: 2026-09-17 · Outcome: tile provider changed, `Referrer-Policy` changed

## 1. CARTO basemaps now watermark every tile

The approved frontend spec chose CARTO Positron (`https://{s}.basemaps.cartocdn.com/light_all/...`).
In the browser the tiles loaded (HTTP 200, CSP fine) but each one carried a large "API KEY REQUIRED" watermark.
The keyless CARTO basemaps are no longer usable for a public demo.

Options weighed with the user: OpenStreetMap (no key), Stadia Maps Alidade Smooth (account + domain
allow-list), MapTiler (API key exposed in the bundle). **User chose OpenStreetMap** with muted colors:

- URL `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, attribution "© OpenStreetMap".
- `web/src/map/MapView.module.css` desaturates the tile pane (`filter: saturate(0.3) brightness(1.05) contrast(0.9)`)
  so STEAM marker colors stay the main accent.
- CSP `img-src` allows `https://tile.openstreetmap.org` only.

OSM's tile usage policy tolerates low-traffic demos; heavy production traffic would need a commercial provider.

## 2. OSM returned "Access blocked" tiles — caused by our own Referrer-Policy

After switching, every tile rendered as a yellow "403 Access blocked … tile usage policy" image, although the
requests returned HTTP 200.

- helmet's default header is `Referrer-Policy: no-referrer`, so the browser sent tile requests without `Referer`.
- `curl` against the same tile: without `Referer` → 6,987 B (the block image); with `Referer: http://localhost:3999/` → 39,117 B (real tile).

Fix in `src/app.js`: `helmet({ referrerPolicy: { policy: 'strict-origin-when-cross-origin' } })`. Third-party
requests get only the origin (no path or filter query), which satisfies OSM. Covered by
`tests/api/spa.test.js` ("Referrer-Policy передає лише origin…").

## Notes for later

- The spec (`docs/specs/2026-09-17-academy-locator-frontend-design.md`) and plan still say CARTO; they are dated
  documents and are not rewritten — this file supersedes them on tiles.
- Adding any other external resource: extend CSP and check the Referer requirements of the provider.
