# Frontend QA pass (Phase F5, Task 17)

Date: 2026-09-17 · Build: `npm run build` → JS 495 KB (156 KB gzip), CSS 54 KB (18 KB gzip) ·
Server: MemoryStore, `ADMIN_TOKEN=smoke-token`, port 3999

## How it was checked

The Chrome window driven by the claude-in-chrome extension stays hidden: `resize_window` does not change the
viewport, screenshots often time out, CSS transitions/animations and `requestAnimationFrame` are paused.
Therefore responsive checks ran inside same-origin iframes of exact sizes (`/nope` page body replaced by an
`<iframe width height src=route>`), measured via DOM APIs. Long loops ran in the page background
(`window.__qa`) because one `javascript_exec` call is limited to 45 s.

Matrix: 375×812, 768×1024, 1024×768, 1440×900 × `/`, `/institutions/khpi`, `/institutions/khpi/robotics`,
`/courses/khpi-robotics-arduino`, `/add`, `/quiz`, `/admin`. Per page: horizontal scroll, map controls
overlapping the top bar or panel, desktop actions overlapping the panel, open dialog outside the viewport,
visible text under 12px, interactive targets under 36px.

## Findings and fixes

| # | Finding | Fix |
|---|---|---|
| 1 | Bottom-sheet handle 28px high (touch target) | `layout/Panel.module.css`: `min-height: var(--touch-target)` |
| 2 | Contact links on the institution card and the institution link on the course page had ~20px hit areas | `InstitutionPanel.module.css` `.contacts a`, `CourseDetailsPanel.module.css` `.institution`: inline-flex, 44px min-height |
| 3 | Muted cards used `opacity: 0.6`; muted grey text then had contrast **2.88:1** (title 4.69:1) | `InstitutionPanel.module.css`, `CourseCard.module.css`: muted state = `--color-surface-muted` background + muted title color (6.92:1), color bar at opacity 0.35 |
| 4 | Tab order started with the Leaflet container, zoom buttons and attribution; search and results came last | `layout/MapLayout.jsx`: DOM order top bar/panel → actions → location → map; `.map { z-index: 0 }` keeps Leaflet panes under the panel |
| 5 | Quiz on 375px reported "dialog overflow" | False positive: 12px offset is the paused entry animation (`translateY(12px)`); size and margin are exact |

Fixed earlier in F3/F4 and re-confirmed: focus of the first invalid field uses `setTimeout` (rAF is paused in
background tabs); quiz progress animates `transform` instead of `width`; sheet animates `transform` instead of `height`.

Contrast spot checks (WCAG AA ≥ 4.5): white on primary 5.17, primary on white 5.17, moderation badge 4.84,
selected chip text 14.9, muted text on muted surface 6.92.

## Scenarios

- Olena (quiz → map → course → registration): verified in F4; after F5 fixes unit tests cover it.
- Iryna: `/add` → point → form (email only) → card "На модерації", dashed marker → `/admin` wrong token
  ("Невірний токен.") → login → "Заявки (1)" → Схвалити → Так → "Нових заявок немає", toast → map marker solid.
- Empty state (Мистецтво + 18+) → "Нічого не знайдено" → reset: verified in F2.
- Browser console: no errors or CSP violations on any route.

## Left as is

- Visible focus ring could not be confirmed in the hidden window (`:focus-visible` needs real keyboard input);
  the global rule `:focus-visible { outline: 3px solid }` is in `styles/global.css`.
- `prefers-reduced-motion` was not emulated; covered by the global media query in `styles/global.css` and
  `lib/reducedMotion.js` for Leaflet `flyTo`.
- Real-device mobile check (touch drag of the sheet, geolocation over HTTPS) is still pending.
- Bundle is a single chunk (Leaflet + React); code-splitting `/admin` and the quiz was not needed for the demo.
