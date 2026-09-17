# Academy Locator — фронтенд MVP: план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** React-застосунок «карта STEAM-освіти Харкова» (карта → заклад → напрямок → курс → реєстрація, «Додати заклад», квіз, `/admin`), що збирається в `public/` і віддається тим самим Express-сервісом на Render.

**Architecture:** Vite-проєкт у `web/` з одним спільним `package.json`; збірка в `public/`, Express віддає статику та SPA fallback. Стан екрана живе в URL (маршрути + query фільтрів); дані — через тонкий `fetch`-клієнт і хук `useApi`; довідники — з `/api/meta` через `MetaProvider`; спільний стан карти (маркери, вибраний заклад, підсвітка, точка для «Додати заклад», геолокація) — `MapProvider`. Уся логіка, яку можна тестувати, винесена в чисті модулі (`filters.js`, `steamRing.js`, `format.js`, `formErrors.js`, `quizInput.js`, `suggestions.js`, `sheet.js`).

**Tech Stack:** React 19.3, react-router 7.18 (не 8.x — інший API), leaflet 1.9.4 + react-leaflet 5, lucide-react, @fontsource-variable/manrope, @fontsource/unbounded, Vite 8 + @vitejs/plugin-react 6, Vitest 5 + jsdom + Testing Library.

**Spec:** `docs/specs/2026-09-17-academy-locator-frontend-design.md`

## Global Constraints

- Node `>=20.19` (вимога Vite 8); на Render `NODE_VERSION=22`.
- Мова JS + JSX, **без TypeScript**; ES-модулі; іменовані експорти (`export function X`), без `export default` (крім `vite.config.js`).
- Весь UI-текст українською; апостроф у рядках — `’` (U+2019). `lang="uk"`.
- Іконки лише `lucide-react`; emoji в UI не використовуються.
- Шрифти й Leaflet — з npm, **без CDN**. Єдиний зовнішній ресурс — тайли `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png` з атрибуцією OSM + CARTO.
- CSP: helmet за замовчуванням + `img-src 'self' data: https://*.basemaps.cartocdn.com`.
- STEAM-кольори беруться **лише з `/api/meta`** (`categories[].color`), не хардкодяться в компонентах.
- Дизайн-токени (`web/src/styles/tokens.css`): фон `#F8FAFC`, поверхня `#FFFFFF`, текст `#0F172A`, приглушений `#475569`, межа `#E2E8F0`, основний `#2563EB` / hover `#1D4ED8`, успіх `#16A34A`, помилка `#DC2626`, модерація `#B45309`; радіуси 12/16/24; spacing 4/8/12/16/24/32; базовий шрифт 16px, line-height 1.5.
- Брейкпоінт desktop: `min-width: 1024px`. Перевірка на 375 / 768 / 1024 / 1440.
- Touch-цілі ≥ 44px; видимий `:focus-visible`; контраст ≥ 4.5:1; `prefers-reduced-motion` вимикає анімації.
- Фронтенд-тести: `web/src/**/*.spec.{js,jsx}` (Vitest). Бекенд-тести лишаються `tests/**/*.test.js` (`node --test`) — назви не перетинаються.
- Фронтенд **не імпортує** нічого з `src/` бекенду; потрібну дрібну функцію копіюємо (напр. `isWithinBounds`).
- Будь-який текст із даних (назви закладів із заявок) вставляється в HTML-рядки маркерів лише через `escapeHtml`.
- Git: **коміти й push робить користувач.** Кроки «Commit» замінено перевіркою; наприкінці кожної фази — зупинка з рядком «Фаза Fn готова, перевірте …».
- Бекенд-зміни — лише ті, що в Task 1; `npm test` після них: усі тести зелені.

## Уточнення відносно спеки

- Скрипт `test` лишається `node --test`: фронтенд-тести мають суфікс `.spec`, який `node --test` не підхоплює, тож явний glob не потрібен.
- Хук даних названо `web/src/api/useApi.js` (у спеці — `api/hooks.js`).
- Фільтр `direction` додано в URL (`direction=robotics`): його ставлять підказки пошуку й результат квізу; у формі фільтрів він показується як знімні chips.
- Після «Додати заклад» відкривається картка нового закладу (карта фокусується на ньому через `selectedId`).

---

## Карта файлів

```
render.yaml                                  buildCommand з --include=dev і build
package.json                                 залежності, engines, скрипти dev:web / build / test:web
vite.config.js                               root web, outDir ../public, proxy /api, vitest
.gitignore                                   /public/
src/app.js                                   CSP + static з кешем + SPA fallback (параметр publicDir)
tests/helpers/app.js                         makeApp({ publicDir })
tests/api/spa.test.js                        тести fallback і CSP

web/index.html
web/public/favicon.svg
web/src/main.jsx                             вхід: шрифти, стилі, BrowserRouter
web/src/App.jsx                              провайдери + маршрути
web/src/test/setup.js                        jest-dom, cleanup, поліфіли dialog / matchMedia
web/src/styles/tokens.css, global.css
web/src/api/client.js                        request(), buildUrl(), ApiError
web/src/api/useApi.js                        хук даних з AbortController і прапорцем slow
web/src/state/MetaProvider.jsx               /api/meta + індекси + BootScreen
web/src/state/filters.js                     чисті функції фільтрів ↔ URL ↔ API
web/src/state/useFilters.js                  хук над useSearchParams + useLinkTo
web/src/state/MapProvider.jsx                маркери, selectedId, highlight, pickPoint, геолокація
web/src/state/useGeolocation.js
web/src/lib/format.js                        pluralize, formatPrice, formatAge, formatDate, seatsLabel, formatDateTime
web/src/lib/useDebouncedValue.js, useMediaQuery.js, reducedMotion.js
web/src/ui/                                  Button, IconButton, Chip, Badge, Field, Checkbox, Dialog, EmptyState, ErrorState, Skeleton, Toast
web/src/layout/                              MapLayout, Panel (+ sheet.js), TopBar, BackLink
web/src/map/                                 steamRing.js, SteamRing.jsx, MapView.jsx, markers.js, LocationButton.jsx, geo.js
web/src/search/                              SearchBox.jsx, suggestions.js
web/src/filters/                             FiltersForm.jsx, FiltersPanel.jsx, FiltersDialog.jsx
web/src/panels/                              ResultsPanel, InstitutionPanel, DirectionCoursesPanel, CourseDetailsPanel, CourseCard, NotFoundPanel
web/src/forms/                               formErrors.js, RegistrationDialog.jsx, AddInstitutionPanel.jsx, InstitutionForm.jsx
web/src/quiz/                                quizInput.js, icons.js, QuizDialog.jsx
web/src/admin/                               AdminPage.jsx, AdminLogin.jsx, SubmissionsTab.jsx, RegistrationsTab.jsx, adminToken.js
.claude/skills/frontend/SKILL.md             (F5)
```

Кожен компонент має поруч `*.module.css` з тим самим ім’ям.

---

# Фаза F1 — каркас, збірка, бекенд-інтеграція, оболонка

### Task 1: Бекенд — CSP, кеш статики, SPA fallback

**Files:**
- Modify: `src/app.js`
- Modify: `tests/helpers/app.js`
- Create: `tests/api/spa.test.js`
- Modify: `render.yaml`, `.gitignore`

**Interfaces:**
- Produces: `createApp({ store, config, logger, publicDir })` — `publicDir` необов’язковий, за замовчуванням `<repo>/public/`. `makeApp({ env, store, publicDir })`.

- [ ] **Step 1: Розширити тестовий хелпер**

`tests/helpers/app.js`:
```js
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';
import { createMemoryStore } from '../../src/store/memoryStore.js';

// Express-додаток на свіжому MemoryStore. env — перевизначення змінних оточення.
export function makeApp({ env = {}, store = createMemoryStore(), publicDir } = {}) {
  const config = loadConfig(env);
  const app = createApp({ store, config, publicDir, logger: { error() {}, info() {}, warn() {} } });
  return { app, store, api: request(app) };
}
```

- [ ] **Step 2: Написати тести, що падають**

`tests/api/spa.test.js`:
```js
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeApp } from '../helpers/app.js';

let publicDir;
let emptyDir;

before(() => {
  publicDir = mkdtempSync(join(tmpdir(), 'al-public-'));
  writeFileSync(join(publicDir, 'index.html'), '<!doctype html><title>Academy Locator</title>');
  mkdirSync(join(publicDir, 'assets'));
  writeFileSync(join(publicDir, 'assets', 'app-abc123.js'), 'console.log(1)');
  emptyDir = mkdtempSync(join(tmpdir(), 'al-empty-'));
});

after(() => {
  rmSync(publicDir, { recursive: true, force: true });
  rmSync(emptyDir, { recursive: true, force: true });
});

describe('статика та SPA fallback', () => {
  test('/ віддає index.html без кешу', async () => {
    const { api } = makeApp({ publicDir });
    const res = await api.get('/').expect(200);
    assert.match(res.headers['content-type'], /text\/html/);
    assert.match(res.text, /Academy Locator/);
    assert.equal(res.headers['cache-control'], 'no-cache');
  });

  test('клієнтські маршрути віддають index.html', async () => {
    const { api } = makeApp({ publicDir });
    for (const path of ['/institutions/khpi', '/courses/khpi-robotics-arduino?age=10-13', '/admin', '/quiz']) {
      const res = await api.get(path).expect(200);
      assert.match(res.text, /Academy Locator/, path);
    }
  });

  test('хешовані assets кешуються назавжди', async () => {
    const { api } = makeApp({ publicDir });
    const res = await api.get('/assets/app-abc123.js').expect(200);
    assert.match(res.headers['content-type'], /javascript/);
    assert.match(res.headers['cache-control'], /immutable/);
  });

  test('відсутній файл з розширенням → 404, а не index.html', async () => {
    const { api } = makeApp({ publicDir });
    const res = await api.get('/assets/missing.js').expect(404);
    assert.doesNotMatch(res.text, /Academy Locator/);
  });

  test('/api не перехоплюється fallback', async () => {
    const { api } = makeApp({ publicDir });
    const res = await api.get('/api/nope').expect(404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
    await api.get('/api/health').expect(200);
  });

  test('без зібраного фронтенду клієнтський маршрут → 404', async () => {
    const { api } = makeApp({ publicDir: emptyDir });
    await api.get('/institutions/khpi').expect(404);
  });

  test('CSP дозволяє тайли CARTO і лише власні скрипти', async () => {
    const { api } = makeApp({ publicDir });
    const csp = (await api.get('/')).headers['content-security-policy'];
    assert.match(csp, /img-src 'self' data: https:\/\/\*\.basemaps\.cartocdn\.com/);
    assert.match(csp, /script-src 'self'(;|$)/);
  });
});
```

- [ ] **Step 3: Переконатися, що тести падають**

Run: `node --test tests/api/spa.test.js`
Expected: FAIL (index.html не віддається для `/institutions/khpi`, немає `immutable`, CSP без cartocdn).

- [ ] **Step 4: Реалізація в `src/app.js`**

Додати імпорти на початку файлу:
```js
import { existsSync } from 'node:fs';
import path from 'node:path';
```

Змінити сигнатуру та helmet:
```js
export function createApp({ store, config, logger = console, publicDir = PUBLIC_DIR }) {
  const app = express();

  // Render ставить один проксі перед сервісом — потрібно для коректного IP у rate limit
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // CSP за замовчуванням helmet + тайли карти CARTO (усе інше — з власного домену)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { 'img-src': ["'self'", 'data:', 'https://*.basemaps.cartocdn.com'] },
      },
    }),
  );
```

Замінити рядок `app.use(express.static(PUBLIC_DIR));` на:
```js
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
```

- [ ] **Step 5: Тести проходять**

Run: `npm test`
Expected: усі бекенд-тести PASS, 0 fail (кількість зросла на 7).

- [ ] **Step 6: Деплой-конфіг**

`render.yaml` — замінити `buildCommand: npm ci` на:
```yaml
    # --include=dev: NODE_ENV=production інакше пропускає Vite, і збірка падає
    buildCommand: npm ci --include=dev && npm run build
```

`.gitignore` — додати в кінець:
```gitignore

# збірка фронтенду (npm run build)
/public/
```

Видалити `public/.gitkeep` (Vite очищає `public/` під час збірки; у git користувач побачить видалення цього файлу).

---

### Task 2: Vite-каркас, залежності, тестове середовище

**Files:**
- Modify: `package.json`
- Create: `vite.config.js`, `web/index.html`, `web/public/favicon.svg`, `web/src/main.jsx`, `web/src/App.jsx`, `web/src/test/setup.js`, `web/src/App.spec.jsx`

**Interfaces:**
- Produces: команди `npm run dev:web`, `npm run build`, `npm run test:web`; `App` (іменований експорт з `web/src/App.jsx`).

- [ ] **Step 1: Встановити залежності**

```bash
npm install react@^19.3.0 react-dom@^19.3.0 react-router@^7.18.4 leaflet@^1.9.4 react-leaflet@^5.0.0 lucide-react@^1.47.0 @fontsource-variable/manrope@^5.3.0 @fontsource/unbounded@^5.3.0
npm install -D vite@^8.3.0 @vitejs/plugin-react@^6.1.1 vitest@^5.0.1 jsdom@^30.1.0 @testing-library/react@^16.3.3 @testing-library/jest-dom@^7.0.1 @testing-library/user-event@^14.6.7
```
Expected: встановлено без помилок peer dependencies.

- [ ] **Step 2: `package.json` — engines і скрипти**

```json
  "engines": {
    "node": ">=20.19"
  },
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js",
    "dev:web": "vite",
    "build": "vite build",
    "test": "node --test",
    "test:mongo": "node --env-file=.env --test",
    "test:web": "vitest run",
    "seed": "node scripts/seed.js"
  },
```

- [ ] **Step 3: `vite.config.js`**

```js
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Фронтенд живе у web/, збірка кладеться в public/, звідки її віддає Express.
export default defineConfig({
  root: 'web',
  plugins: [react()],
  build: {
    outDir: '../public',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    // API працює окремо: npm run dev (порт з .env, за замовчуванням 3000)
    proxy: { '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:3000' },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.{js,jsx}'],
    setupFiles: ['src/test/setup.js'],
  },
});
```

- [ ] **Step 4: `web/index.html` і favicon**

`web/index.html`:
```html
<!doctype html>
<html lang="uk">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#2563EB" />
    <meta
      name="description"
      content="Інтерактивна карта STEAM-освіти Харкова: заклади, напрямки й курси для дітей, підлітків і дорослих."
    />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <title>Academy Locator — STEAM-освіта Харкова</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

`web/public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="15" fill="#fff"/>
  <g fill="none" stroke-width="5" transform="rotate(-90 16 16)">
    <circle cx="16" cy="16" r="11" stroke="#16A34A" stroke-dasharray="12.8 56.3"/>
    <circle cx="16" cy="16" r="11" stroke="#2563EB" stroke-dasharray="12.8 56.3" stroke-dashoffset="-13.8"/>
    <circle cx="16" cy="16" r="11" stroke="#EA580C" stroke-dasharray="12.8 56.3" stroke-dashoffset="-27.6"/>
    <circle cx="16" cy="16" r="11" stroke="#DB2777" stroke-dasharray="12.8 56.3" stroke-dashoffset="-41.4"/>
    <circle cx="16" cy="16" r="11" stroke="#7C3AED" stroke-dasharray="12.8 56.3" stroke-dashoffset="-55.2"/>
  </g>
</svg>
```

- [ ] **Step 5: Тестове середовище**

`web/src/test/setup.js`:
```js
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// jsdom не реалізує <dialog>.showModal()/close()
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}

// jsdom не реалізує matchMedia
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  });
}
```
Якщо `@testing-library/jest-dom@7` не має входу `/vitest`, використати `import * as matchers from '@testing-library/jest-dom/matchers'; expect.extend(matchers);` (імпорт `expect` з `vitest`).

- [ ] **Step 6: Тест, що падає**

`web/src/App.spec.jsx`:
```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { App } from './App.jsx';

describe('App', () => {
  test('рендерить назву продукту', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText('Academy Locator')).toBeInTheDocument();
  });
});
```

Run: `npm run test:web`
Expected: FAIL — `./App.jsx` не існує.

- [ ] **Step 7: Мінімальні `App.jsx` і `main.jsx`**

`web/src/App.jsx`:
```jsx
export function App() {
  return <h1>Academy Locator</h1>;
}
```

`web/src/main.jsx`:
```jsx
import '@fontsource-variable/manrope';
import '@fontsource/unbounded/600.css';
import 'leaflet/dist/leaflet.css';
import './styles/tokens.css';
import './styles/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
```
(`styles/*.css` створюються в Task 3; до того тимчасово створити порожні файли, щоб збірка не падала.)

- [ ] **Step 8: Перевірка**

Run: `npm run test:web` → PASS.
Run: `npm run build` → у `public/` з’явились `index.html`, `favicon.svg`, `assets/*.js`, `assets/*.css`, шрифти `*.woff2`.
Run: `npm test` → бекенд-тести PASS (фронтенд-спеки не підхоплюються).

---

### Task 3: Дизайн-токени, глобальні стилі, UI-примітиви

**Files:**
- Create: `web/src/styles/tokens.css`, `web/src/styles/global.css`
- Create: `web/src/ui/Button.jsx` (+ `Button.module.css`), `IconButton.jsx`, `Chip.jsx`, `Badge.jsx`, `Field.jsx`, `Checkbox.jsx`, `Dialog.jsx`, `EmptyState.jsx`, `ErrorState.jsx`, `Skeleton.jsx`, `Toast.jsx` — кожен з `*.module.css`
- Test: `web/src/ui/ui.spec.jsx`

**Interfaces:**
- Produces:
  - `Button({ as = 'button', variant: 'primary'|'secondary'|'ghost'|'danger', size: 'md'|'sm', icon, children, ...props })`
  - `IconButton({ label, icon, ...props })` — `aria-label={label}`
  - `Chip({ pressed, color?, onToggle, children, removable? })` — `<button aria-pressed>`
  - `Badge({ tone: 'neutral'|'warning'|'success'|'danger'|'info', children })`
  - `Field({ label, error?, hint?, required?, children })` — клонує дочірній control з `id`, `aria-invalid`, `aria-describedby`
  - `Checkbox({ label, error?, ...inputProps })`
  - `Dialog({ open, onClose, title, children, footer?, size: 'md'|'lg'|'full' })` — нативний `<dialog>`
  - `EmptyState({ title, text?, action? })`, `ErrorState({ error, onRetry })`, `Skeleton({ lines = 3 })`
  - `ToastProvider`, `useToast() → { show(text, { tone }) }`

- [ ] **Step 1: Тести, що падають**

`web/src/ui/ui.spec.jsx`:
```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { Chip } from './Chip.jsx';
import { Dialog } from './Dialog.jsx';
import { Field } from './Field.jsx';
import { ToastProvider, useToast } from './Toast.jsx';

describe('Chip', () => {
  test('перемикає aria-pressed', async () => {
    function Harness() {
      const [on, setOn] = useState(false);
      return <Chip pressed={on} onToggle={() => setOn((v) => !v)}>Технології</Chip>;
    }
    render(<Harness />);
    const chip = screen.getByRole('button', { name: 'Технології' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Field', () => {
  test('звʼязує label, hint і помилку з полем', () => {
    render(
      <Field label="Імʼя" hint="Як до вас звертатися" error="Імʼя: мінімум 2 символи" required>
        <input />
      </Field>,
    );
    const input = screen.getByLabelText(/Імʼя/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toBeRequired();
    expect(input).toHaveAccessibleDescription('Як до вас звертатися Імʼя: мінімум 2 символи');
    expect(screen.getByRole('alert')).toHaveTextContent('мінімум 2 символи');
  });
});

describe('Dialog', () => {
  test('відкривається, має заголовок і закривається кнопкою', async () => {
    const onClose = vi.fn();
    render(
      <Dialog open title="Фільтри" onClose={onClose}>
        <p>Вміст</p>
      </Dialog>,
    );
    expect(screen.getByRole('dialog', { name: 'Фільтри' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Закрити' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('Toast', () => {
  test('показує повідомлення в live-регіоні', async () => {
    function Trigger() {
      const toast = useToast();
      return <button onClick={() => toast.show('Заклад додано')}>go</button>;
    }
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'go' }));
    expect(screen.getByRole('status')).toHaveTextContent('Заклад додано');
  });
});
```

Run: `npm run test:web` → FAIL (модулі не існують).

- [ ] **Step 2: Токени та глобальні стилі**

`web/src/styles/tokens.css`:
```css
:root {
  --color-bg: #f8fafc;
  --color-surface: #ffffff;
  --color-surface-muted: #f1f5f9;
  --color-text: #0f172a;
  --color-text-muted: #475569;
  --color-border: #e2e8f0;
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-primary-soft: #eff6ff;
  --color-on-primary: #ffffff;
  --color-success: #16a34a;
  --color-success-soft: #f0fdf4;
  --color-danger: #dc2626;
  --color-danger-soft: #fef2f2;
  --color-warning: #b45309;
  --color-warning-soft: #fffbeb;
  --color-focus: #2563eb;

  --font-body: 'Manrope Variable', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-display: 'Unbounded', 'Manrope Variable', system-ui, sans-serif;

  --text-xs: 0.8125rem;
  --text-sm: 0.875rem;
  --text-md: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.375rem;
  --text-2xl: 1.75rem;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;

  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-full: 999px;

  --shadow-sm: 0 1px 2px rgb(15 23 42 / 6%), 0 1px 3px rgb(15 23 42 / 8%);
  --shadow-md: 0 4px 12px rgb(15 23 42 / 8%), 0 2px 4px rgb(15 23 42 / 6%);
  --shadow-lg: 0 16px 40px rgb(15 23 42 / 14%), 0 4px 12px rgb(15 23 42 / 8%);

  --duration-fast: 150ms;
  --duration-base: 220ms;
  --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);

  --panel-width: 400px;
  --touch-target: 44px;
}
```

`web/src/styles/global.css`:
```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body,
#root {
  height: 100%;
}

body {
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--text-md);
  line-height: 1.5;
  color: var(--color-text);
  background: var(--color-bg);
  -webkit-font-smoothing: antialiased;
}

h1,
h2,
h3 {
  margin: 0;
  line-height: 1.25;
}

h1,
h2 {
  font-family: var(--font-display);
  font-weight: 600;
  letter-spacing: -0.01em;
}

p {
  margin: 0;
}

a {
  color: var(--color-primary);
}

button,
input,
select,
textarea {
  font: inherit;
  color: inherit;
}

:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

.visually-hidden {
  position: absolute !important;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.leaflet-container {
  font-family: var(--font-body);
  background: #eef2f6;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 3: Кнопки, chip, badge**

`web/src/ui/Button.jsx`:
```jsx
import styles from './Button.module.css';

export function Button({ as: Component = 'button', variant = 'primary', size = 'md', icon: Icon, children, className = '', ...props }) {
  const typeProps = Component === 'button' ? { type: props.type ?? 'button' } : {};
  return (
    <Component className={`${styles.button} ${styles[variant]} ${styles[size]} ${className}`} {...typeProps} {...props}>
      {Icon && <Icon aria-hidden="true" size={size === 'sm' ? 16 : 18} strokeWidth={2.2} />}
      {children && <span>{children}</span>}
    </Component>
  );
}
```

`web/src/ui/Button.module.css`:
```css
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: var(--touch-target);
  padding: 0 var(--space-4);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out),
    transform var(--duration-fast) var(--ease-out);
}

.button:active:not(:disabled) {
  transform: scale(0.98);
}

.button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.sm {
  min-height: 36px;
  padding: 0 var(--space-3);
  font-size: var(--text-sm);
}

.primary {
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.secondary {
  background: var(--color-surface);
  border-color: var(--color-border);
  color: var(--color-text);
  box-shadow: var(--shadow-sm);
}

.secondary:hover:not(:disabled) {
  border-color: #cbd5e1;
  background: var(--color-surface-muted);
}

.ghost {
  background: transparent;
  color: var(--color-primary);
}

.ghost:hover:not(:disabled) {
  background: var(--color-primary-soft);
}

.danger {
  background: var(--color-surface);
  border-color: #fecaca;
  color: var(--color-danger);
}

.danger:hover:not(:disabled) {
  background: var(--color-danger-soft);
}
```

`web/src/ui/IconButton.jsx`:
```jsx
import styles from './IconButton.module.css';

export function IconButton({ label, icon: Icon, className = '', ...props }) {
  return (
    <button type="button" aria-label={label} title={label} className={`${styles.iconButton} ${className}`} {...props}>
      <Icon aria-hidden="true" size={20} strokeWidth={2.2} />
    </button>
  );
}
```

`web/src/ui/IconButton.module.css`:
```css
.iconButton {
  display: inline-grid;
  place-items: center;
  width: var(--touch-target);
  height: var(--touch-target);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-out);
}

.iconButton:hover {
  background: var(--color-surface-muted);
}
```

`web/src/ui/Chip.jsx`:
```jsx
import { X } from 'lucide-react';
import styles from './Chip.module.css';

export function Chip({ pressed, color, onToggle, removable = false, children }) {
  return (
    <button
      type="button"
      className={styles.chip}
      aria-pressed={pressed}
      onClick={onToggle}
      style={color ? { '--chip-color': color } : undefined}
    >
      {color && <span className={styles.dot} aria-hidden="true" />}
      <span>{children}</span>
      {removable && <X aria-hidden="true" size={14} />}
    </button>
  );
}
```

`web/src/ui/Chip.module.css`:
```css
.chip {
  --chip-color: var(--color-primary);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out);
}

.chip:hover {
  border-color: #cbd5e1;
}

.chip[aria-pressed='true'] {
  border-color: var(--chip-color);
  background: color-mix(in srgb, var(--chip-color) 12%, white);
  box-shadow: inset 0 0 0 1px var(--chip-color);
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  background: var(--chip-color);
}
```

`web/src/ui/Badge.jsx`:
```jsx
import styles from './Badge.module.css';

export function Badge({ tone = 'neutral', children }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}
```

`web/src/ui/Badge.module.css`:
```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 700;
  white-space: nowrap;
}

.neutral {
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
}

.warning {
  background: var(--color-warning-soft);
  color: var(--color-warning);
}

.success {
  background: var(--color-success-soft);
  color: #15803d;
}

.danger {
  background: var(--color-danger-soft);
  color: #b91c1c;
}

.info {
  background: var(--color-primary-soft);
  color: var(--color-primary-hover);
}
```

- [ ] **Step 4: Поля форм**

`web/src/ui/Field.jsx`:
```jsx
import { cloneElement, useId } from 'react';
import styles from './Field.module.css';

export function Field({ label, error, hint, required = false, children }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required && <span aria-hidden="true" className={styles.required}> *</span>}
      </label>
      {cloneElement(children, {
        id,
        required,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
        className: `${styles.control} ${children.props.className ?? ''}`,
      })}
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

`web/src/ui/Field.module.css`:
```css
.field {
  display: grid;
  gap: 6px;
}

.label {
  font-size: var(--text-sm);
  font-weight: 700;
}

.required {
  color: var(--color-danger);
}

.control {
  width: 100%;
  min-height: var(--touch-target);
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  font-size: var(--text-md);
}

textarea.control {
  min-height: 96px;
  resize: vertical;
}

.control[aria-invalid='true'] {
  border-color: var(--color-danger);
}

.hint {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
}

.error {
  color: var(--color-danger);
  font-size: var(--text-sm);
  font-weight: 600;
}
```

`web/src/ui/Checkbox.jsx`:
```jsx
import { useId } from 'react';
import styles from './Checkbox.module.css';

export function Checkbox({ label, error, ...inputProps }) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={styles.wrapper}>
      <label htmlFor={id} className={styles.checkbox}>
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...inputProps}
        />
        <span>{label}</span>
      </label>
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

`web/src/ui/Checkbox.module.css`:
```css
.wrapper {
  display: grid;
  gap: 6px;
}

.checkbox {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  min-height: var(--touch-target);
  font-size: var(--text-sm);
  cursor: pointer;
}

.checkbox input {
  flex: none;
  width: 22px;
  height: 22px;
  margin: 1px 0 0;
  accent-color: var(--color-primary);
}

.error {
  color: var(--color-danger);
  font-size: var(--text-sm);
  font-weight: 600;
}
```

- [ ] **Step 5: Dialog, стани, Toast**

`web/src/ui/Dialog.jsx`:
```jsx
import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import styles from './Dialog.module.css';
import { IconButton } from './IconButton.jsx';

// Нативний <dialog>: фокус-пастка, Esc і backdrop дає браузер
export function Dialog({ open, onClose, title, children, footer, size = 'md' }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const requestClose = () => {
    if (open) onClose();
  };

  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${styles[size]}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) requestClose();
      }}
    >
      <div className={styles.inner}>
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <IconButton label="Закрити" icon={X} onClick={requestClose} />
        </header>
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </dialog>
  );
}
```

`web/src/ui/Dialog.module.css`:
```css
.dialog {
  width: min(560px, calc(100vw - 32px));
  max-height: calc(100dvh - 32px);
  padding: 0;
  border: 0;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-lg);
}

.dialog::backdrop {
  background: rgb(15 23 42 / 45%);
}

.dialog[open] {
  animation: dialog-in var(--duration-base) var(--ease-out);
}

.lg {
  width: min(720px, calc(100vw - 32px));
}

.inner {
  display: flex;
  flex-direction: column;
  max-height: calc(100dvh - 32px);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-4) var(--space-3) var(--space-5);
}

.title {
  font-size: var(--text-xl);
}

.body {
  overflow-y: auto;
  padding: 0 var(--space-5) var(--space-5);
}

.footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--color-border);
}

@media (max-width: 767px) {
  .dialog,
  .full {
    width: 100vw;
    max-width: 100vw;
    height: 100dvh;
    max-height: 100dvh;
    margin: 0;
    border-radius: 0;
  }

  .inner {
    height: 100dvh;
    max-height: 100dvh;
  }

  .body {
    flex: 1;
  }
}

@keyframes dialog-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}
```

`web/src/ui/EmptyState.jsx`:
```jsx
import { SearchX } from 'lucide-react';
import styles from './EmptyState.module.css';

export function EmptyState({ title, text, action, icon: Icon = SearchX }) {
  return (
    <div className={styles.empty}>
      <Icon aria-hidden="true" size={32} className={styles.icon} />
      <h3 className={styles.title}>{title}</h3>
      {text && <p className={styles.text}>{text}</p>}
      {action}
    </div>
  );
}
```

`web/src/ui/EmptyState.module.css`:
```css
.empty {
  display: grid;
  justify-items: center;
  gap: var(--space-3);
  padding: var(--space-6) var(--space-4);
  text-align: center;
}

.icon {
  color: var(--color-text-muted);
}

.title {
  font-size: var(--text-lg);
}

.text {
  max-width: 32ch;
  color: var(--color-text-muted);
}
```

`web/src/ui/ErrorState.jsx`:
```jsx
import { CloudOff, RotateCw } from 'lucide-react';
import { Button } from './Button.jsx';
import { EmptyState } from './EmptyState.jsx';

export function ErrorState({ error, onRetry }) {
  return (
    <EmptyState
      icon={CloudOff}
      title="Не вдалося завантажити"
      text={error?.message ?? 'Щось пішло не так. Спробуйте ще раз.'}
      action={
        onRetry && (
          <Button variant="secondary" icon={RotateCw} onClick={onRetry}>
            Спробувати ще
          </Button>
        )
      }
    />
  );
}
```

`web/src/ui/Skeleton.jsx`:
```jsx
import styles from './Skeleton.module.css';

export function Skeleton({ lines = 3, slow = false }) {
  return (
    <div className={styles.wrapper} aria-busy="true">
      <p className="visually-hidden" role="status">
        Завантаження…
      </p>
      {slow && (
        <p className={styles.slow} role="status">
          Прокидаємо сервер, це може зайняти до хвилини…
        </p>
      )}
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className={styles.card}>
          <span className={styles.lineWide} />
          <span className={styles.line} />
        </div>
      ))}
    </div>
  );
}
```

`web/src/ui/Skeleton.module.css`:
```css
.wrapper {
  display: grid;
  gap: var(--space-3);
}

.slow {
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-primary-soft);
  color: var(--color-primary-hover);
  font-size: var(--text-sm);
  font-weight: 600;
}

.card {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.line,
.lineWide {
  height: 12px;
  border-radius: var(--radius-full);
  background: linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 50%, #e2e8f0 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}

.line {
  width: 55%;
}

.lineWide {
  width: 85%;
  height: 16px;
}

@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}
```

`web/src/ui/Toast.jsx`:
```jsx
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import styles from './Toast.module.css';

const ToastContext = createContext(null);
const HIDE_AFTER_MS = 5000;

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const show = useCallback((text, { tone = 'neutral' } = {}) => {
    clearTimeout(timer.current);
    setToast({ text, tone, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), HIDE_AFTER_MS);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div role="status" aria-live="polite" className={styles.viewport}>
        {toast && (
          <p key={toast.key} className={`${styles.toast} ${styles[toast.tone]}`}>
            {toast.text}
          </p>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
```

`web/src/ui/Toast.module.css`:
```css
.viewport {
  position: fixed;
  z-index: 2000;
  left: 50%;
  bottom: var(--space-5);
  transform: translateX(-50%);
  width: min(440px, calc(100vw - 32px));
  pointer-events: none;
}

.toast {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--color-text);
  color: #fff;
  font-weight: 600;
  box-shadow: var(--shadow-lg);
  animation: toast-in var(--duration-base) var(--ease-out);
}

.danger {
  background: #991b1b;
}

.success {
  background: #166534;
}

@media (max-width: 1023px) {
  .viewport {
    top: calc(var(--space-4) + env(safe-area-inset-top));
    bottom: auto;
  }
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}
```

- [ ] **Step 6: Перевірка**

Run: `npm run test:web` → усі спеки PASS.

---
### Task 4: API-клієнт, хук даних, довідники

**Files:**
- Create: `web/src/api/client.js`, `web/src/api/useApi.js`
- Create: `web/src/state/MetaProvider.jsx` (+ `MetaProvider.module.css`)
- Create: `web/src/lib/useMediaQuery.js`, `web/src/lib/useDebouncedValue.js`, `web/src/lib/reducedMotion.js`
- Create: `web/src/layout/Brand.jsx` (+ `Brand.module.css`)
- Create: `web/src/test/fixtures.jsx`
- Test: `web/src/api/client.spec.js`, `web/src/api/useApi.spec.jsx`

**Interfaces:**
- Consumes: `ErrorState`, `Skeleton` (Task 3).
- Produces:
  - `class ApiError extends Error { code, status, details }`
  - `buildUrl(path: string, query?: object) → string` — пропускає `undefined`, `null`, `''`
  - `request(path, { method = 'GET', query, body, headers, signal }) → Promise<json>`; мережева помилка → `ApiError('NETWORK')`; `AbortError` прокидається як є
  - `useApi(path | null, { query, enabled = true, headers, refreshKey, keepPreviousData = false }) → { data, error, loading, slow, reload }`
  - `MetaContext`, `MetaProvider`, `useMeta()`, `buildMetaIndex(meta)` → `meta` + `categoryByCode`, `directionBySlug`, `directionById`, `colorByCode`, `labels.{type,format,level,price}`
  - `useMediaQuery(query) → boolean`, `DESKTOP_QUERY = '(min-width: 1024px)'`
  - `useDebouncedValue(value, delayMs) → value`
  - `prefersReducedMotion() → boolean`
  - `Brand({ compact? })`
  - Тестові хелпери: `metaFixture`, `mockFetch(routes) → vi.fn`, `renderWithProviders(ui, { route, path, meta })`

- [ ] **Step 1: Тести клієнта, що падають**

`web/src/api/client.spec.js`:
```js
import { describe, expect, test, vi } from 'vitest';
import { ApiError, buildUrl, request } from './client.js';

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('buildUrl', () => {
  test('пропускає порожні значення і кодує решту', () => {
    expect(buildUrl('/api/institutions', { q: '', category: 'T,E', ageFrom: 0, lat: undefined, near: null })).toBe(
      '/api/institutions?category=T%2CE&ageFrom=0',
    );
  });

  test('без параметрів повертає шлях', () => {
    expect(buildUrl('/api/meta')).toBe('/api/meta');
    expect(buildUrl('/api/meta', {})).toBe('/api/meta');
  });
});

describe('request', () => {
  test('GET повертає JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { status: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(request('/api/health')).resolves.toEqual({ status: 'ok' });
    expect(fetchMock.mock.calls[0][1].method).toBe('GET');
  });

  test('POST надсилає JSON-тіло та заголовки', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(201, { id: 'x' }));
    vi.stubGlobal('fetch', fetchMock);
    await request('/api/institutions', { method: 'POST', body: { name: 'Школа' }, headers: { 'X-Admin-Token': 't' } });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).toBe('{"name":"Школа"}');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.headers['X-Admin-Token']).toBe('t');
  });

  test('конверт помилки → ApiError з кодом, статусом і деталями', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        json(400, {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Некоректні дані форми',
            details: [{ path: 'name', message: 'Імʼя: обовʼязкове поле' }],
          },
        }),
      ),
    );
    const error = await request('/api/x', { method: 'POST', body: {} }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'VALIDATION_ERROR', status: 400, message: 'Некоректні дані форми' });
    expect(error.details).toHaveLength(1);
  });

  test('не-JSON відповідь з помилкою → INTERNAL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad Gateway', { status: 502 })));
    await expect(request('/api/x')).rejects.toMatchObject({ code: 'INTERNAL', status: 502 });
  });

  test('мережева помилка → NETWORK', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(request('/api/x')).rejects.toMatchObject({ code: 'NETWORK' });
  });

  test('скасування прокидається як AbortError', async () => {
    const abort = new DOMException('Aborted', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort));
    await expect(request('/api/x')).rejects.toBe(abort);
  });
});
```

Run: `npm run test:web -- src/api/client.spec.js` → FAIL (модуля немає).

- [ ] **Step 2: `web/src/api/client.js`**

```js
export class ApiError extends Error {
  constructor(code, message, { status = 0, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function buildUrl(path, query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function request(path, { method = 'GET', query, body, headers, signal } = {}) {
  let response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new ApiError('NETWORK', 'Немає з’єднання з сервером. Перевірте інтернет і спробуйте ще раз.');
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const envelope = data?.error;
    throw new ApiError(envelope?.code ?? 'INTERNAL', envelope?.message ?? 'Щось пішло не так. Спробуйте ще раз.', {
      status: response.status,
      details: envelope?.details,
    });
  }
  return data;
}
```

Run: `npm run test:web -- src/api/client.spec.js` → PASS.

- [ ] **Step 3: Тести хука, що падають**

`web/src/api/useApi.spec.jsx`:
```jsx
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { useApi } from './useApi.js';

const json = (body) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

describe('useApi', () => {
  test('завантажує дані', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ ok: 1 })));
    const { result } = renderHook(() => useApi('/api/meta'));
    await waitFor(() => expect(result.current.data).toEqual({ ok: 1 }));
    expect(result.current.loading).toBe(false);
  });

  test('enabled=false — без запиту', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useApi('/api/search/suggest', { enabled: false }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  test('зміна query скасовує попередній запит', async () => {
    const signals = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((url, init) => {
        signals.push(init.signal);
        return new Promise(() => {});
      }),
    );
    const { rerender } = renderHook(({ q }) => useApi('/api/institutions', { query: { q } }), {
      initialProps: { q: 'a' },
    });
    rerender({ q: 'ab' });
    await waitFor(() => expect(signals).toHaveLength(2));
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  test('slow=true, якщо відповідь довша за 3 с', () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    const { result } = renderHook(() => useApi('/api/meta'));
    expect(result.current.slow).toBe(false);
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.slow).toBe(true);
  });

  test('reload робить повторний запит; keepPreviousData зберігає дані під час нового запиту', async () => {
    let n = 0;
    vi.stubGlobal('fetch', vi.fn(async () => json({ n: ++n })));
    const { result, rerender } = renderHook(
      ({ q }) => useApi('/api/x', { query: { q }, keepPreviousData: true }),
      { initialProps: { q: '1' } },
    );
    await waitFor(() => expect(result.current.data).toEqual({ n: 1 }));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.data).toEqual({ n: 2 }));
    rerender({ q: '2' });
    expect(result.current.data).toEqual({ n: 2 });
    await waitFor(() => expect(result.current.data).toEqual({ n: 3 }));
  });

  test('без keepPreviousData зміна url скидає дані', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => json({ url })));
    const { result, rerender } = renderHook(({ id }) => useApi(`/api/institutions/${id}`), {
      initialProps: { id: 'a' },
    });
    await waitFor(() => expect(result.current.data).toEqual({ url: '/api/institutions/a' }));
    rerender({ id: 'b' });
    await waitFor(() => expect(result.current.data).toEqual({ url: '/api/institutions/b' }));
    expect(result.current.error).toBeNull();
  });
});
```

Run: `npm run test:web -- src/api/useApi.spec.jsx` → FAIL.

- [ ] **Step 4: `web/src/api/useApi.js`**

```js
import { useCallback, useEffect, useRef, useState } from 'react';
import { buildUrl, request } from './client.js';

export const SLOW_MS = 3000;
const INITIAL = { data: null, error: null, loading: false, slow: false };

// Дані з API: скасування застарілих запитів, прапорець slow для холодного старту Render
export function useApi(path, { query, enabled = true, headers, refreshKey, keepPreviousData = false } = {}) {
  const url = enabled && path ? buildUrl(path, query) : null;
  const headersKey = headers ? JSON.stringify(headers) : '';
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState(() => (url ? { ...INITIAL, loading: true } : INITIAL));
  const lastUrl = useRef(url);

  useEffect(() => {
    if (!url) {
      lastUrl.current = null;
      setState(INITIAL);
      return undefined;
    }

    const urlChanged = lastUrl.current !== url;
    lastUrl.current = url;
    setState((prev) =>
      urlChanged && !keepPreviousData ? { ...INITIAL, loading: true } : { ...prev, loading: true, error: null, slow: false },
    );

    const controller = new AbortController();
    const timer = setTimeout(() => setState((prev) => ({ ...prev, slow: true })), SLOW_MS);

    request(url, { signal: controller.signal, headers: headersKey ? JSON.parse(headersKey) : undefined })
      .then((data) => setState({ data, error: null, loading: false, slow: false }))
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        setState((prev) => ({ ...prev, error, loading: false, slow: false }));
      })
      .finally(() => clearTimeout(timer));

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [url, headersKey, nonce, refreshKey, keepPreviousData]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}
```

Run: `npm run test:web -- src/api/useApi.spec.jsx` → PASS.

- [ ] **Step 5: Утиліти**

`web/src/lib/useMediaQuery.js`:
```js
import { useEffect, useState } from 'react';

export const DESKTOP_QUERY = '(min-width: 1024px)';

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
```

`web/src/lib/useDebouncedValue.js`:
```js
import { useEffect, useState } from 'react';

export function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
```

`web/src/lib/reducedMotion.js`:
```js
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
```

- [ ] **Step 6: Бренд і MetaProvider**

`web/src/layout/Brand.jsx`:
```jsx
import styles from './Brand.module.css';

export function Brand({ compact = false }) {
  return (
    <div className={styles.brand}>
      <img src="/favicon.svg" alt="" width={compact ? 28 : 36} height={compact ? 28 : 36} />
      <div>
        <p className={styles.name}>Academy Locator</p>
        {!compact && <p className={styles.tagline}>STEAM-освіта Харкова</p>}
      </div>
    </div>
  );
}
```

`web/src/layout/Brand.module.css`:
```css
.brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.name {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--text-lg);
  line-height: 1.1;
}

.tagline {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  font-weight: 600;
}
```

`web/src/state/MetaProvider.jsx`:
```jsx
import { createContext, useContext, useMemo } from 'react';
import { useApi } from '../api/useApi.js';
import { Brand } from '../layout/Brand.jsx';
import { ErrorState } from '../ui/ErrorState.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import styles from './MetaProvider.module.css';

export const MetaContext = createContext(null);

const byKey = (list, key) => Object.fromEntries(list.map((item) => [item[key], item]));
const labelsOf = (list) => Object.fromEntries(list.map((item) => [item.id, item.name]));

export function buildMetaIndex(meta) {
  return {
    ...meta,
    categoryByCode: byKey(meta.categories, 'code'),
    directionBySlug: byKey(meta.directions, 'slug'),
    directionById: byKey(meta.directions, 'id'),
    colorByCode: Object.fromEntries(meta.categories.map((c) => [c.code, c.color])),
    labels: {
      type: labelsOf(meta.institutionTypes),
      format: labelsOf(meta.formats),
      level: labelsOf(meta.levels),
      price: labelsOf(meta.priceOptions),
    },
  };
}

export function MetaProvider({ children }) {
  const { data, error, slow, reload } = useApi('/api/meta');
  const value = useMemo(() => (data ? buildMetaIndex(data) : null), [data]);

  if (!value) {
    return (
      <main className={styles.boot}>
        <Brand />
        {error ? <ErrorState error={error} onRetry={reload} /> : <Skeleton lines={2} slow={slow} />}
      </main>
    );
  }
  return <MetaContext.Provider value={value}>{children}</MetaContext.Provider>;
}

export function useMeta() {
  const ctx = useContext(MetaContext);
  if (!ctx) throw new Error('useMeta must be used inside MetaProvider');
  return ctx;
}
```

`web/src/state/MetaProvider.module.css`:
```css
.boot {
  display: grid;
  align-content: center;
  gap: var(--space-5);
  width: min(420px, calc(100vw - 32px));
  min-height: 100dvh;
  margin: 0 auto;
}
```

- [ ] **Step 7: Тестові фікстури**

`web/src/test/fixtures.jsx`:
```jsx
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { vi } from 'vitest';
import { buildMetaIndex, MetaContext } from '../state/MetaProvider.jsx';
import { ToastProvider } from '../ui/Toast.jsx';

// Відповідь GET /api/meta (напрямки скорочено; значення як у data/seed)
export const metaFixture = {
  city: {
    id: 'kharkiv',
    name: 'Харків',
    center: { lat: 49.9935, lng: 36.2304 },
    zoom: 13,
    bounds: { south: 49.88, west: 36.1, north: 50.1, east: 36.46 },
  },
  categories: [
    { code: 'S', name: 'Наука', nameEn: 'Science', color: '#16A34A', icon: 'flask-conical' },
    { code: 'T', name: 'Технології', nameEn: 'Technology', color: '#2563EB', icon: 'cpu' },
    { code: 'E', name: 'Інженерія', nameEn: 'Engineering', color: '#EA580C', icon: 'cog' },
    { code: 'A', name: 'Мистецтво', nameEn: 'Arts', color: '#DB2777', icon: 'palette' },
    { code: 'M', name: 'Математика', nameEn: 'Mathematics', color: '#7C3AED', icon: 'sigma' },
  ],
  directions: [
    { id: 'robotics', slug: 'robotics', name: 'Робототехніка', categoryCode: 'T', keywords: ['arduino'] },
    { id: 'programming', slug: 'programming', name: 'Програмування', categoryCode: 'T', keywords: ['python'] },
    { id: '3d-modeling', slug: '3d-modeling', name: '3D-моделювання та друк', categoryCode: 'E', keywords: ['3d'] },
    { id: 'animation', slug: 'animation', name: 'Анімація', categoryCode: 'A', keywords: [] },
    { id: 'astronomy', slug: 'astronomy', name: 'Астрономія', categoryCode: 'S', keywords: [] },
  ],
  institutionTypes: [
    { id: 'university', name: 'Університет' },
    { id: 'academy', name: 'Академія' },
    { id: 'private_school', name: 'Приватна школа' },
    { id: 'center', name: 'Освітній центр' },
  ],
  formats: [
    { id: 'offline', name: 'Офлайн' },
    { id: 'online', name: 'Онлайн' },
    { id: 'hybrid', name: 'Гібрид' },
  ],
  ageGroups: [
    { id: '6-9', ageFrom: 6, ageTo: 9, name: '6–9 років' },
    { id: '10-13', ageFrom: 10, ageTo: 13, name: '10–13 років' },
    { id: '14-17', ageFrom: 14, ageTo: 17, name: '14–17 років' },
    { id: '18+', ageFrom: 18, ageTo: 99, name: '18+ років' },
  ],
  levels: [
    { id: 'beginner', name: 'Початковий' },
    { id: 'intermediate', name: 'Середній' },
    { id: 'advanced', name: 'Просунутий' },
  ],
  priceOptions: [
    { id: 'free', name: 'Безкоштовно' },
    { id: 'paid', name: 'Платно' },
  ],
  dataNotice: 'Заклади реальні; курси, розклади, ціни та кількість місць є демонстраційними.',
};

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// routes: { '/api/prefix': body | (url, init) => ({ status, body }) }; найдовший префікс має пріоритет
export function mockFetch(routes = {}) {
  const table = Object.entries({ '/api/meta': metaFixture, ...routes }).sort(([a], [b]) => b.length - a.length);
  const fetchMock = vi.fn(async (url, init = {}) => {
    const path = String(url);
    const entry = table.find(([prefix]) => path.startsWith(prefix));
    if (!entry) return jsonResponse(404, { error: { code: 'NOT_FOUND', message: 'Маршрут не знайдено' } });
    const [, handler] = entry;
    if (typeof handler !== 'function') return jsonResponse(200, handler);
    const { status = 200, body } = await handler(path, init);
    return jsonResponse(status, body);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function renderWithProviders(ui, { route = '/', path, meta = metaFixture } = {}) {
  const content = path ? (
    <Routes>
      <Route path={path} element={ui} />
    </Routes>
  ) : (
    ui
  );
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider>
        <MetaContext.Provider value={buildMetaIndex(meta)}>{content}</MetaContext.Provider>
      </ToastProvider>
    </MemoryRouter>,
  );
}
```

- [ ] **Step 8: Перевірка**

Run: `npm run test:web` → PASS.

---

### Task 5: Оболонка — панель desktop / шторка mobile, маршрути

**Files:**
- Create: `web/src/layout/sheet.js`, `web/src/layout/Panel.jsx` (+ css), `web/src/layout/MapLayout.jsx` (+ css), `web/src/layout/BackLink.jsx` (+ css)
- Create: `web/src/panels/IntroPanel.jsx`, `web/src/panels/NotFoundPanel.jsx`, `web/src/panels/Panels.module.css`
- Modify: `web/src/App.jsx`, `web/src/App.spec.jsx`
- Test: `web/src/layout/sheet.spec.js`, `web/src/layout/Panel.spec.jsx`

**Interfaces:**
- Consumes: `useMediaQuery`, `DESKTOP_QUERY`, `Brand`, `MetaProvider`, `ToastProvider`, `EmptyState`, `Button`, `mockFetch`.
- Produces:
  - `SNAPS = ['peek','half','full']`, `nextSnap(current, deltaY)`, `cycleSnap(current)`, `initialSnap(pathname)`
  - `Panel({ header, children })`, `useSheet() → { snap, setSnap }`
  - `MapLayout` — layout-маршрут з `<Outlet />`; область `.map` (у Task 8 туди стає `MapView`)
  - `BackLink({ to, children })`
  - `NotFoundPanel({ title?, text? })`
  - Спільні стилі `panels/Panels.module.css`: `.section`, `.stack`, `.eyebrow`, `.title`, `.muted`, `.notice`, `.list`

- [ ] **Step 1: Тести, що падають**

`web/src/layout/sheet.spec.js`:
```js
import { describe, expect, test } from 'vitest';
import { cycleSnap, initialSnap, nextSnap } from './sheet.js';

describe('sheet', () => {
  test('свайп угору відкриває на крок, униз — закриває', () => {
    expect(nextSnap('peek', -60)).toBe('half');
    expect(nextSnap('half', -60)).toBe('full');
    expect(nextSnap('full', -60)).toBe('full');
    expect(nextSnap('full', 60)).toBe('half');
    expect(nextSnap('peek', 60)).toBe('peek');
  });

  test('малий рух не змінює стан', () => {
    expect(nextSnap('half', 20)).toBe('half');
    expect(nextSnap('half', -39)).toBe('half');
  });

  test('натискання ручки циклічно перемикає стани', () => {
    expect(cycleSnap('peek')).toBe('half');
    expect(cycleSnap('half')).toBe('full');
    expect(cycleSnap('full')).toBe('peek');
  });

  test('на /add шторка згорнута, щоб було видно карту', () => {
    expect(initialSnap('/add')).toBe('peek');
    expect(initialSnap('/')).toBe('half');
    expect(initialSnap('/courses/x')).toBe('half');
  });
});
```

`web/src/layout/Panel.spec.jsx`:
```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { Panel } from './Panel.jsx';

describe('Panel (mobile)', () => {
  test('ручка перемикає стан шторки', async () => {
    render(
      <MemoryRouter>
        <Panel header={<p>Заголовок</p>}>
          <p>Вміст</p>
        </Panel>
      </MemoryRouter>,
    );
    const panel = screen.getByRole('complementary', { name: 'Панель' });
    expect(panel).toHaveAttribute('data-snap', 'half');
    await userEvent.click(screen.getByRole('button', { name: 'Розгорнути панель' }));
    expect(panel).toHaveAttribute('data-snap', 'full');
    await userEvent.click(screen.getByRole('button', { name: 'Згорнути панель' }));
    expect(panel).toHaveAttribute('data-snap', 'peek');
  });
});
```
(У jsdom поліфіл `matchMedia` повертає `matches: false` → mobile-режим.)

Run: `npm run test:web` → FAIL (модулів немає).

- [ ] **Step 2: `web/src/layout/sheet.js`**

```js
export const SNAPS = ['peek', 'half', 'full'];
export const DRAG_THRESHOLD = 40;

// deltaY < 0 — палець рухається вгору (шторка відкривається)
export function nextSnap(current, deltaY) {
  const index = SNAPS.indexOf(current);
  if (deltaY <= -DRAG_THRESHOLD) return SNAPS[Math.min(index + 1, SNAPS.length - 1)];
  if (deltaY >= DRAG_THRESHOLD) return SNAPS[Math.max(index - 1, 0)];
  return current;
}

export function cycleSnap(current) {
  return SNAPS[(SNAPS.indexOf(current) + 1) % SNAPS.length];
}

export function initialSnap(pathname) {
  return pathname === '/add' ? 'peek' : 'half';
}
```

- [ ] **Step 3: `Panel`**

`web/src/layout/Panel.jsx`:
```jsx
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { DESKTOP_QUERY, useMediaQuery } from '../lib/useMediaQuery.js';
import styles from './Panel.module.css';
import { cycleSnap, initialSnap, nextSnap } from './sheet.js';

const SheetContext = createContext({ snap: 'half', setSnap() {} });

export function Panel({ header, children }) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const { pathname } = useLocation();
  const [snap, setSnap] = useState(() => initialSnap(pathname));
  const dragStartY = useRef(null);
  const dragged = useRef(false);

  useEffect(() => {
    setSnap(initialSnap(pathname));
  }, [pathname]);

  const value = useMemo(() => ({ snap, setSnap }), [snap]);

  const onPointerDown = (event) => {
    dragStartY.current = event.clientY;
    dragged.current = false;
  };

  const onPointerUp = (event) => {
    if (dragStartY.current === null) return;
    const next = nextSnap(snap, event.clientY - dragStartY.current);
    dragStartY.current = null;
    if (next !== snap) {
      dragged.current = true;
      setSnap(next);
    }
  };

  const onHandleClick = () => {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    setSnap(cycleSnap(snap));
  };

  return (
    <SheetContext.Provider value={value}>
      <aside className={styles.panel} data-snap={isDesktop ? undefined : snap} aria-label="Панель">
        {!isDesktop && (
          <button
            type="button"
            className={styles.handle}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onClick={onHandleClick}
            aria-expanded={snap !== 'peek'}
            aria-label={snap === 'full' ? 'Згорнути панель' : 'Розгорнути панель'}
          >
            <span className={styles.grip} aria-hidden="true" />
          </button>
        )}
        {header && <div className={styles.header}>{header}</div>}
        <div className={styles.content}>{children}</div>
      </aside>
    </SheetContext.Provider>
  );
}

export function useSheet() {
  return useContext(SheetContext);
}
```

`web/src/layout/Panel.module.css`:
```css
.panel {
  position: fixed;
  z-index: 1000;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  height: 50dvh;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  background: var(--color-surface);
  box-shadow: var(--shadow-lg);
  transition: height var(--duration-base) var(--ease-out);
}

.panel[data-snap='peek'] {
  height: calc(132px + env(safe-area-inset-bottom));
}

.panel[data-snap='full'] {
  height: calc(100dvh - 76px);
}

.handle {
  display: grid;
  flex: none;
  place-items: center;
  width: 100%;
  min-height: 28px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: grab;
  touch-action: none;
}

.grip {
  width: 44px;
  height: 5px;
  border-radius: var(--radius-full);
  background: #cbd5e1;
}

.header {
  flex: none;
  padding: 0 var(--space-4) var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.content {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: var(--space-4) var(--space-4) calc(var(--space-5) + env(safe-area-inset-bottom));
}

@media (min-width: 1024px) {
  .panel {
    top: var(--space-4);
    right: auto;
    bottom: var(--space-4);
    left: var(--space-4);
    width: var(--panel-width);
    height: auto;
    border-radius: var(--radius-lg);
  }

  .header {
    padding: var(--space-4) var(--space-5) var(--space-3);
  }

  .content {
    padding: var(--space-4) var(--space-5) var(--space-5);
  }
}
```

- [ ] **Step 4: Layout, BackLink, панелі, спільні стилі**

`web/src/layout/MapLayout.jsx`:
```jsx
import { Outlet } from 'react-router';
import { Brand } from './Brand.jsx';
import styles from './MapLayout.module.css';
import { Panel } from './Panel.jsx';

export function MapLayout() {
  return (
    <div className={styles.layout}>
      <div className={styles.map} aria-hidden="true" />
      <Panel header={<Brand />}>
        <Outlet />
      </Panel>
    </div>
  );
}
```

`web/src/layout/MapLayout.module.css`:
```css
.layout {
  position: fixed;
  inset: 0;
  overflow: hidden;
}

.map {
  position: absolute;
  inset: 0;
  background: #eef2f6;
}
```

`web/src/layout/BackLink.jsx`:
```jsx
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import styles from './BackLink.module.css';

export function BackLink({ to, children }) {
  return (
    <Link to={to} className={styles.back}>
      <ArrowLeft aria-hidden="true" size={18} />
      <span>{children}</span>
    </Link>
  );
}
```

`web/src/layout/BackLink.module.css`:
```css
.back {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--touch-target);
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  font-weight: 700;
  text-decoration: none;
}

.back:hover {
  color: var(--color-primary);
}
```

`web/src/panels/Panels.module.css`:
```css
.section {
  display: grid;
  gap: var(--space-4);
}

.stack {
  display: grid;
  gap: var(--space-2);
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.title {
  font-size: var(--text-xl);
}

.muted {
  color: var(--color-text-muted);
}

.notice {
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: var(--text-xs);
}

.list {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}
```

`web/src/panels/IntroPanel.jsx` (тимчасова; видаляється в Task 9):
```jsx
import { useMeta } from '../state/MetaProvider.jsx';
import styles from './Panels.module.css';

export function IntroPanel() {
  const { dataNotice } = useMeta();
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Знайдіть STEAM-гурток поруч</h2>
      <p className={styles.muted}>
        Університети, академії та центри Харкова з курсами з науки, технологій, інженерії, мистецтва й математики.
      </p>
      <p className={styles.notice}>{dataNotice}</p>
    </section>
  );
}
```

`web/src/panels/NotFoundPanel.jsx`:
```jsx
import { Map } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '../ui/Button.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';

export function NotFoundPanel({ title = 'Сторінку не знайдено', text = 'Можливо, посилання застаріло.' }) {
  return (
    <EmptyState
      icon={Map}
      title={title}
      text={text}
      action={
        <Button as={Link} to="/" variant="secondary">
          На карту
        </Button>
      }
    />
  );
}
```

- [ ] **Step 5: Маршрути в `App.jsx` і оновлений тест**

`web/src/App.jsx`:
```jsx
import { Route, Routes } from 'react-router';
import { MapLayout } from './layout/MapLayout.jsx';
import { IntroPanel } from './panels/IntroPanel.jsx';
import { NotFoundPanel } from './panels/NotFoundPanel.jsx';
import { MetaProvider } from './state/MetaProvider.jsx';
import { ToastProvider } from './ui/Toast.jsx';

export function App() {
  return (
    <ToastProvider>
      <MetaProvider>
        <Routes>
          <Route element={<MapLayout />}>
            <Route index element={<IntroPanel />} />
            <Route path="*" element={<NotFoundPanel />} />
          </Route>
        </Routes>
      </MetaProvider>
    </ToastProvider>
  );
}
```

`web/src/App.spec.jsx`:
```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { App } from './App.jsx';
import { mockFetch } from './test/fixtures.jsx';

const renderAt = (route) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  );

describe('App', () => {
  test('після завантаження довідників показує бренд і панель', async () => {
    mockFetch();
    renderAt('/');
    expect(await screen.findByText('STEAM-освіта Харкова')).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Панель' })).toBeInTheDocument();
  });

  test('помилка довідників → екран з повтором', async () => {
    mockFetch({
      '/api/meta': () => ({ status: 500, body: { error: { code: 'INTERNAL', message: 'Внутрішня помилка сервера' } } }),
    });
    renderAt('/');
    expect(await screen.findByText('Внутрішня помилка сервера')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Спробувати ще' })).toBeInTheDocument();
  });

  test('невідомий маршрут', async () => {
    mockFetch();
    renderAt('/nope');
    expect(await screen.findByText('Сторінку не знайдено')).toBeInTheDocument();
  });
});
```

Run: `npm run test:web` → PASS.

- [ ] **Step 6: Перевірка в браузері**

1. `npm run build`
2. `PORT=3999 MONGODB_URI= ADMIN_TOKEN=smoke-token node src/server.js` у фоні; чекати відповіді `/api/health`.
3. Скіл `claude-in-chrome`: `http://localhost:3999/` на 1440×900 — плаваюча панель зліва з брендом; на 375×812 — шторка знизу, ручка перемикає висоту; `http://localhost:3999/nope` після перезавантаження — «Сторінку не знайдено».
4. Консоль браузера — без CSP-помилок.
5. Зупинити сервер (скіл `verify-api`, крок 3).

- [ ] **Step 7: Кінець фази**

Run: `npm test && npm run test:web && npm run build` → усе зелене.
Зупинитися й написати: **«Фаза F1 готова, перевірте каркас і оболонку»** (що зроблено, результати тестів, спостереження з браузера).

---

# Фаза F2 — карта, фільтри, результати, пошук

### Task 6: Фільтри ↔ URL ↔ API

**Files:**
- Create: `web/src/state/filters.js`, `web/src/state/useFilters.js`
- Test: `web/src/state/filters.spec.js`, `web/src/state/useFilters.spec.jsx`

**Interfaces:**
- Consumes: `buildMetaIndex`, `metaFixture` (Task 4).
- Produces:
  - `EMPTY_FILTERS = { q: '', category: [], direction: [], age: '', price: '', format: [], type: [], near: false }`
  - `parseFilters(searchParams: URLSearchParams) → Filters`
  - `applyFiltersToSearch(searchParams, filters) → URLSearchParams` (інші параметри зберігаються)
  - `filtersToSearchString(filters) → '' | '?…'`
  - `toApiQuery(filters, meta, coords | null) → object` для `/api/institutions` та інших GET з фільтрами
  - `countActive(filters) → number` (без `near`), `hasCourseFilters(filters) → boolean` (без `type` і `near`)
  - `toggleValue(list, value) → list`
  - `fromApiFilters(apiFilters, meta) → Filters` (відповідь `POST /api/recommendations` → фільтри URL)
  - `useFilters() → { filters, setFilters(patch | fn), resetFilters() }` — пише в URL з `replace: true`; `resetFilters` зберігає `near`
  - `useLinkTo() → (pathname) => ({ pathname, search })` — посилання зі збереженням фільтрів

- [ ] **Step 1: Тести, що падають**

`web/src/state/filters.spec.js`:
```js
import { describe, expect, test } from 'vitest';
import { buildMetaIndex } from './MetaProvider.jsx';
import { metaFixture } from '../test/fixtures.jsx';
import {
  applyFiltersToSearch,
  countActive,
  EMPTY_FILTERS,
  filtersToSearchString,
  fromApiFilters,
  hasCourseFilters,
  parseFilters,
  toApiQuery,
  toggleValue,
} from './filters.js';

const meta = buildMetaIndex(metaFixture);

describe('parseFilters', () => {
  test('читає всі фільтри з URL', () => {
    const params = new URLSearchParams('q=arduino&category=t,E,T&direction=robotics&age=10-13&price=free&format=offline,hybrid&type=university&near=1');
    expect(parseFilters(params)).toEqual({
      q: 'arduino',
      category: ['T', 'E'],
      direction: ['robotics'],
      age: '10-13',
      price: 'free',
      format: ['offline', 'hybrid'],
      type: ['university'],
      near: true,
    });
  });

  test('порожній URL і некоректна ціна', () => {
    expect(parseFilters(new URLSearchParams(''))).toEqual(EMPTY_FILTERS);
    expect(parseFilters(new URLSearchParams('price=cheap')).price).toBe('');
  });
});

describe('applyFiltersToSearch', () => {
  test('записує лише непорожні фільтри й зберігає інші параметри', () => {
    const next = applyFiltersToSearch(new URLSearchParams('utm=demo&q=old&near=1'), {
      ...EMPTY_FILTERS,
      category: ['T', 'E'],
      price: 'paid',
    });
    expect(next.get('utm')).toBe('demo');
    expect(next.get('q')).toBeNull();
    expect(next.get('near')).toBeNull();
    expect(next.get('category')).toBe('T,E');
    expect(next.get('price')).toBe('paid');
  });

  test('parse(apply(x)) === x', () => {
    const filters = { ...EMPTY_FILTERS, q: '3d друк', direction: ['robotics', '3d-modeling'], age: '18+', format: ['online'], near: true };
    expect(parseFilters(applyFiltersToSearch(new URLSearchParams(), filters))).toEqual(filters);
  });

  test('filtersToSearchString', () => {
    expect(filtersToSearchString(EMPTY_FILTERS)).toBe('');
    expect(filtersToSearchString({ ...EMPTY_FILTERS, age: '6-9' })).toBe('?age=6-9');
  });
});

describe('toApiQuery', () => {
  test('вікова група → ageFrom/ageTo, списки через кому, координати', () => {
    const filters = { ...EMPTY_FILTERS, category: ['T'], direction: ['robotics'], age: '10-13', near: true };
    expect(toApiQuery(filters, meta, { lat: 50, lng: 36.2 })).toEqual({
      q: undefined,
      category: 'T',
      direction: 'robotics',
      ageFrom: 10,
      ageTo: 13,
      price: undefined,
      format: undefined,
      type: undefined,
      lat: 50,
      lng: 36.2,
    });
  });

  test('невідомі напрямок і вікова група відкидаються', () => {
    const query = toApiQuery({ ...EMPTY_FILTERS, direction: ['cooking'], age: '99' }, meta, null);
    expect(query.direction).toBeUndefined();
    expect(query.ageFrom).toBeUndefined();
    expect(query.lat).toBeUndefined();
  });
});

describe('лічильники та перемикачі', () => {
  test('countActive не враховує near; hasCourseFilters не враховує type', () => {
    expect(countActive({ ...EMPTY_FILTERS, near: true })).toBe(0);
    expect(countActive({ ...EMPTY_FILTERS, q: 'x', category: ['T', 'E'], age: '6-9', type: ['center'] })).toBe(5);
    expect(hasCourseFilters({ ...EMPTY_FILTERS, type: ['center'] })).toBe(false);
    expect(hasCourseFilters({ ...EMPTY_FILTERS, price: 'free' })).toBe(true);
  });

  test('toggleValue', () => {
    expect(toggleValue(['T'], 'E')).toEqual(['T', 'E']);
    expect(toggleValue(['T', 'E'], 'T')).toEqual(['E']);
  });
});

describe('fromApiFilters', () => {
  test('вік з рекомендацій → вікова група, решта як є', () => {
    expect(fromApiFilters({ ageFrom: 11, ageTo: 11, direction: ['robotics'], format: ['offline', 'hybrid'] }, meta)).toEqual({
      ...EMPTY_FILTERS,
      age: '10-13',
      direction: ['robotics'],
      format: ['offline', 'hybrid'],
    });
    expect(fromApiFilters({ ageFrom: 25, ageTo: 25, category: ['M'], price: 'free' }, meta)).toMatchObject({
      age: '18+',
      category: ['M'],
      price: 'free',
    });
  });
});
```

`web/src/state/useFilters.spec.jsx`:
```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, test } from 'vitest';
import { useFilters, useLinkTo } from './useFilters.js';

function Probe() {
  const { filters, setFilters, resetFilters } = useFilters();
  const linkTo = useLinkTo();
  const location = useLocation();
  return (
    <div>
      <p data-testid="search">{location.search}</p>
      <p data-testid="link">{JSON.stringify(linkTo('/institutions/khpi'))}</p>
      <p data-testid="category">{filters.category.join(',')}</p>
      <button onClick={() => setFilters((f) => ({ ...f, category: [...f.category, 'E'] }))}>add</button>
      <button onClick={() => setFilters({ price: 'free' })}>free</button>
      <button onClick={resetFilters}>reset</button>
    </div>
  );
}

const renderAt = (route) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <Probe />
    </MemoryRouter>,
  );

describe('useFilters', () => {
  test('оновлює URL функцією та об’єктом', async () => {
    renderAt('/?category=T');
    await userEvent.click(screen.getByRole('button', { name: 'add' }));
    expect(screen.getByTestId('category')).toHaveTextContent('T,E');
    await userEvent.click(screen.getByRole('button', { name: 'free' }));
    expect(screen.getByTestId('search')).toHaveTextContent('?category=T%2CE&price=free');
  });

  test('reset очищає фільтри, але зберігає near', async () => {
    renderAt('/?category=T&age=6-9&near=1');
    await userEvent.click(screen.getByRole('button', { name: 'reset' }));
    expect(screen.getByTestId('search')).toHaveTextContent('?near=1');
  });

  test('useLinkTo зберігає поточні фільтри', () => {
    renderAt('/?age=6-9');
    expect(screen.getByTestId('link')).toHaveTextContent('{"pathname":"/institutions/khpi","search":"?age=6-9"}');
  });
});
```

Run: `npm run test:web -- src/state` → FAIL.

- [ ] **Step 2: `web/src/state/filters.js`**

```js
export const LIST_KEYS = ['category', 'direction', 'format', 'type'];
export const FILTER_KEYS = ['q', ...LIST_KEYS, 'age', 'price', 'near'];

export const EMPTY_FILTERS = Object.freeze({
  q: '',
  category: [],
  direction: [],
  age: '',
  price: '',
  format: [],
  type: [],
  near: false,
});

const splitList = (value) => [
  ...new Set(
    (value ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  ),
];

export function parseFilters(searchParams) {
  const get = (key) => searchParams.get(key) ?? '';
  const price = get('price');
  return {
    q: get('q').trim(),
    category: [...new Set(splitList(get('category')).map((code) => code.toUpperCase()))],
    direction: splitList(get('direction')),
    age: get('age'),
    price: price === 'free' || price === 'paid' ? price : '',
    format: splitList(get('format')),
    type: splitList(get('type')),
    near: get('near') === '1',
  };
}

export function applyFiltersToSearch(searchParams, filters) {
  const next = new URLSearchParams(searchParams);
  for (const key of FILTER_KEYS) next.delete(key);
  if (filters.q) next.set('q', filters.q);
  for (const key of LIST_KEYS) {
    if (filters[key]?.length) next.set(key, filters[key].join(','));
  }
  if (filters.age) next.set('age', filters.age);
  if (filters.price) next.set('price', filters.price);
  if (filters.near) next.set('near', '1');
  return next;
}

export function filtersToSearchString(filters) {
  const search = applyFiltersToSearch(new URLSearchParams(), filters).toString();
  return search ? `?${search}` : '';
}

// Параметри для GET /api/institutions (та картки/курсів напрямку). Невідомі значення з URL відкидаються,
// щоб підроблене посилання не давало 400 від API.
export function toApiQuery(filters, meta, coords) {
  const group = meta.ageGroups.find((g) => g.id === filters.age);
  const directions = filters.direction.filter((slug) => meta.directionBySlug[slug]);
  const categories = filters.category.filter((code) => meta.categoryByCode[code]);
  const join = (list) => (list.length ? list.join(',') : undefined);
  return {
    q: filters.q || undefined,
    category: join(categories),
    direction: join(directions),
    ageFrom: group?.ageFrom,
    ageTo: group?.ageTo,
    price: filters.price || undefined,
    format: join(filters.format),
    type: join(filters.type),
    lat: coords?.lat,
    lng: coords?.lng,
  };
}

export function countActive(filters) {
  return (
    (filters.q ? 1 : 0) +
    filters.category.length +
    filters.direction.length +
    (filters.age ? 1 : 0) +
    (filters.price ? 1 : 0) +
    filters.format.length +
    filters.type.length
  );
}

export function hasCourseFilters(filters) {
  return countActive(filters) - filters.type.length > 0;
}

export function toggleValue(list, value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function fromApiFilters(apiFilters, meta) {
  const age = apiFilters.ageFrom;
  const group = age == null ? undefined : meta.ageGroups.find((g) => age >= g.ageFrom && age <= g.ageTo);
  return {
    ...EMPTY_FILTERS,
    category: apiFilters.category ?? [],
    direction: apiFilters.direction ?? [],
    age: group?.id ?? '',
    price: apiFilters.price ?? '',
    format: apiFilters.format ?? [],
  };
}
```

- [ ] **Step 3: `web/src/state/useFilters.js`**

```js
import { useCallback, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { applyFiltersToSearch, EMPTY_FILTERS, parseFilters } from './filters.js';

export function useFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const setFilters = useCallback(
    (update) => {
      setSearchParams(
        (current) => {
          const prev = parseFilters(current);
          const next = typeof update === 'function' ? update(prev) : { ...prev, ...update };
          return applyFiltersToSearch(current, next);
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const resetFilters = useCallback(() => setFilters((prev) => ({ ...EMPTY_FILTERS, near: prev.near })), [setFilters]);

  return { filters, setFilters, resetFilters };
}

export function useLinkTo() {
  const { search } = useLocation();
  return useCallback((pathname) => ({ pathname, search }), [search]);
}
```

- [ ] **Step 4: Перевірка**

Run: `npm run test:web -- src/state` → PASS.

---

### Task 7: Форматування та STEAM-кільце

**Files:**
- Create: `web/src/lib/format.js`, `web/src/map/steamRing.js`, `web/src/map/SteamRing.jsx` (+ `SteamRing.module.css`)
- Test: `web/src/lib/format.spec.js`, `web/src/map/steamRing.spec.js`

**Interfaces:**
- Consumes: `useMeta` (`colorByCode`, `categories`).
- Produces:
  - `FORMS = { institution, course, seat }` — трійки форм множини
  - `pluralForm(n, forms)`, `pluralize(n, forms) → '3 курси'`
  - `formatPrice(price, priceUnit)`, `formatAge(ageMin, ageMax)`, `formatDate('YYYY-MM-DD')`, `formatDistance(km)`, `seatsLabel(seatsLeft)`, `formatDateTime(iso)`
  - `STEAM_ORDER`, `NEUTRAL_COLOR = '#94A3B8'`
  - `ringGeometry(size, stroke) → { radius, circumference, center }`
  - `ringSegments(profile, colorByCode, circumference, gap = 2) → [{ code, color, length, offset }]`
  - `ringSvg({ profile, colorByCode, size, stroke, dashed, label }) → string` (HTML для Leaflet divIcon)
  - `escapeHtml(text)`, `initials(name)`
  - `SteamRing({ profile, size = 40, stroke = 6, dashed = false, label?, title? })`, `SteamLegend({ profile })`

- [ ] **Step 1: Тести, що падають**

`web/src/lib/format.spec.js`:
```js
import { describe, expect, test } from 'vitest';
import { FORMS, formatAge, formatDate, formatDateTime, formatDistance, formatPrice, pluralize, seatsLabel } from './format.js';

describe('pluralize (українські форми)', () => {
  test.each([
    [1, '1 курс'],
    [2, '2 курси'],
    [4, '4 курси'],
    [5, '5 курсів'],
    [11, '11 курсів'],
    [12, '12 курсів'],
    [21, '21 курс'],
    [22, '22 курси'],
    [0, '0 курсів'],
  ])('%i', (n, expected) => {
    expect(pluralize(n, FORMS.course)).toBe(expected);
  });

  test('заклади та місця', () => {
    expect(pluralize(3, FORMS.institution)).toBe('3 заклади');
    expect(pluralize(1, FORMS.seat)).toBe('1 місце');
  });
});

describe('форматери курсу', () => {
  test('ціна', () => {
    expect(formatPrice(0, 'course')).toBe('Безкоштовно');
    expect(formatPrice(1200, 'month')).toMatch(/^1\s200 грн\/міс$/);
    expect(formatPrice(900, 'course')).toBe('900 грн за курс');
  });

  test('вік', () => {
    expect(formatAge(11, 16)).toBe('11–16 років');
    expect(formatAge(18, 99)).toBe('18+ років');
  });

  test('дата старту', () => {
    expect(formatDate('2026-10-03')).toBe('3 жовтня');
    expect(formatDate('2026-12-15')).toBe('15 грудня');
  });

  test('відстань', () => {
    expect(formatDistance(0)).toBe('0 м');
    expect(formatDistance(0.4)).toBe('400 м');
    expect(formatDistance(1.8)).toBe('1,8 км');
  });

  test('місця', () => {
    expect(seatsLabel(null)).toBeNull();
    expect(seatsLabel(0)).toBe('Місць немає');
    expect(seatsLabel(1)).toBe('Лишилось 1 місце');
    expect(seatsLabel(3)).toBe('Лишилось 3 місця');
    expect(seatsLabel(5)).toBe('Лишилось 5 місць');
  });

  test('дата й час реєстрації (Київ)', () => {
    expect(formatDateTime('2026-09-17T11:05:00.000Z')).toMatch(/17 вересня.*14:05/);
  });
});
```

`web/src/map/steamRing.spec.js`:
```js
import { describe, expect, test } from 'vitest';
import { escapeHtml, initials, NEUTRAL_COLOR, ringGeometry, ringSegments, ringSvg } from './steamRing.js';

const colors = { S: '#16A34A', T: '#2563EB', E: '#EA580C', A: '#DB2777', M: '#7C3AED' };

describe('ringSegments', () => {
  test('сегменти в порядку S T E A M, пропорційні кількості курсів', () => {
    const segments = ringSegments({ S: 0, T: 2, E: 2, A: 0, M: 0 }, colors, 100, 2);
    expect(segments.map((s) => s.code)).toEqual(['T', 'E']);
    expect(segments[0]).toEqual({ code: 'T', color: '#2563EB', length: 48, offset: 0 });
    expect(segments[1]).toEqual({ code: 'E', color: '#EA580C', length: 48, offset: 50 });
  });

  test('одна категорія — суцільне кільце без проміжку', () => {
    expect(ringSegments({ S: 3, T: 0, E: 0, A: 0, M: 0 }, colors, 100)).toEqual([
      { code: 'S', color: '#16A34A', length: 100, offset: 0 },
    ]);
  });

  test('порожній профіль — нейтральне кільце', () => {
    expect(ringSegments({ S: 0, T: 0, E: 0, A: 0, M: 0 }, colors, 100)).toEqual([
      { code: null, color: NEUTRAL_COLOR, length: 100, offset: 0 },
    ]);
    expect(ringSegments(undefined, colors, 100)).toHaveLength(1);
  });
});

describe('ringGeometry', () => {
  test('радіус вписаний у розмір з урахуванням товщини', () => {
    const { radius, center, circumference } = ringGeometry(46, 6);
    expect(center).toBe(23);
    expect(radius).toBe(19);
    expect(circumference).toBeCloseTo(2 * Math.PI * 19);
  });
});

describe('ringSvg', () => {
  test('екранує підпис (назва з публічної заявки)', () => {
    const svg = ringSvg({ profile: {}, colorByCode: colors, size: 46, stroke: 6, label: '<img onerror=x>' });
    expect(svg).not.toContain('<img');
    expect(svg).toContain('&lt;img onerror=x&gt;');
  });

  test('pending — пунктирне нейтральне кільце', () => {
    const svg = ringSvg({ profile: { T: 1 }, colorByCode: colors, size: 46, stroke: 6, dashed: true, label: 'Ш' });
    expect(svg).toContain('stroke-dasharray="4 3"');
    expect(svg).toContain(NEUTRAL_COLOR);
    expect(svg).not.toContain('#2563EB');
  });
});

describe('escapeHtml / initials', () => {
  test('escapeHtml', () => {
    expect(escapeHtml(`"<a href='x'>&</a>"`)).toBe('&quot;&lt;a href=&#39;x&#39;&gt;&amp;&lt;/a&gt;&quot;');
  });

  test.each([
    ['НТУ «ХПІ»', 'НТУ'],
    ['ХНПУ ім. Г. С. Сковороди', 'ХНПУ'],
    ['ITSTEP Академія', 'IT'],
    ['Палац дитячої та юнацької творчості', 'ПД'],
    ['Школа', 'Ш'],
    ['', '?'],
  ])('initials(%s) = %s', (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});
```

Run: `npm run test:web -- src/lib src/map` → FAIL.

- [ ] **Step 2: `web/src/lib/format.js`**

```js
const MONTHS_GENITIVE = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];

export const FORMS = {
  institution: ['заклад', 'заклади', 'закладів'],
  course: ['курс', 'курси', 'курсів'],
  seat: ['місце', 'місця', 'місць'],
};

export function pluralForm(n, [one, few, many]) {
  const mod100 = Math.abs(n) % 100;
  const mod10 = mod100 % 10;
  if (mod100 > 10 && mod100 < 20) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

export function pluralize(n, forms) {
  return `${n} ${pluralForm(n, forms)}`;
}

export function formatPrice(price, priceUnit) {
  if (price === 0) return 'Безкоштовно';
  const amount = new Intl.NumberFormat('uk-UA').format(price);
  return priceUnit === 'month' ? `${amount} грн/міс` : `${amount} грн за курс`;
}

export function formatAge(ageMin, ageMax) {
  return ageMax >= 99 ? `${ageMin}+ років` : `${ageMin}–${ageMax} років`;
}

export function formatDate(isoDate) {
  const [, month, day] = isoDate.split('-').map(Number);
  return `${day} ${MONTHS_GENITIVE[month - 1]}`;
}

export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} м`;
  return `${km.toFixed(1).replace('.', ',')} км`;
}

export function seatsLabel(seatsLeft) {
  if (seatsLeft === null || seatsLeft === undefined) return null;
  if (seatsLeft === 0) return 'Місць немає';
  return `Лишилось ${pluralize(seatsLeft, FORMS.seat)}`;
}

export function formatDateTime(iso) {
  return new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Kyiv',
  }).format(new Date(iso));
}
```

- [ ] **Step 3: `web/src/map/steamRing.js`**

```js
export const STEAM_ORDER = ['S', 'T', 'E', 'A', 'M'];
export const NEUTRAL_COLOR = '#94A3B8';

export function ringGeometry(size, stroke) {
  const radius = size / 2 - stroke / 2 - 1;
  return { radius, circumference: 2 * Math.PI * radius, center: size / 2 };
}

// Сегменти кільця за кількістю курсів у кожній категорії STEAM
export function ringSegments(profile, colorByCode, circumference, gap = 2) {
  const entries = STEAM_ORDER.map((code) => [code, profile?.[code] ?? 0]).filter(([, count]) => count > 0);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  if (total === 0) return [{ code: null, color: NEUTRAL_COLOR, length: circumference, offset: 0 }];

  const gapLength = entries.length > 1 ? gap : 0;
  let offset = 0;
  return entries.map(([code, count]) => {
    const full = (count / total) * circumference;
    const segment = { code, color: colorByCode[code] ?? NEUTRAL_COLOR, length: Math.max(full - gapLength, 0.5), offset };
    offset += full;
    return segment;
  });
}

export function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(text).replace(/[&<>"']/g, (ch) => map[ch]);
}

// HTML для L.divIcon. Підпис завжди екранується: назви приходять з публічних заявок.
export function ringSvg({ profile, colorByCode, size, stroke, dashed = false, label = '' }) {
  const { radius, circumference, center } = ringGeometry(size, stroke);
  const segments = dashed
    ? [{ code: null, color: NEUTRAL_COLOR, length: circumference, offset: 0 }]
    : ringSegments(profile, colorByCode, circumference);
  const fixed = (n) => Number(n.toFixed(2));
  const circles = segments
    .map((s) => {
      const dash = dashed ? '4 3' : `${fixed(s.length)} ${fixed(circumference - s.length)}`;
      return `<circle cx="${center}" cy="${center}" r="${fixed(radius)}" fill="none" stroke="${s.color}" stroke-width="${stroke}" stroke-dasharray="${dash}" stroke-dashoffset="${fixed(-s.offset)}" transform="rotate(-90 ${center} ${center})"/>`;
    })
    .join('');
  const fontSize = label.length > 3 ? Math.round(size * 0.2) : Math.round(size * 0.26);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">` +
    `<circle cx="${center}" cy="${center}" r="${fixed(radius + stroke / 2)}" fill="#fff"/>` +
    circles +
    `<text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="Manrope Variable, sans-serif" font-size="${fontSize}" font-weight="800" fill="#0F172A">${escapeHtml(label)}</text>` +
    `</svg>`
  );
}

export function initials(name) {
  const words = String(name ?? '')
    .replace(/[«»"'’ʼ.,()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  const [first, second] = words;
  const isAcronym = first.length > 1 && first === first.toLocaleUpperCase('uk');
  if (isAcronym) return first.length <= 4 ? first : first.slice(0, 2);
  return `${first[0]}${second?.[0] ?? ''}`.toLocaleUpperCase('uk');
}
```

- [ ] **Step 4: React-компоненти кільця**

`web/src/map/SteamRing.jsx`:
```jsx
import { useMeta } from '../state/MetaProvider.jsx';
import styles from './SteamRing.module.css';
import { NEUTRAL_COLOR, ringGeometry, ringSegments, STEAM_ORDER } from './steamRing.js';

export function SteamRing({ profile, size = 40, stroke = 6, dashed = false, label, title }) {
  const { colorByCode } = useMeta();
  const { radius, circumference, center } = ringGeometry(size, stroke);
  const segments = dashed
    ? [{ code: null, color: NEUTRAL_COLOR, length: circumference, offset: 0 }]
    : ringSegments(profile, colorByCode, circumference);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={styles.ring}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#E2E8F0" strokeWidth={stroke} />
      {segments.map((s, index) => (
        <circle
          key={s.code ?? index}
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={s.color}
          strokeWidth={stroke}
          strokeDasharray={dashed ? '4 3' : `${s.length} ${circumference - s.length}`}
          strokeDashoffset={-s.offset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      ))}
      {label && (
        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className={styles.label}>
          {label}
        </text>
      )}
    </svg>
  );
}

// Текстова розшифровка кільця — кольори не єдиний носій інформації
export function SteamLegend({ profile }) {
  const { categoryByCode } = useMeta();
  const entries = STEAM_ORDER.filter((code) => (profile?.[code] ?? 0) > 0);
  if (entries.length === 0) return null;
  return (
    <ul className={styles.legend}>
      {entries.map((code) => (
        <li key={code} style={{ '--legend-color': categoryByCode[code].color }}>
          <span className={styles.swatch} aria-hidden="true" />
          {categoryByCode[code].name} · {profile[code]}
        </li>
      ))}
    </ul>
  );
}
```

`web/src/map/SteamRing.module.css`:
```css
.ring {
  flex: none;
  display: block;
}

.label {
  fill: var(--color-text);
  font-size: 11px;
  font-weight: 800;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--text-xs);
  font-weight: 700;
}

.legend li {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.swatch {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  background: var(--legend-color);
}
```

- [ ] **Step 5: Перевірка**

Run: `npm run test:web -- src/lib src/map` → PASS.

---

### Task 8: Карта, стан карти, геолокація

**Files:**
- Create: `web/src/map/geo.js`, `web/src/state/useGeolocation.js`, `web/src/state/MapProvider.jsx`
- Create: `web/src/map/markers.js`, `web/src/map/markers.css`, `web/src/map/MapView.jsx` (+ `MapView.module.css`), `web/src/map/LocationButton.jsx` (+ css)
- Modify: `web/src/layout/MapLayout.jsx`, `web/src/layout/MapLayout.module.css`, `web/src/test/fixtures.jsx`
- Test: `web/src/map/geo.spec.js`, `web/src/state/useGeolocation.spec.jsx`, `web/src/state/MapProvider.spec.jsx`

**Interfaces:**
- Consumes: `useFilters`, `toApiQuery`, `filtersToSearchString`, `hasCourseFilters`, `useApi`, `useMeta`, `useToast`, `ringSvg`, `initials`, `prefersReducedMotion`, `useMediaQuery`.
- Produces:
  - `isWithinBounds({ lat, lng }, bounds) → boolean`, `roundCoord(n) → n` (5 знаків), `focusOffset({ isDesktop, height }) → [dx, dy]`
  - `useGeolocation() → { coords, status: 'idle'|'pending'|'granted'|'denied'|'unsupported', locate(): Promise<coords|null> }`
  - `MapProvider`, `useMapState()` →
    `{ markers, filters, selectedId, setSelectedId, highlightedIds, showHighlight(ids, filters), pickMode, pickPoint, setPickPoint, userLocation, geoStatus, locate(), enableNear(), disableNear(), catalogVersion, refreshCatalog() }`
  - `useSelectedInstitution(id | null)`
  - `markerLabel(marker, filters)`, `institutionIcon(marker, { colorByCode, label, selected, highlighted })`, `pickIcon`
  - `MapView`, `LocationButton({ compact? })`
  - Фікстури: `markersFixture`

- [ ] **Step 1: Фікстура маркерів**

Додати в `web/src/test/fixtures.jsx`:
```jsx
export const markersFixture = {
  summary: { institutions: 3, courses: 8 },
  items: [
    {
      id: 'khpi',
      name: 'Національний технічний університет «Харківський політехнічний інститут»',
      shortName: 'НТУ «ХПІ»',
      type: 'university',
      lat: 49.9989798,
      lng: 36.2483061,
      address: 'вул. Кирпичова, 2, Харків, 61002',
      status: 'approved',
      courseCount: 4,
      matchedCourseCount: 4,
      steamProfile: { S: 0, T: 2, E: 2, A: 0, M: 0 },
      distanceKm: null,
    },
    {
      id: 'kh-palace',
      name: 'Харківський обласний Палац дитячої та юнацької творчості',
      shortName: 'Палац дитячої та юнацької творчості',
      type: 'center',
      lat: 50.003594,
      lng: 36.2346559,
      address: 'вул. Сумська, 37, Харків, 61022',
      status: 'approved',
      courseCount: 3,
      matchedCourseCount: 3,
      steamProfile: { S: 1, T: 1, E: 0, A: 1, M: 0 },
      distanceKm: null,
    },
    {
      id: '5c0f6a1e-1111-4222-8333-944455556666',
      name: 'Школа робототехніки «Кібер»',
      shortName: 'Школа робототехніки «Кібер»',
      type: 'private_school',
      lat: 50.0021,
      lng: 36.2445,
      address: 'вул. Пушкінська, 50, Харків',
      status: 'pending',
      courseCount: 0,
      matchedCourseCount: 0,
      steamProfile: { S: 0, T: 1, E: 0, A: 0, M: 0 },
      distanceKm: null,
    },
  ],
};
```

- [ ] **Step 2: Тести, що падають**

`web/src/map/geo.spec.js`:
```js
import { describe, expect, test } from 'vitest';
import { focusOffset, isWithinBounds, roundCoord } from './geo.js';

const bounds = { south: 49.88, west: 36.1, north: 50.1, east: 36.46 };

describe('geo', () => {
  test('isWithinBounds', () => {
    expect(isWithinBounds({ lat: 50.0021, lng: 36.2445 }, bounds)).toBe(true);
    expect(isWithinBounds({ lat: 50.45, lng: 30.52 }, bounds)).toBe(false);
  });

  test('roundCoord — 5 знаків після коми', () => {
    expect(roundCoord(50.002123456)).toBe(50.00212);
  });

  test('focusOffset зсуває центр так, щоб точка не ховалась під панеллю', () => {
    expect(focusOffset({ isDesktop: true, height: 900 })).toEqual([-216, 0]);
    expect(focusOffset({ isDesktop: false, height: 800 })).toEqual([0, 200]);
  });
});
```

`web/src/state/useGeolocation.spec.jsx`:
```jsx
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { useGeolocation } from './useGeolocation.js';

const setGeolocation = (value) => Object.defineProperty(navigator, 'geolocation', { value, configurable: true });

afterEach(() => setGeolocation(undefined));

describe('useGeolocation', () => {
  test('успіх → coords і status granted', async () => {
    setGeolocation({ getCurrentPosition: (ok) => ok({ coords: { latitude: 50.004, longitude: 36.235 } }) });
    const { result } = renderHook(() => useGeolocation());
    let coords;
    await act(async () => {
      coords = await result.current.locate();
    });
    expect(coords).toEqual({ lat: 50.004, lng: 36.235 });
    expect(result.current).toMatchObject({ coords, status: 'granted' });
  });

  test('відмова → null і status denied', async () => {
    setGeolocation({ getCurrentPosition: (ok, fail) => fail({ code: 1 }) });
    const { result } = renderHook(() => useGeolocation());
    await act(async () => {
      expect(await result.current.locate()).toBeNull();
    });
    expect(result.current.status).toBe('denied');
  });

  test('браузер без геолокації → unsupported', async () => {
    const { result } = renderHook(() => useGeolocation());
    await act(async () => {
      expect(await result.current.locate()).toBeNull();
    });
    expect(result.current.status).toBe('unsupported');
  });
});
```

`web/src/state/MapProvider.spec.jsx`:
```jsx
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test } from 'vitest';
import { markersFixture, mockFetch, renderWithProviders } from '../test/fixtures.jsx';
import { MapProvider, useMapState } from './MapProvider.jsx';

function Probe() {
  const { markers, filters, highlightedIds, showHighlight } = useMapState();
  return (
    <div>
      <p data-testid="count">{markers.data?.items.length ?? 'loading'}</p>
      <p data-testid="near">{String(filters.near)}</p>
      <p data-testid="highlight">{highlightedIds.join(',')}</p>
      <button onClick={() => showHighlight(['khpi'], filters)}>highlight</button>
    </div>
  );
}

afterEach(() => Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true }));

describe('MapProvider', () => {
  test('запитує маркери з фільтрами з URL', async () => {
    const fetchMock = mockFetch({ '/api/institutions': markersFixture });
    renderWithProviders(
      <MapProvider>
        <Probe />
      </MapProvider>,
      { route: '/?age=10-13&category=T' },
    );
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('3'));
    const url = fetchMock.mock.calls.map(([u]) => String(u)).find((u) => u.startsWith('/api/institutions'));
    expect(url).toBe('/api/institutions?category=T&ageFrom=10&ageTo=13');
  });

  test('near=1 без доступу до геолокації → фільтр знімається і показується повідомлення', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition: (ok, fail) => fail({ code: 1 }) },
      configurable: true,
    });
    mockFetch({ '/api/institutions': markersFixture });
    renderWithProviders(
      <MapProvider>
        <Probe />
      </MapProvider>,
      { route: '/?near=1' },
    );
    await waitFor(() => expect(screen.getByTestId('near')).toHaveTextContent('false'));
    expect(screen.getByRole('status')).toHaveTextContent('Не вдалося визначити ваше місцезнаходження');
  });

  test('підсвітка діє, доки не змінились фільтри', async () => {
    mockFetch({ '/api/institutions': markersFixture });
    renderWithProviders(
      <MapProvider>
        <Probe />
      </MapProvider>,
      { route: '/?age=10-13' },
    );
    await userEvent.click(screen.getByRole('button', { name: 'highlight' }));
    expect(screen.getByTestId('highlight')).toHaveTextContent('khpi');
  });
});
```

Run: `npm run test:web -- src/map/geo.spec.js src/state` → FAIL.

- [ ] **Step 3: `geo.js` і `useGeolocation.js`**

`web/src/map/geo.js`:
```js
// Копія перевірки з бекенду (src/services/geo.js): фронтенд не імпортує серверний код
export function isWithinBounds({ lat, lng }, { south, west, north, east }) {
  return lat >= south && lat <= north && lng >= west && lng <= east;
}

export function roundCoord(value) {
  return Math.round(value * 1e5) / 1e5;
}

// На desktop точку перекриває ліва панель (400px + відступ), на mobile — нижня шторка (половина екрана)
export function focusOffset({ isDesktop, height }) {
  return isDesktop ? [-216, 0] : [0, Math.round(height * 0.25)];
}
```

`web/src/state/useGeolocation.js`:
```js
import { useCallback, useState } from 'react';

export function useGeolocation() {
  const [state, setState] = useState({ coords: null, status: 'idle' });

  const locate = useCallback(
    () =>
      new Promise((resolve) => {
        if (!navigator.geolocation) {
          setState({ coords: null, status: 'unsupported' });
          resolve(null);
          return;
        }
        setState((prev) => ({ ...prev, status: 'pending' }));
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
            setState({ coords, status: 'granted' });
            resolve(coords);
          },
          () => {
            setState({ coords: null, status: 'denied' });
            resolve(null);
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
        );
      }),
    [],
  );

  return { ...state, locate };
}
```

- [ ] **Step 4: `MapProvider.jsx`**

```jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useMatch } from 'react-router';
import { useApi } from '../api/useApi.js';
import { useToast } from '../ui/Toast.jsx';
import { filtersToSearchString, toApiQuery } from './filters.js';
import { useMeta } from './MetaProvider.jsx';
import { useFilters } from './useFilters.js';
import { useGeolocation } from './useGeolocation.js';

const MapStateContext = createContext(null);
const GEO_DENIED_MESSAGE = 'Не вдалося визначити ваше місцезнаходження. Дозвольте доступ до геолокації в браузері.';

export function MapProvider({ children }) {
  const meta = useMeta();
  const { filters, setFilters } = useFilters();
  const toast = useToast();
  const geo = useGeolocation();
  const pickMode = Boolean(useMatch('/add'));

  const [selectedId, setSelectedId] = useState(null);
  const [highlight, setHighlight] = useState({ ids: [], key: null });
  const [pickPoint, setPickPoint] = useState(null);
  const [catalogVersion, setCatalogVersion] = useState(0);

  const enableNear = useCallback(async () => {
    const coords = geo.coords ?? (await geo.locate());
    if (coords) setFilters({ near: true });
    else {
      setFilters({ near: false });
      toast.show(GEO_DENIED_MESSAGE, { tone: 'danger' });
    }
    return coords;
  }, [geo.coords, geo.locate, setFilters, toast]);

  const disableNear = useCallback(() => setFilters({ near: false }), [setFilters]);

  // Посилання з near=1: визначаємо місцезнаходження один раз після відкриття
  const nearRequested = useRef(false);
  useEffect(() => {
    if (!filters.near || geo.coords || nearRequested.current) return;
    nearRequested.current = true;
    enableNear();
  }, [filters.near, geo.coords, enableNear]);

  const coords = filters.near ? geo.coords : null;
  const markers = useApi('/api/institutions', {
    query: toApiQuery(filters, meta, coords),
    keepPreviousData: true,
    refreshKey: catalogVersion,
  });

  const filtersKey = filtersToSearchString(filters);
  const highlightedIds = highlight.key === filtersKey ? highlight.ids : [];

  const showHighlight = useCallback((ids, forFilters) => {
    setHighlight({ ids, key: filtersToSearchString(forFilters) });
  }, []);

  const refreshCatalog = useCallback(() => setCatalogVersion((v) => v + 1), []);

  const value = useMemo(
    () => ({
      markers,
      filters,
      selectedId,
      setSelectedId,
      highlightedIds,
      showHighlight,
      pickMode,
      pickPoint,
      setPickPoint,
      userLocation: geo.coords,
      geoStatus: geo.status,
      locate: geo.locate,
      enableNear,
      disableNear,
      catalogVersion,
      refreshCatalog,
    }),
    [markers, filters, selectedId, highlightedIds, showHighlight, pickMode, pickPoint, geo.coords, geo.status, geo.locate, enableNear, disableNear, catalogVersion, refreshCatalog],
  );

  return <MapStateContext.Provider value={value}>{children}</MapStateContext.Provider>;
}

export function useMapState() {
  const ctx = useContext(MapStateContext);
  if (!ctx) throw new Error('useMapState must be used inside MapProvider');
  return ctx;
}

export function useSelectedInstitution(id) {
  const { setSelectedId } = useMapState();
  useEffect(() => {
    setSelectedId(id ?? null);
  }, [id, setSelectedId]);
}
```

Run: `npm run test:web -- src/map/geo.spec.js src/state` → PASS.

- [ ] **Step 5: Маркери Leaflet**

`web/src/map/markers.js`:
```js
import L from 'leaflet';
import { hasCourseFilters } from '../state/filters.js';
import { initials, ringSvg } from './steamRing.js';

// Коли активні фільтри курсів, у центрі кільця — кількість відповідних курсів, інакше — ініціали
export function markerLabel(marker, filters) {
  return hasCourseFilters(filters) ? String(marker.matchedCourseCount) : initials(marker.shortName);
}

const iconCache = new Map();

export function institutionIcon(marker, { colorByCode, label, selected, highlighted }) {
  const pending = marker.status === 'pending';
  const size = selected ? 60 : 46;
  const key = [marker.id, JSON.stringify(marker.steamProfile), label, selected, highlighted, pending].join('|');
  if (!iconCache.has(key)) {
    const className = ['al-marker', selected && 'al-marker--selected', highlighted && 'al-marker--highlighted', pending && 'al-marker--pending']
      .filter(Boolean)
      .join(' ');
    iconCache.set(
      key,
      L.divIcon({
        html: ringSvg({ profile: marker.steamProfile, colorByCode, size, stroke: selected ? 8 : 6, dashed: pending, label }),
        className,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      }),
    );
  }
  return iconCache.get(key);
}

export const pickIcon = L.divIcon({
  html: '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48" aria-hidden="true"><path d="M18 46s16-15.2 16-28A16 16 0 0 0 2 18c0 12.8 16 28 16 28z" fill="#2563EB" stroke="#fff" stroke-width="3"/><circle cx="18" cy="18" r="6" fill="#fff"/></svg>',
  className: 'al-pick',
  iconSize: [36, 48],
  iconAnchor: [18, 46],
});
```

`web/src/map/markers.css`:
```css
.al-marker {
  border-radius: 50%;
  filter: drop-shadow(0 2px 4px rgb(15 23 42 / 25%));
  transition: transform var(--duration-fast) var(--ease-out);
}

.al-marker:hover {
  transform: scale(1.08);
}

.al-marker svg {
  display: block;
}

.al-marker--highlighted::after {
  position: absolute;
  inset: -6px;
  border: 3px solid var(--color-primary);
  border-radius: 50%;
  content: '';
  animation: al-pulse 1.6s var(--ease-out) infinite;
}

.al-pick {
  filter: drop-shadow(0 4px 6px rgb(15 23 42 / 30%));
}

@keyframes al-pulse {
  from {
    opacity: 0.9;
    transform: scale(0.9);
  }
  to {
    opacity: 0;
    transform: scale(1.5);
  }
}
```

- [ ] **Step 6: `MapView.jsx`**

```jsx
import 'leaflet/dist/leaflet.css';
import './markers.css';
import { useEffect } from 'react';
import { CircleMarker, MapContainer, Marker, TileLayer, useMap, useMapEvents, ZoomControl } from 'react-leaflet';
import { useLocation, useNavigate } from 'react-router';
import { prefersReducedMotion } from '../lib/reducedMotion.js';
import { DESKTOP_QUERY, useMediaQuery } from '../lib/useMediaQuery.js';
import { useMapState } from '../state/MapProvider.jsx';
import { useMeta } from '../state/MetaProvider.jsx';
import { focusOffset, roundCoord } from './geo.js';
import { institutionIcon, markerLabel, pickIcon } from './markers.js';
import styles from './MapView.module.css';

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
const USER_DOT = { color: '#ffffff', weight: 3, fillColor: '#2563EB', fillOpacity: 1 };

export function MapView() {
  const { city, colorByCode } = useMeta();
  const { markers, filters, selectedId, highlightedIds, pickMode, pickPoint, setPickPoint, userLocation } = useMapState();
  const navigate = useNavigate();
  const { search } = useLocation();
  const items = markers.data?.items ?? [];
  const { south, west, north, east } = city.bounds;

  return (
    <MapContainer
      className={styles.map}
      center={[city.center.lat, city.center.lng]}
      zoom={city.zoom}
      minZoom={11}
      maxZoom={18}
      maxBounds={[
        [south - 0.15, west - 0.25],
        [north + 0.15, east + 0.25],
      ]}
      maxBoundsViscosity={0.8}
      zoomControl={false}
    >
      <TileLayer url={TILE_URL} attribution={ATTRIBUTION} subdomains="abcd" maxZoom={19} />
      <ZoomControl position="bottomright" />
      {items.map((marker) => {
        const selected = marker.id === selectedId;
        const highlighted = highlightedIds.includes(marker.id);
        return (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            title={marker.shortName}
            alt={marker.shortName}
            keyboard={false}
            interactive={!pickMode}
            opacity={pickMode ? 0.5 : 1}
            zIndexOffset={selected ? 1000 : highlighted ? 500 : 0}
            icon={institutionIcon(marker, { colorByCode, label: markerLabel(marker, filters), selected, highlighted })}
            eventHandlers={{ click: () => navigate({ pathname: `/institutions/${marker.id}`, search }) }}
          />
        );
      })}
      {userLocation && <CircleMarker center={[userLocation.lat, userLocation.lng]} radius={8} pathOptions={USER_DOT} />}
      <FocusOn point={items.find((m) => m.id === selectedId)} />
      <FocusOn point={filters.near ? userLocation : null} minZoom={14} />
      {pickMode && <PickLayer point={pickPoint} onPick={setPickPoint} />}
    </MapContainer>
  );
}

function FocusOn({ point, minZoom = 15 }) {
  const map = useMap();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const lat = point?.lat;
  const lng = point?.lng;

  useEffect(() => {
    if (lat == null || lng == null) return;
    const zoom = Math.max(map.getZoom(), minZoom);
    const [dx, dy] = focusOffset({ isDesktop, height: map.getSize().y });
    const target = map.unproject(map.project([lat, lng], zoom).add([dx, dy]), zoom);
    if (prefersReducedMotion()) map.setView(target, zoom);
    else map.flyTo(target, zoom, { duration: 0.6 });
  }, [lat, lng, isDesktop, map, minZoom]);

  return null;
}

function PickLayer({ point, onPick }) {
  useMapEvents({
    click: (event) => onPick({ lat: roundCoord(event.latlng.lat), lng: roundCoord(event.latlng.lng) }),
  });
  if (!point) return null;
  return (
    <Marker
      position={[point.lat, point.lng]}
      icon={pickIcon}
      draggable
      keyboard={false}
      eventHandlers={{
        dragend: (event) => {
          const { lat, lng } = event.target.getLatLng();
          onPick({ lat: roundCoord(lat), lng: roundCoord(lng) });
        },
      }}
    />
  );
}
```

`web/src/map/MapView.module.css`:
```css
.map {
  width: 100%;
  height: 100%;
}

@media (max-width: 1023px) {
  .map :global(.leaflet-control-zoom) {
    display: none;
  }

  .map :global(.leaflet-bottom.leaflet-right) {
    bottom: 50dvh;
  }
}
```

- [ ] **Step 7: Кнопка «Поруч зі мною» і layout**

`web/src/map/LocationButton.jsx`:
```jsx
import { LocateFixed, LoaderCircle } from 'lucide-react';
import { useMapState } from '../state/MapProvider.jsx';
import styles from './LocationButton.module.css';

export function LocationButton({ compact = false }) {
  const { filters, geoStatus, enableNear, disableNear } = useMapState();
  const pending = geoStatus === 'pending';
  const Icon = pending ? LoaderCircle : LocateFixed;
  const label = pending ? 'Визначаємо місцезнаходження…' : 'Поруч зі мною';

  return (
    <button
      type="button"
      className={`${styles.locate} ${compact ? styles.compact : ''}`}
      aria-pressed={filters.near}
      aria-label={compact ? label : undefined}
      disabled={pending}
      onClick={filters.near ? disableNear : enableNear}
    >
      <Icon aria-hidden="true" size={20} className={pending ? styles.spin : undefined} />
      {!compact && <span>{label}</span>}
    </button>
  );
}
```

`web/src/map/LocationButton.module.css`:
```css
.locate {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--touch-target);
  padding: 0 var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  color: var(--color-text);
  font-weight: 700;
  box-shadow: var(--shadow-md);
  cursor: pointer;
}

.locate[aria-pressed='true'] {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.compact {
  justify-content: center;
  width: var(--touch-target);
  padding: 0;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

`web/src/layout/MapLayout.jsx`:
```jsx
import { Outlet } from 'react-router';
import { DESKTOP_QUERY, useMediaQuery } from '../lib/useMediaQuery.js';
import { LocationButton } from '../map/LocationButton.jsx';
import { MapView } from '../map/MapView.jsx';
import { MapProvider, useMapState } from '../state/MapProvider.jsx';
import { Brand } from './Brand.jsx';
import styles from './MapLayout.module.css';
import { Panel } from './Panel.jsx';

export function MapLayout() {
  return (
    <MapProvider>
      <MapScreen />
    </MapProvider>
  );
}

function MapScreen() {
  const { pickMode } = useMapState();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  return (
    <div className={styles.layout} data-picking={pickMode || undefined}>
      <div className={styles.map}>
        <MapView />
      </div>
      <div className={styles.mapControls}>
        <LocationButton compact={!isDesktop} />
      </div>
      <Panel header={<Brand compact={!isDesktop} />}>
        <Outlet />
      </Panel>
    </div>
  );
}
```

`web/src/layout/MapLayout.module.css`:
```css
.layout {
  position: fixed;
  inset: 0;
  overflow: hidden;
}

.map {
  position: absolute;
  inset: 0;
  background: #eef2f6;
}

.layout[data-picking] :global(.leaflet-container) {
  cursor: crosshair;
}

.mapControls {
  position: absolute;
  z-index: 900;
  top: calc(76px + env(safe-area-inset-top));
  right: var(--space-4);
  display: grid;
  gap: var(--space-2);
}

@media (min-width: 1024px) {
  .mapControls {
    top: auto;
    right: var(--space-4);
    bottom: 104px;
  }
}
```

- [ ] **Step 8: Перевірка**

Run: `npm run test:web` → PASS.
Run: `npm run build` → успішно.
Браузер (скіл `claude-in-chrome`, сервер з Task 5 Step 6): на `/` видно світлу карту Харкова з 4 кільцями STEAM; клік по мітці змінює URL на `/institutions/<id>` (панель поки «Сторінку не знайдено» — маршрут з’явиться в Task 11); «Поруч зі мною» просить дозвіл і показує синю точку; консоль без CSP-помилок.

---

### Task 9: Результати та фільтри

**Files:**
- Create: `web/src/filters/FiltersForm.jsx` (+ css), `web/src/filters/FiltersPanel.jsx` (+ css), `web/src/filters/FiltersDialogButton.jsx` (+ css)
- Create: `web/src/panels/ResultsPanel.jsx` (+ `ResultsPanel.module.css`)
- Create: `web/src/layout/TopBar.jsx` (+ css), `web/src/layout/DesktopHeader.jsx`
- Modify: `web/src/layout/MapLayout.jsx`, `web/src/App.jsx`
- Delete: `web/src/panels/IntroPanel.jsx`
- Test: `web/src/panels/ResultsPanel.spec.jsx`, `web/src/filters/FiltersForm.spec.jsx`

**Interfaces:**
- Consumes: `useFilters`, `useLinkTo`, `countActive`, `hasCourseFilters`, `toggleValue`, `useMapState`, `useSelectedInstitution`, `SteamRing`, `FORMS`, `pluralize`, `formatDistance`, `Chip`, `Badge`, `Button`, `IconButton`, `Dialog`, `EmptyState`, `ErrorState`, `Skeleton`, `Brand`.
- Produces:
  - `FiltersForm({ filters, onChange(patch) })`
  - `FiltersPanel()` (desktop), `FiltersDialogButton()` (mobile)
  - `ResultsPanel()` — маршрут `/`
  - `TopBar({ children })` — плаваючий рядок зверху на mobile; `DesktopHeader({ children })` — вміст шапки панелі на desktop
  - Після Task 10 у `TopBar` і `DesktopHeader` додається `SearchBox`

- [ ] **Step 1: Тести, що падають**

`web/src/filters/FiltersForm.spec.jsx`:
```jsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router';
import { describe, expect, test } from 'vitest';
import { useFilters } from '../state/useFilters.js';
import { renderWithProviders } from '../test/fixtures.jsx';
import { FiltersForm } from './FiltersForm.jsx';

function Harness() {
  const { filters, setFilters } = useFilters();
  const { search } = useLocation();
  return (
    <>
      <FiltersForm filters={filters} onChange={setFilters} />
      <p data-testid="search">{decodeURIComponent(search)}</p>
    </>
  );
}

describe('FiltersForm', () => {
  test('категорії перемикаються, вік — одиночний вибір', async () => {
    renderWithProviders(<Harness />, { route: '/?direction=robotics' });
    await userEvent.click(screen.getByRole('button', { name: 'Технології' }));
    await userEvent.click(screen.getByRole('button', { name: 'Інженерія' }));
    await userEvent.click(screen.getByRole('button', { name: '10–13 років' }));
    await userEvent.click(screen.getByRole('button', { name: '14–17 років' }));
    expect(screen.getByTestId('search')).toHaveTextContent('?category=T,E&direction=robotics&age=14-17');
    expect(screen.getByRole('button', { name: 'Технології' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('активний напрямок показується й знімається', async () => {
    renderWithProviders(<Harness />, { route: '/?direction=robotics' });
    await userEvent.click(screen.getByRole('button', { name: 'Робототехніка' }));
    expect(screen.getByTestId('search')).toHaveTextContent('');
    expect(screen.queryByRole('group', { name: 'Напрямки' })).not.toBeInTheDocument();
  });
});
```

`web/src/panels/ResultsPanel.spec.jsx`:
```jsx
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { MapProvider } from '../state/MapProvider.jsx';
import { markersFixture, mockFetch, renderWithProviders } from '../test/fixtures.jsx';
import { ResultsPanel } from './ResultsPanel.jsx';

const renderPanel = (route = '/') =>
  renderWithProviders(
    <MapProvider>
      <ResultsPanel />
    </MapProvider>,
    { route },
  );

describe('ResultsPanel', () => {
  test('лічильник і список закладів зі статусом модерації', async () => {
    mockFetch({ '/api/institutions': markersFixture });
    renderPanel('/?age=10-13');
    expect(await screen.findByText('3 заклади · 8 курсів')).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/institutions/khpi?age=10-13',
      '/institutions/kh-palace?age=10-13',
      '/institutions/5c0f6a1e-1111-4222-8333-944455556666?age=10-13',
    ]);
    expect(screen.getByText('На модерації')).toBeInTheDocument();
    expect(screen.getByText('4 з 4 курсів підходять')).toBeInTheDocument();
  });

  test('порожній результат → скидання фільтрів', async () => {
    const fetchMock = mockFetch({
      '/api/institutions': (url) =>
        url.includes('category') ? { body: { summary: { institutions: 0, courses: 0 }, items: [] } } : { body: markersFixture },
    });
    renderPanel('/?category=A');
    await userEvent.click(await screen.findByRole('button', { name: 'Скинути фільтри' }));
    await waitFor(() => expect(screen.getByText('3 заклади · 8 курсів')).toBeInTheDocument());
    expect(fetchMock.mock.calls.at(-1)[0]).toBe('/api/institutions');
  });

  test('помилка мережі → повтор', async () => {
    mockFetch({ '/api/institutions': () => ({ status: 500, body: { error: { code: 'INTERNAL', message: 'Внутрішня помилка сервера' } } }) });
    renderPanel();
    expect(await screen.findByRole('button', { name: 'Спробувати ще' })).toBeInTheDocument();
  });
});
```

Run: `npm run test:web -- src/filters src/panels` → FAIL.

- [ ] **Step 2: `FiltersForm`**

`web/src/filters/FiltersForm.jsx`:
```jsx
import { useMeta } from '../state/MetaProvider.jsx';
import { toggleValue } from '../state/filters.js';
import { Chip } from '../ui/Chip.jsx';
import styles from './FiltersForm.module.css';

function FilterGroup({ title, children }) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{title}</legend>
      <div className={styles.chips}>{children}</div>
    </fieldset>
  );
}

export function FiltersForm({ filters, onChange }) {
  const { categories, ageGroups, priceOptions, formats, institutionTypes, directionBySlug } = useMeta();
  const toggle = (key, value) => onChange({ [key]: toggleValue(filters[key], value) });
  const single = (key, value) => onChange({ [key]: filters[key] === value ? '' : value });

  return (
    <div className={styles.form}>
      {filters.direction.length > 0 && (
        <FilterGroup title="Напрямки">
          {filters.direction.map((slug) => (
            <Chip key={slug} pressed removable onToggle={() => toggle('direction', slug)}>
              {directionBySlug[slug]?.name ?? slug}
            </Chip>
          ))}
        </FilterGroup>
      )}
      <FilterGroup title="Напрям STEAM">
        {categories.map((c) => (
          <Chip key={c.code} color={c.color} pressed={filters.category.includes(c.code)} onToggle={() => toggle('category', c.code)}>
            {c.name}
          </Chip>
        ))}
      </FilterGroup>
      <FilterGroup title="Вік">
        {ageGroups.map((g) => (
          <Chip key={g.id} pressed={filters.age === g.id} onToggle={() => single('age', g.id)}>
            {g.name}
          </Chip>
        ))}
      </FilterGroup>
      <FilterGroup title="Вартість">
        {priceOptions.map((p) => (
          <Chip key={p.id} pressed={filters.price === p.id} onToggle={() => single('price', p.id)}>
            {p.name}
          </Chip>
        ))}
      </FilterGroup>
      <FilterGroup title="Формат">
        {formats.map((f) => (
          <Chip key={f.id} pressed={filters.format.includes(f.id)} onToggle={() => toggle('format', f.id)}>
            {f.name}
          </Chip>
        ))}
      </FilterGroup>
      <FilterGroup title="Тип закладу">
        {institutionTypes.map((t) => (
          <Chip key={t.id} pressed={filters.type.includes(t.id)} onToggle={() => toggle('type', t.id)}>
            {t.name}
          </Chip>
        ))}
      </FilterGroup>
    </div>
  );
}
```

`web/src/filters/FiltersForm.module.css`:
```css
.form {
  display: grid;
  gap: var(--space-4);
}

.group {
  margin: 0;
  padding: 0;
  border: 0;
}

.legend {
  margin-bottom: var(--space-2);
  padding: 0;
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
```

- [ ] **Step 3: Desktop-розкривачка і mobile-діалог**

`web/src/filters/FiltersPanel.jsx`:
```jsx
import { SlidersHorizontal } from 'lucide-react';
import { useId, useState } from 'react';
import { countActive } from '../state/filters.js';
import { useFilters } from '../state/useFilters.js';
import { Button } from '../ui/Button.jsx';
import { FiltersForm } from './FiltersForm.jsx';
import styles from './FiltersPanel.module.css';

export function FiltersPanel() {
  const { filters, setFilters, resetFilters } = useFilters();
  const [open, setOpen] = useState(false);
  const regionId = useId();
  const count = countActive(filters) - (filters.q ? 1 : 0);

  return (
    <div className={styles.filters}>
      <div className={styles.bar}>
        <Button
          variant="secondary"
          size="sm"
          icon={SlidersHorizontal}
          aria-expanded={open}
          aria-controls={regionId}
          onClick={() => setOpen((v) => !v)}
        >
          {count > 0 ? `Фільтри · ${count}` : 'Фільтри'}
        </Button>
        {count > 0 && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Скинути
          </Button>
        )}
      </div>
      {open && (
        <div id={regionId} className={styles.region}>
          <FiltersForm filters={filters} onChange={setFilters} />
        </div>
      )}
    </div>
  );
}
```

`web/src/filters/FiltersPanel.module.css`:
```css
.filters {
  display: grid;
  gap: var(--space-3);
}

.bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.region {
  max-height: 44dvh;
  overflow-y: auto;
  padding-top: var(--space-2);
}
```

`web/src/filters/FiltersDialogButton.jsx`:
```jsx
import { SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { FORMS, pluralize } from '../lib/format.js';
import { useMapState } from '../state/MapProvider.jsx';
import { countActive } from '../state/filters.js';
import { useFilters } from '../state/useFilters.js';
import { Button } from '../ui/Button.jsx';
import { Dialog } from '../ui/Dialog.jsx';
import { IconButton } from '../ui/IconButton.jsx';
import styles from './FiltersDialogButton.module.css';
import { FiltersForm } from './FiltersForm.jsx';

export function FiltersDialogButton() {
  const { filters, setFilters, resetFilters } = useFilters();
  const { markers } = useMapState();
  const [open, setOpen] = useState(false);
  const count = countActive(filters) - (filters.q ? 1 : 0);
  const summary = markers.data?.summary;

  return (
    <>
      <span className={styles.wrapper}>
        <IconButton
          label={count > 0 ? `Фільтри, активних: ${count}` : 'Фільтри'}
          icon={SlidersHorizontal}
          onClick={() => setOpen(true)}
        />
        {count > 0 && (
          <span className={styles.count} aria-hidden="true">
            {count}
          </span>
        )}
      </span>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Фільтри"
        footer={
          <>
            {count > 0 && (
              <Button variant="ghost" onClick={resetFilters}>
                Скинути
              </Button>
            )}
            <Button onClick={() => setOpen(false)}>
              {summary ? `Показати ${pluralize(summary.institutions, FORMS.institution)}` : 'Показати'}
            </Button>
          </>
        }
      >
        <FiltersForm filters={filters} onChange={setFilters} />
      </Dialog>
    </>
  );
}
```

`web/src/filters/FiltersDialogButton.module.css`:
```css
.wrapper {
  position: relative;
  display: inline-flex;
}

.count {
  position: absolute;
  top: -6px;
  right: -6px;
  display: grid;
  place-items: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
}
```

- [ ] **Step 4: `ResultsPanel`**

`web/src/panels/ResultsPanel.jsx`:
```jsx
import { Link } from 'react-router';
import { FORMS, formatDistance, pluralize } from '../lib/format.js';
import { SteamRing } from '../map/SteamRing.jsx';
import { hasCourseFilters } from '../state/filters.js';
import { useMapState, useSelectedInstitution } from '../state/MapProvider.jsx';
import { useMeta } from '../state/MetaProvider.jsx';
import { useFilters, useLinkTo } from '../state/useFilters.js';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { ErrorState } from '../ui/ErrorState.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import shared from './Panels.module.css';
import styles from './ResultsPanel.module.css';

export function ResultsPanel() {
  const { markers, highlightedIds } = useMapState();
  const { labels, dataNotice } = useMeta();
  const { filters, resetFilters } = useFilters();
  const linkTo = useLinkTo();
  useSelectedInstitution(null);

  if (markers.error && !markers.data) return <ErrorState error={markers.error} onRetry={markers.reload} />;
  if (!markers.data) return <Skeleton lines={4} slow={markers.slow} />;

  const { summary, items } = markers.data;
  const courseFilters = hasCourseFilters(filters);

  return (
    <section className={shared.section} aria-labelledby="results-title">
      <h2 id="results-title" className="visually-hidden">
        Результати пошуку
      </h2>
      <p className={styles.summary} aria-live="polite">
        {pluralize(summary.institutions, FORMS.institution)} · {pluralize(summary.courses, FORMS.course)}
      </p>

      {items.length === 0 ? (
        <EmptyState
          title="Нічого не знайдено"
          text="Спробуйте змінити або скинути фільтри."
          action={<Button onClick={resetFilters}>Скинути фільтри</Button>}
        />
      ) : (
        <ul className={shared.list}>
          {items.map((item) => (
            <li key={item.id}>
              <Link to={linkTo(`/institutions/${item.id}`)} className={styles.item}>
                <SteamRing profile={item.steamProfile} size={44} dashed={item.status === 'pending'} />
                <span className={styles.body}>
                  <span className={styles.name}>{item.shortName}</span>
                  <span className={styles.meta}>
                    {labels.type[item.type]}
                    {item.distanceKm != null && ` · ${formatDistance(item.distanceKm)}`}
                  </span>
                  <span className={styles.meta}>
                    {courseFilters
                      ? `${item.matchedCourseCount} з ${item.courseCount} курсів підходять`
                      : pluralize(item.courseCount, FORMS.course)}
                  </span>
                </span>
                <span className={styles.badges}>
                  {item.status === 'pending' && <Badge tone="warning">На модерації</Badge>}
                  {highlightedIds.includes(item.id) && <Badge tone="info">Рекомендовано</Badge>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className={shared.notice}>{dataNotice}</p>
    </section>
  );
}
```

`web/src/panels/ResultsPanel.module.css`:
```css
.summary {
  font-weight: 700;
}

.item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--space-3);
  min-height: 72px;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: inherit;
  text-decoration: none;
  transition: border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
}

.item:hover {
  border-color: #cbd5e1;
  box-shadow: var(--shadow-md);
}

.body {
  display: grid;
  min-width: 0;
}

.name {
  font-weight: 800;
}

.meta {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.badges {
  display: grid;
  justify-items: end;
  gap: var(--space-1);
}
```

У конструкції «N з M» іменник стоїть у родовому відмінку множини, тому рядок «`N з M курсів підходять`» не використовує `pluralize` (для «1 з 1» це теж прийнятно).

- [ ] **Step 5: Шапки, TopBar, маршрут**

`web/src/layout/DesktopHeader.jsx`:
```jsx
import { FiltersPanel } from '../filters/FiltersPanel.jsx';
import { Brand } from './Brand.jsx';

export function DesktopHeader() {
  return (
    <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
      <Brand />
      <FiltersPanel />
    </div>
  );
}
```

`web/src/layout/TopBar.jsx`:
```jsx
import { FiltersDialogButton } from '../filters/FiltersDialogButton.jsx';
import styles from './TopBar.module.css';

export function TopBar() {
  return (
    <div className={styles.topBar}>
      <div className={styles.search} />
      <FiltersDialogButton />
    </div>
  );
}
```

`web/src/layout/TopBar.module.css`:
```css
.topBar {
  position: absolute;
  z-index: 1000;
  top: calc(var(--space-3) + env(safe-area-inset-top));
  right: var(--space-3);
  left: var(--space-3);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.search {
  flex: 1;
  min-width: 0;
}
```

`web/src/layout/MapLayout.jsx` — замінити `MapScreen`:
```jsx
function MapScreen() {
  const { pickMode } = useMapState();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  return (
    <div className={styles.layout} data-picking={pickMode || undefined}>
      <div className={styles.map}>
        <MapView />
      </div>
      {!isDesktop && <TopBar />}
      <div className={styles.mapControls}>
        <LocationButton compact={!isDesktop} />
      </div>
      <Panel header={isDesktop ? <DesktopHeader /> : null}>
        <Outlet />
      </Panel>
    </div>
  );
}
```
(імпортувати `TopBar` і `DesktopHeader`, прибрати імпорт `Brand`).

`web/src/App.jsx` — у маршрутах замінити `IntroPanel` на `ResultsPanel`:
```jsx
<Route index element={<ResultsPanel />} />
```
Видалити `web/src/panels/IntroPanel.jsx`. У `App.spec.jsx` перший тест: додати `'/api/institutions': markersFixture` у `mockFetch` і замість «STEAM-освіта Харкова» чекати `await screen.findByText('3 заклади · 8 курсів')` (у jsdom mobile-режим, бренд у шапці не рендериться). Leaflet у jsdom: якщо `MapView` падає при рендері, у `App.spec.jsx` замокати модуль:
```jsx
vi.mock('./map/MapView.jsx', () => ({ MapView: () => null }));
```

- [ ] **Step 6: Перевірка**

Run: `npm run test:web` → PASS.
Браузер: `/` показує «4 заклади · 13 курсів» і список; фільтр «Мистецтво» на desktop (розкривачка) і на mobile (діалог «Показати 2 заклади») оновлює мітки й URL; у мітках з’являються числа збігів; «Скинути» повертає все.

---

### Task 10: Пошук з підказками

**Files:**
- Create: `web/src/search/suggestions.js`, `web/src/search/SearchBox.jsx` (+ css)
- Modify: `web/src/layout/TopBar.jsx`, `web/src/layout/DesktopHeader.jsx`
- Test: `web/src/search/suggestions.spec.js`, `web/src/search/SearchBox.spec.jsx`

**Interfaces:**
- Consumes: `useApi`, `useDebouncedValue`, `useFilters`, `applyFiltersToSearch`, `filtersToSearchString`, `useMeta` (`colorByCode`).
- Produces:
  - `GROUP_LABELS = { direction: 'Напрямки', institution: 'Заклади', course: 'Курси' }`
  - `flattenSuggestions(data) → [{ kind, id, label, sublabel?, categoryCode? }]`
  - `suggestionTarget(option, filters) → { pathname, filters }`
  - `SearchBox()`

- [ ] **Step 1: Тести, що падають**

`web/src/search/suggestions.spec.js`:
```js
import { describe, expect, test } from 'vitest';
import { EMPTY_FILTERS } from '../state/filters.js';
import { flattenSuggestions, suggestionTarget } from './suggestions.js';

const data = {
  directions: [{ slug: 'robotics', name: 'Робототехніка', categoryCode: 'T' }],
  institutions: [{ id: 'khpi', shortName: 'НТУ «ХПІ»', type: 'university' }],
  courses: [{ id: 'khpi-robotics-arduino', title: 'Робототехніка на Arduino', institutionId: 'khpi', institutionShortName: 'НТУ «ХПІ»', directionSlug: 'robotics' }],
};

describe('suggestions', () => {
  test('плаский список у порядку груп', () => {
    expect(flattenSuggestions(data)).toEqual([
      { kind: 'direction', id: 'robotics', label: 'Робототехніка', categoryCode: 'T' },
      { kind: 'institution', id: 'khpi', label: 'НТУ «ХПІ»' },
      { kind: 'course', id: 'khpi-robotics-arduino', label: 'Робототехніка на Arduino', sublabel: 'НТУ «ХПІ»' },
    ]);
    expect(flattenSuggestions(null)).toEqual([]);
  });

  test('напрямок → фільтр на головній, текст пошуку очищується', () => {
    const filters = { ...EMPTY_FILTERS, q: 'роб', age: '10-13', direction: ['astronomy'] };
    expect(suggestionTarget({ kind: 'direction', id: 'robotics' }, filters)).toEqual({
      pathname: '/',
      filters: { ...filters, q: '', direction: ['astronomy', 'robotics'] },
    });
  });

  test('заклад і курс → відповідна сторінка без зміни фільтрів', () => {
    expect(suggestionTarget({ kind: 'institution', id: 'khpi' }, EMPTY_FILTERS)).toEqual({ pathname: '/institutions/khpi', filters: EMPTY_FILTERS });
    expect(suggestionTarget({ kind: 'course', id: 'c1' }, EMPTY_FILTERS).pathname).toBe('/courses/c1');
  });
});
```

`web/src/search/SearchBox.spec.jsx`:
```jsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router';
import { describe, expect, test } from 'vitest';
import { mockFetch, renderWithProviders } from '../test/fixtures.jsx';
import { SearchBox } from './SearchBox.jsx';

const suggest = {
  directions: [{ slug: 'robotics', name: 'Робототехніка', categoryCode: 'T' }],
  institutions: [],
  courses: [{ id: 'khpi-robotics-arduino', title: 'Робототехніка на Arduino', institutionId: 'khpi', institutionShortName: 'НТУ «ХПІ»', directionSlug: 'robotics' }],
};

function Harness() {
  const { pathname, search } = useLocation();
  return (
    <>
      <SearchBox />
      <p data-testid="location">{decodeURIComponent(pathname + search)}</p>
    </>
  );
}

describe('SearchBox', () => {
  test('підказки з’являються після введення й обираються клавіатурою', async () => {
    mockFetch({ '/api/search/suggest': suggest });
    renderWithProviders(<Harness />, { route: '/?age=10-13' });
    const input = screen.getByRole('combobox', { name: 'Пошук' });
    await userEvent.type(input, 'роб');
    expect(await screen.findByRole('option', { name: /Робототехніка на Arduino/ })).toBeInTheDocument();
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(screen.getByTestId('location')).toHaveTextContent('/?direction=robotics&age=10-13');
    expect(input).toHaveValue('');
  });

  test('Enter без вибору шукає за текстом', async () => {
    mockFetch({ '/api/search/suggest': suggest });
    renderWithProviders(<Harness />, { route: '/institutions/khpi' });
    await userEvent.type(screen.getByRole('combobox', { name: 'Пошук' }), 'arduino{Enter}');
    expect(screen.getByTestId('location')).toHaveTextContent('/?q=arduino');
  });

  test('клік по курсу відкриває курс зі збереженням фільтрів', async () => {
    mockFetch({ '/api/search/suggest': suggest });
    renderWithProviders(<Harness />, { route: '/?age=10-13' });
    await userEvent.type(screen.getByRole('combobox', { name: 'Пошук' }), 'роб');
    await userEvent.click(await screen.findByRole('option', { name: /Робототехніка на Arduino/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/courses/khpi-robotics-arduino?age=10-13');
  });

  test('Escape закриває список', async () => {
    mockFetch({ '/api/search/suggest': suggest });
    renderWithProviders(<Harness />);
    await userEvent.type(screen.getByRole('combobox', { name: 'Пошук' }), 'роб');
    await screen.findByRole('listbox');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
```

Run: `npm run test:web -- src/search` → FAIL.

- [ ] **Step 2: `web/src/search/suggestions.js`**

```js
export const GROUP_LABELS = { direction: 'Напрямки', institution: 'Заклади', course: 'Курси' };

export function flattenSuggestions(data) {
  if (!data) return [];
  return [
    ...data.directions.map((d) => ({ kind: 'direction', id: d.slug, label: d.name, categoryCode: d.categoryCode })),
    ...data.institutions.map((i) => ({ kind: 'institution', id: i.id, label: i.shortName })),
    ...data.courses.map((c) => ({ kind: 'course', id: c.id, label: c.title, sublabel: c.institutionShortName })),
  ];
}

export function suggestionTarget(option, filters) {
  if (option.kind === 'direction') {
    const direction = filters.direction.includes(option.id) ? filters.direction : [...filters.direction, option.id];
    return { pathname: '/', filters: { ...filters, q: '', direction } };
  }
  const pathname = option.kind === 'institution' ? `/institutions/${option.id}` : `/courses/${option.id}`;
  return { pathname, filters };
}
```

- [ ] **Step 3: `SearchBox`**

`web/src/search/SearchBox.jsx`:
```jsx
import { Search, X } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApi } from '../api/useApi.js';
import { useDebouncedValue } from '../lib/useDebouncedValue.js';
import { useMeta } from '../state/MetaProvider.jsx';
import { filtersToSearchString } from '../state/filters.js';
import { useFilters } from '../state/useFilters.js';
import styles from './SearchBox.module.css';
import { flattenSuggestions, GROUP_LABELS, suggestionTarget } from './suggestions.js';

export function SearchBox() {
  const { filters } = useFilters();
  const { colorByCode } = useMeta();
  const navigate = useNavigate();
  const inputId = useId();
  const listId = useId();
  const [text, setText] = useState(filters.q);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  useEffect(() => setText(filters.q), [filters.q]);

  const query = useDebouncedValue(text.trim(), 200);
  const { data } = useApi('/api/search/suggest', { query: { q: query }, enabled: open && query.length >= 2 });
  const options = useMemo(() => (open && query.length >= 2 ? flattenSuggestions(data) : []), [data, open, query]);
  const expanded = options.length > 0;

  const go = (pathname, nextFilters) => {
    setOpen(false);
    setActive(-1);
    navigate({ pathname, search: filtersToSearchString(nextFilters) });
  };

  const choose = (option) => {
    const target = suggestionTarget(option, filters);
    if (option.kind === 'direction') setText('');
    go(target.pathname, target.filters);
  };

  const onSubmit = (event) => {
    event.preventDefault();
    if (active >= 0 && options[active]) return choose(options[active]);
    go('/', { ...filters, q: text.trim() });
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown' && expanded) {
      event.preventDefault();
      setActive((i) => (i + 1) % options.length);
    } else if (event.key === 'ArrowUp' && expanded) {
      event.preventDefault();
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (event.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  };

  const clear = () => {
    setText('');
    if (filters.q) go('/', { ...filters, q: '' });
  };

  return (
    <form role="search" className={styles.search} onSubmit={onSubmit}>
      <label htmlFor={inputId} className="visually-hidden">
        Пошук
      </label>
      <Search aria-hidden="true" size={18} className={styles.icon} />
      <input
        id={inputId}
        type="search"
        role="combobox"
        autoComplete="off"
        enterKeyHint="search"
        placeholder="Робототехніка, 3D, заклад…"
        className={styles.input}
        value={text}
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(event) => {
          setText(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
      />
      {text && (
        <button type="button" className={styles.clear} aria-label="Очистити пошук" onClick={clear}>
          <X aria-hidden="true" size={16} />
        </button>
      )}
      {expanded && (
        <ul id={listId} role="listbox" className={styles.listbox}>
          {options.map((option, index) => {
            const groupStart = index === 0 || options[index - 1].kind !== option.kind;
            return [
              groupStart && (
                <li key={`group-${option.kind}`} role="presentation" className={styles.group}>
                  {GROUP_LABELS[option.kind]}
                </li>
              ),
              <li
                key={`${option.kind}-${option.id}`}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                className={styles.option}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
              >
                {option.categoryCode && (
                  <span className={styles.dot} style={{ background: colorByCode[option.categoryCode] }} aria-hidden="true" />
                )}
                <span className={styles.optionText}>
                  <span>{option.label}</span>
                  {option.sublabel && <span className={styles.sublabel}>{option.sublabel}</span>}
                </span>
              </li>,
            ];
          })}
        </ul>
      )}
    </form>
  );
}
```

`web/src/search/SearchBox.module.css`:
```css
.search {
  position: relative;
  flex: 1;
}

.icon {
  position: absolute;
  top: 50%;
  left: 14px;
  color: var(--color-text-muted);
  transform: translateY(-50%);
  pointer-events: none;
}

.input {
  width: 100%;
  min-height: var(--touch-target);
  padding: 0 44px 0 42px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
  font-size: var(--text-md);
}

.input::-webkit-search-cancel-button {
  display: none;
}

.clear {
  position: absolute;
  top: 50%;
  right: 4px;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transform: translateY(-50%);
}

.listbox {
  position: absolute;
  z-index: 1100;
  top: calc(100% + 6px);
  right: 0;
  left: 0;
  max-height: 60dvh;
  margin: 0;
  padding: var(--space-2);
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-lg);
  list-style: none;
}

.group {
  padding: var(--space-2) var(--space-3) var(--space-1);
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
}

.option {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--touch-target);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.option:hover,
.option[aria-selected='true'] {
  background: var(--color-primary-soft);
}

.dot {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
}

.optionText {
  display: grid;
}

.sublabel {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
}
```

- [ ] **Step 4: Вбудувати пошук у шапки**

`web/src/layout/TopBar.jsx`:
```jsx
import { FiltersDialogButton } from '../filters/FiltersDialogButton.jsx';
import { SearchBox } from '../search/SearchBox.jsx';
import styles from './TopBar.module.css';

export function TopBar() {
  return (
    <div className={styles.topBar}>
      <SearchBox />
      <FiltersDialogButton />
    </div>
  );
}
```
(із `TopBar.module.css` видалити клас `.search`).

`web/src/layout/DesktopHeader.jsx`:
```jsx
import { FiltersPanel } from '../filters/FiltersPanel.jsx';
import { SearchBox } from '../search/SearchBox.jsx';
import { Brand } from './Brand.jsx';

export function DesktopHeader() {
  return (
    <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
      <Brand />
      <SearchBox />
      <FiltersPanel />
    </div>
  );
}
```

- [ ] **Step 5: Кінець фази**

Run: `npm test && npm run test:web && npm run build` → усе зелене.
Браузер (1440 і 375): «роб» → групи «Напрямки / Курси»; вибір «Робототехніка» лишає на карті ХПІ та Палац; «Поруч зі мною» сортує список за відстанню; консоль чиста.
Зупинитися: **«Фаза F2 готова, перевірте карту, фільтри та пошук»**.

---

# Фаза F3 — заклад → напрямок → курс → реєстрація

### Task 11: Картка закладу

**Files:**
- Create: `web/src/panels/InstitutionPanel.jsx` (+ `InstitutionPanel.module.css`)
- Modify: `web/src/lib/format.js`, `web/src/lib/format.spec.js`, `web/src/test/fixtures.jsx`, `web/src/App.jsx`
- Test: `web/src/panels/InstitutionPanel.spec.jsx`

**Interfaces:**
- Consumes: `useApi`, `useMapState` (`filters`, `catalogVersion`), `useSelectedInstitution`, `toApiQuery`, `hasCourseFilters`, `useLinkTo`, `useMeta` (`labels`, `categoryByCode`), `SteamRing`, `SteamLegend`, `BackLink`, `Badge`, `ErrorState`, `Skeleton`, `NotFoundPanel`, `pluralize`, `FORMS`.
- Produces:
  - `displayHost(url) → 'kpi.kharkov.ua'`
  - `InstitutionPanel()` — маршрут `/institutions/:id`
  - Фікстура `institutionCardFixture`

- [ ] **Step 1: Фікстура та тести, що падають**

Додати в `web/src/test/fixtures.jsx`:
```jsx
export const institutionCardFixture = {
  institution: {
    id: 'khpi',
    name: 'Національний технічний університет «Харківський політехнічний інститут»',
    shortName: 'НТУ «ХПІ»',
    type: 'university',
    shortDescription: 'Провідний технічний університет Харкова: інженерія, енергетика, комп’ютерні науки та робототехніка.',
    description: 'Один із найстаріших технічних університетів України, заснований у 1885 році.',
    logoUrl: null,
    address: 'вул. Кирпичова, 2, Харків, 61002',
    city: 'kharkiv',
    lat: 49.9989798,
    lng: 36.2483061,
    website: 'https://www.kpi.kharkov.ua',
    phone: null,
    email: null,
    hasShelter: null,
    declaredDirectionIds: [],
    status: 'approved',
    source: 'seed',
    createdAt: '2026-09-17T00:00:00.000Z',
    courseCount: 4,
    steamProfile: { S: 0, T: 2, E: 2, A: 0, M: 0 },
  },
  directions: [
    { slug: 'programming', name: 'Програмування', categoryCode: 'T', courseCount: 1, matchedCourseCount: 1 },
    { slug: 'robotics', name: 'Робототехніка', categoryCode: 'T', courseCount: 1, matchedCourseCount: 0 },
    { slug: '3d-modeling', name: '3D-моделювання та друк', categoryCode: 'E', courseCount: 1, matchedCourseCount: 0 },
    { slug: 'electronics', name: 'Електроніка', categoryCode: 'E', courseCount: 1, matchedCourseCount: 1 },
  ],
};
```

Додати в `web/src/lib/format.spec.js`:
```js
import { displayHost } from './format.js';

describe('displayHost', () => {
  test('домен без www і протоколу', () => {
    expect(displayHost('https://www.kpi.kharkov.ua')).toBe('kpi.kharkov.ua');
    expect(displayHost('https://itstep.kh.ua/contacts')).toBe('itstep.kh.ua');
    expect(displayHost('not a url')).toBe('not a url');
  });
});
```

`web/src/panels/InstitutionPanel.spec.jsx`:
```jsx
import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { MapProvider } from '../state/MapProvider.jsx';
import { institutionCardFixture, markersFixture, mockFetch, renderWithProviders } from '../test/fixtures.jsx';
import { InstitutionPanel } from './InstitutionPanel.jsx';

const renderCard = (route) =>
  renderWithProviders(
    <MapProvider>
      <InstitutionPanel />
    </MapProvider>,
    { route, path: '/institutions/:id' },
  );

describe('InstitutionPanel', () => {
  test('картка з контактами, профілем і напрямками зі збереженням фільтрів', async () => {
    const fetchMock = mockFetch({ '/api/institutions/khpi': institutionCardFixture, '/api/institutions': markersFixture });
    renderCard('/institutions/khpi?price=free');

    expect(await screen.findByRole('heading', { level: 2, name: /Харківський політехнічний інститут/ })).toBeInTheDocument();
    expect(screen.getByText('Університет')).toBeInTheDocument();
    expect(screen.getByText('Технології · 2')).toBeInTheDocument();

    const site = screen.getByRole('link', { name: 'kpi.kharkov.ua' });
    expect(site).toHaveAttribute('href', 'https://www.kpi.kharkov.ua');
    expect(site).toHaveAttribute('target', '_blank');
    expect(screen.queryByRole('link', { name: /^tel:/ })).not.toBeInTheDocument();

    const robotics = screen.getByRole('link', { name: /Робототехніка/ });
    expect(robotics).toHaveAttribute('href', '/institutions/khpi/robotics?price=free');
    expect(robotics).toHaveTextContent('0 з 1 курсів підходять');
    expect(screen.getByRole('link', { name: 'До результатів' })).toHaveAttribute('href', '/?price=free');

    const urls = fetchMock.mock.calls.map(([u]) => String(u));
    expect(urls).toContain('/api/institutions/khpi?price=free');
  });

  test('заклад на модерації з заявленим напрямком без курсів', async () => {
    const pending = {
      institution: {
        ...institutionCardFixture.institution,
        id: 'p1',
        name: 'Школа робототехніки «Кібер»',
        shortName: 'Школа робототехніки «Кібер»',
        type: 'private_school',
        status: 'pending',
        website: null,
        phone: '+380501112233',
        courseCount: 0,
        steamProfile: { S: 0, T: 1, E: 0, A: 0, M: 0 },
      },
      directions: [{ slug: 'robotics', name: 'Робототехніка', categoryCode: 'T', courseCount: 0, matchedCourseCount: 0 }],
    };
    mockFetch({ '/api/institutions/p1': pending, '/api/institutions': markersFixture });
    renderCard('/institutions/p1');

    expect(await screen.findByText('На модерації')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+380501112233' })).toHaveAttribute('href', 'tel:+380501112233');
    expect(screen.getByText(/Курси ще не додані/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Робототехніка/ })).not.toBeInTheDocument();
  });

  test('404 → «Заклад не знайдено»', async () => {
    mockFetch({
      '/api/institutions/missing': () => ({ status: 404, body: { error: { code: 'NOT_FOUND', message: 'Заклад не знайдено' } } }),
      '/api/institutions': markersFixture,
    });
    renderCard('/institutions/missing');
    expect(await screen.findByRole('heading', { name: 'Заклад не знайдено' })).toBeInTheDocument();
  });
});
```

Run: `npm run test:web -- src/panels/InstitutionPanel.spec.jsx src/lib` → FAIL.

- [ ] **Step 2: `displayHost`**

Додати в `web/src/lib/format.js`:
```js
export function displayHost(url) {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}
```

- [ ] **Step 3: `InstitutionPanel`**

`web/src/panels/InstitutionPanel.jsx`:
```jsx
import { ChevronRight, Globe, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { useApi } from '../api/useApi.js';
import { BackLink } from '../layout/BackLink.jsx';
import { displayHost, FORMS, pluralize } from '../lib/format.js';
import { SteamLegend, SteamRing } from '../map/SteamRing.jsx';
import { hasCourseFilters, toApiQuery } from '../state/filters.js';
import { useMapState, useSelectedInstitution } from '../state/MapProvider.jsx';
import { useMeta } from '../state/MetaProvider.jsx';
import { useLinkTo } from '../state/useFilters.js';
import { Badge } from '../ui/Badge.jsx';
import { ErrorState } from '../ui/ErrorState.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import styles from './InstitutionPanel.module.css';
import { NotFoundPanel } from './NotFoundPanel.jsx';
import shared from './Panels.module.css';

function directionStatus(direction, courseFilters) {
  if (direction.courseCount === 0) return 'Курси ще не додані';
  if (courseFilters) return `${direction.matchedCourseCount} з ${direction.courseCount} курсів підходять`;
  return pluralize(direction.courseCount, FORMS.course);
}

export function InstitutionPanel() {
  const { id } = useParams();
  const meta = useMeta();
  const { filters, catalogVersion } = useMapState();
  const linkTo = useLinkTo();
  useSelectedInstitution(id);

  const { data, error, slow, reload } = useApi(`/api/institutions/${encodeURIComponent(id)}`, {
    query: toApiQuery(filters, meta, null),
    refreshKey: catalogVersion,
  });

  if (error?.code === 'NOT_FOUND') {
    return <NotFoundPanel title="Заклад не знайдено" text="Можливо, його ще не схвалили або посилання застаріло." />;
  }
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <Skeleton lines={3} slow={slow} />;

  const { institution, directions } = data;
  const courseFilters = hasCourseFilters(filters);
  const pending = institution.status === 'pending';

  return (
    <article className={shared.section} aria-labelledby="institution-title">
      <BackLink to={linkTo('/')}>До результатів</BackLink>

      <header className={styles.header}>
        <SteamRing profile={institution.steamProfile} size={64} stroke={9} dashed={pending} />
        <div className={shared.stack}>
          <p className={shared.eyebrow}>{meta.labels.type[institution.type]}</p>
          <h2 id="institution-title" className={shared.title}>
            {institution.name}
          </h2>
        </div>
      </header>

      {pending && (
        <p className={styles.pending}>
          <Badge tone="warning">На модерації</Badge>
          <span>Інформацію про заклад ще перевіряє модератор.</span>
        </p>
      )}

      <SteamLegend profile={institution.steamProfile} />
      {institution.shortDescription && <p>{institution.shortDescription}</p>}

      <ul className={styles.contacts}>
        <li>
          <MapPin aria-hidden="true" size={18} />
          <span>{institution.address}</span>
        </li>
        {institution.website && (
          <li>
            <Globe aria-hidden="true" size={18} />
            <a href={institution.website} target="_blank" rel="noopener noreferrer">
              {displayHost(institution.website)}
            </a>
          </li>
        )}
        {institution.phone && (
          <li>
            <Phone aria-hidden="true" size={18} />
            <a href={`tel:${institution.phone}`}>{institution.phone}</a>
          </li>
        )}
        {institution.email && (
          <li>
            <Mail aria-hidden="true" size={18} />
            <a href={`mailto:${institution.email}`}>{institution.email}</a>
          </li>
        )}
        {institution.hasShelter === true && (
          <li>
            <ShieldCheck aria-hidden="true" size={18} />
            <span>Є укриття</span>
          </li>
        )}
      </ul>

      {institution.description && <p className={shared.muted}>{institution.description}</p>}

      <section className={shared.stack} aria-labelledby="directions-title">
        <h3 id="directions-title">Напрямки</h3>
        {directions.length === 0 ? (
          <p className={shared.muted}>Заклад ще не вказав напрямки.</p>
        ) : (
          <ul className={shared.list}>
            {directions.map((direction) => {
              const category = meta.categoryByCode[direction.categoryCode];
              const hasCourses = direction.courseCount > 0;
              const muted = !hasCourses || (courseFilters && direction.matchedCourseCount === 0);
              const content = (
                <>
                  <span className={styles.bar} style={{ background: category?.color }} aria-hidden="true" />
                  <span className={styles.directionBody}>
                    <span className={styles.directionName}>{direction.name}</span>
                    <span className={styles.directionMeta}>
                      {category?.name} · {directionStatus(direction, courseFilters)}
                    </span>
                  </span>
                  {hasCourses && <ChevronRight aria-hidden="true" size={20} />}
                </>
              );
              return (
                <li key={direction.slug}>
                  {hasCourses ? (
                    <Link
                      to={linkTo(`/institutions/${institution.id}/${direction.slug}`)}
                      className={`${styles.direction} ${muted ? styles.muted : ''}`}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className={`${styles.direction} ${styles.muted}`}>{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </article>
  );
}
```

`web/src/panels/InstitutionPanel.module.css`:
```css
.header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.pending {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-warning-soft);
  color: var(--color-warning);
  font-size: var(--text-sm);
  font-weight: 600;
}

.contacts {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--text-sm);
}

.contacts li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 32px;
}

.contacts svg {
  flex: none;
  color: var(--color-text-muted);
}

.direction {
  display: grid;
  grid-template-columns: 6px 1fr auto;
  align-items: center;
  gap: var(--space-3);
  min-height: 64px;
  padding: var(--space-3) var(--space-3) var(--space-3) 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: inherit;
  text-decoration: none;
}

a.direction:hover {
  border-color: #cbd5e1;
  box-shadow: var(--shadow-md);
}

.bar {
  align-self: stretch;
  margin: calc(-1 * var(--space-3)) 0;
}

.directionBody {
  display: grid;
}

.directionName {
  font-weight: 800;
}

.directionMeta {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.muted {
  opacity: 0.6;
}
```

- [ ] **Step 4: Маршрут**

`web/src/App.jsx` — додати всередину `<Route element={<MapLayout />}>` перед `path="*"`:
```jsx
<Route path="institutions/:id" element={<InstitutionPanel />} />
```

- [ ] **Step 5: Перевірка**

Run: `npm run test:web` → PASS.
Браузер: клік по мітці ХПІ → карта підлітає до мітки (на mobile — над шторкою), картка з 4 напрямками; «До результатів» повертає список з тими самими фільтрами.

---

### Task 12: Курси напрямку

**Files:**
- Create: `web/src/panels/CourseCard.jsx` (+ css), `web/src/panels/DirectionCoursesPanel.jsx`
- Modify: `web/src/test/fixtures.jsx`, `web/src/App.jsx`
- Test: `web/src/panels/DirectionCoursesPanel.spec.jsx`

**Interfaces:**
- Consumes: `formatAge`, `formatPrice`, `formatDate`, `seatsLabel`, `useMeta().labels.format`, `Badge`, `BackLink`, `EmptyState`, `NotFoundPanel`, `useApi`, `toApiQuery`, `useMapState`, `useSelectedInstitution`, `useLinkTo`.
- Produces:
  - `CourseCard({ course, to })` — `course.matchesFilters === false` → приглушена картка з прихованим текстом «Не відповідає обраним фільтрам»
  - `DirectionCoursesPanel()` — маршрут `/institutions/:id/:slug`
  - Фікстура `directionCoursesFixture`

- [ ] **Step 1: Фікстура та тести, що падають**

Додати в `web/src/test/fixtures.jsx`:
```jsx
export const directionCoursesFixture = {
  institution: { id: 'itstep-kharkiv', name: 'Комп’ютерна Академія ITSTEP, Харків', shortName: 'ITSTEP Академія' },
  direction: { slug: 'game-dev', name: 'Розробка ігор', categoryCode: 'T' },
  items: [
    {
      id: 'itstep-unity-3d',
      title: 'Unity: створення 3D-ігор',
      shortDescription: 'Від ідеї до власної 3D-гри на рушії Unity та C#.',
      ageMin: 12,
      ageMax: 16,
      level: 'intermediate',
      format: 'online',
      price: 1900,
      priceUnit: 'month',
      durationText: '6 місяців, 2 заняття на тиждень',
      scheduleText: 'Вівторок і четвер, 17:00–18:30',
      startDate: '2026-10-06',
      seatsTotal: null,
      seatsLeft: null,
      matchesFilters: true,
    },
    {
      id: 'itstep-scratch',
      title: 'Scratch: перші ігри',
      shortDescription: 'Програмуємо ігри та анімації з візуальних блоків.',
      ageMin: 8,
      ageMax: 11,
      level: 'beginner',
      format: 'hybrid',
      price: 1600,
      priceUnit: 'month',
      durationText: '4 місяці, 1 заняття на тиждень',
      scheduleText: 'Неділя, 10:00–11:30',
      startDate: '2026-10-04',
      seatsTotal: 10,
      seatsLeft: 4,
      matchesFilters: false,
    },
  ],
};
```

`web/src/panels/DirectionCoursesPanel.spec.jsx`:
```jsx
import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { MapProvider } from '../state/MapProvider.jsx';
import { directionCoursesFixture, markersFixture, mockFetch, renderWithProviders } from '../test/fixtures.jsx';
import { DirectionCoursesPanel } from './DirectionCoursesPanel.jsx';

const renderPanel = (route) =>
  renderWithProviders(
    <MapProvider>
      <DirectionCoursesPanel />
    </MapProvider>,
    { route, path: '/institutions/:id/:slug' },
  );

describe('DirectionCoursesPanel', () => {
  test('картки курсів; невідповідні фільтрам приглушені; мало місць — бейдж', async () => {
    const fetchMock = mockFetch({
      '/api/institutions/itstep-kharkiv/directions/game-dev/courses': directionCoursesFixture,
      '/api/institutions': markersFixture,
    });
    renderPanel('/institutions/itstep-kharkiv/game-dev?format=online');

    expect(await screen.findByRole('heading', { level: 2, name: 'Розробка ігор' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ITSTEP Академія' })).toHaveAttribute('href', '/institutions/itstep-kharkiv?format=online');

    const unity = screen.getByRole('link', { name: /Unity: створення 3D-ігор/ });
    expect(unity).toHaveAttribute('href', '/courses/itstep-unity-3d?format=online');
    expect(unity).toHaveTextContent('12–16 років');
    expect(unity).toHaveTextContent(/1\s900 грн\/міс/);
    expect(unity).toHaveTextContent('Старт 6 жовтня');

    const scratch = screen.getByRole('link', { name: /Scratch: перші ігри/ });
    expect(scratch).toHaveTextContent('Не відповідає обраним фільтрам');
    expect(scratch).toHaveTextContent('Лишилось 4 місця');

    expect(fetchMock.mock.calls.map(([u]) => String(u))).toContain(
      '/api/institutions/itstep-kharkiv/directions/game-dev/courses?format=online',
    );
  });

  test('невідомий напрямок → 404', async () => {
    mockFetch({
      '/api/institutions/khpi/directions/unknown/courses': () => ({ status: 404, body: { error: { code: 'NOT_FOUND', message: 'Напрямок не знайдено' } } }),
      '/api/institutions': markersFixture,
    });
    renderPanel('/institutions/khpi/unknown');
    expect(await screen.findByRole('heading', { name: 'Напрямок не знайдено' })).toBeInTheDocument();
  });
});
```

Run: `npm run test:web -- src/panels/DirectionCoursesPanel.spec.jsx` → FAIL.

- [ ] **Step 2: `CourseCard`**

`web/src/panels/CourseCard.jsx`:
```jsx
import { Building2, CalendarDays, Monitor, MonitorSmartphone, Users, Wallet } from 'lucide-react';
import { Link } from 'react-router';
import { formatAge, formatDate, formatPrice, seatsLabel } from '../lib/format.js';
import { useMeta } from '../state/MetaProvider.jsx';
import { Badge } from '../ui/Badge.jsx';
import styles from './CourseCard.module.css';

const FORMAT_ICONS = { offline: Building2, online: Monitor, hybrid: MonitorSmartphone };

export function CourseCard({ course, to }) {
  const { labels } = useMeta();
  const FormatIcon = FORMAT_ICONS[course.format] ?? Building2;
  const lowSeats = course.seatsLeft !== null && course.seatsLeft <= 5;
  const mismatch = course.matchesFilters === false;

  return (
    <Link to={to} className={`${styles.card} ${mismatch ? styles.muted : ''}`}>
      <span className={styles.top}>
        <span className={styles.title}>{course.title}</span>
        {lowSeats && <Badge tone={course.seatsLeft === 0 ? 'danger' : 'warning'}>{seatsLabel(course.seatsLeft)}</Badge>}
      </span>
      <span className={styles.description}>{course.shortDescription}</span>
      <span className={styles.facts}>
        <span>
          <Users aria-hidden="true" size={16} />
          {formatAge(course.ageMin, course.ageMax)}
        </span>
        <span>
          <FormatIcon aria-hidden="true" size={16} />
          {labels.format[course.format]}
        </span>
        <span>
          <Wallet aria-hidden="true" size={16} />
          {formatPrice(course.price, course.priceUnit)}
        </span>
        <span>
          <CalendarDays aria-hidden="true" size={16} />
          Старт {formatDate(course.startDate)}
        </span>
      </span>
      {mismatch && <span className="visually-hidden">Не відповідає обраним фільтрам</span>}
    </Link>
  );
}
```

`web/src/panels/CourseCard.module.css`:
```css
.card {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: inherit;
  text-decoration: none;
  transition: border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out);
}

.card:hover {
  border-color: #cbd5e1;
  box-shadow: var(--shadow-md);
}

.muted {
  opacity: 0.6;
}

.top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
}

.title {
  font-weight: 800;
}

.description {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.facts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  font-weight: 600;
}

.facts > span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.facts svg {
  color: var(--color-text-muted);
}
```

- [ ] **Step 3: `DirectionCoursesPanel`**

`web/src/panels/DirectionCoursesPanel.jsx`:
```jsx
import { BookOpen } from 'lucide-react';
import { useParams } from 'react-router';
import { useApi } from '../api/useApi.js';
import { BackLink } from '../layout/BackLink.jsx';
import { toApiQuery } from '../state/filters.js';
import { useMapState, useSelectedInstitution } from '../state/MapProvider.jsx';
import { useMeta } from '../state/MetaProvider.jsx';
import { useLinkTo } from '../state/useFilters.js';
import { EmptyState } from '../ui/EmptyState.jsx';
import { ErrorState } from '../ui/ErrorState.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { CourseCard } from './CourseCard.jsx';
import { NotFoundPanel } from './NotFoundPanel.jsx';
import shared from './Panels.module.css';

export function DirectionCoursesPanel() {
  const { id, slug } = useParams();
  const meta = useMeta();
  const { filters, catalogVersion } = useMapState();
  const linkTo = useLinkTo();
  useSelectedInstitution(id);

  const { data, error, slow, reload } = useApi(
    `/api/institutions/${encodeURIComponent(id)}/directions/${encodeURIComponent(slug)}/courses`,
    { query: toApiQuery(filters, meta, null), refreshKey: catalogVersion },
  );

  if (error?.code === 'NOT_FOUND') {
    return <NotFoundPanel title={error.message === 'Заклад не знайдено' ? 'Заклад не знайдено' : 'Напрямок не знайдено'} />;
  }
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <Skeleton lines={3} slow={slow} />;

  const { institution, direction, items } = data;
  const category = meta.categoryByCode[direction.categoryCode];

  return (
    <section className={shared.section} aria-labelledby="direction-title">
      <BackLink to={linkTo(`/institutions/${institution.id}`)}>{institution.shortName}</BackLink>
      <div className={shared.stack}>
        <p className={shared.eyebrow}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: category?.color }} aria-hidden="true" />
          {category?.name}
        </p>
        <h2 id="direction-title" className={shared.title}>
          {direction.name}
        </h2>
        <p className={shared.muted}>{institution.name}</p>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={BookOpen} title="Курсів поки немає" text="Заклад ще не додав курси цього напрямку." />
      ) : (
        <ul className={shared.list}>
          {items.map((course) => (
            <li key={course.id}>
              <CourseCard course={course} to={linkTo(`/courses/${course.id}`)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```
Посилання «назад» у тесті має ім’я `ITSTEP Академія` — `BackLink` рендерить текст закладу поруч з іконкою `aria-hidden`, тож доступне ім’я збігається.

- [ ] **Step 4: Маршрут**

`web/src/App.jsx`:
```jsx
<Route path="institutions/:id/:slug" element={<DirectionCoursesPanel />} />
```

- [ ] **Step 5: Перевірка**

Run: `npm run test:web` → PASS.

---

### Task 13: Сторінка курсу та реєстрація

**Files:**
- Create: `web/src/forms/formErrors.js`, `web/src/forms/RegistrationDialog.jsx` (+ css), `web/src/panels/CourseDetailsPanel.jsx` (+ css)
- Modify: `web/src/test/fixtures.jsx`, `web/src/App.jsx`
- Test: `web/src/forms/formErrors.spec.js`, `web/src/forms/RegistrationDialog.spec.jsx`, `web/src/panels/CourseDetailsPanel.spec.jsx`

**Interfaces:**
- Consumes: `request`, `useApi`, `Dialog`, `Field`, `Checkbox`, `Button`, `formatAge`, `formatDate`, `formatPrice`, `seatsLabel`, `useMeta().labels`, `useMapState`, `useSelectedInstitution`, `useLinkTo`, `BackLink`, `NotFoundPanel`.
- Produces:
  - `mapFieldErrors(details) → { [field]: message }` (перший сегмент `path`; перше повідомлення на поле)
  - `toRegistrationPayload(values) → body для POST /api/courses/:id/registrations`
  - `RegistrationDialog({ course, institution, open, onClose, onRegistered(seatsLeft) })`
  - `CourseDetailsPanel()` — маршрут `/courses/:courseId`
  - Фікстура `courseDetailsFixture`

- [ ] **Step 1: Тести чистих функцій, що падають**

`web/src/forms/formErrors.spec.js`:
```js
import { describe, expect, test } from 'vitest';
import { mapFieldErrors, toRegistrationPayload } from './formErrors.js';

describe('mapFieldErrors', () => {
  test('поле з першого сегмента шляху; перше повідомлення перемагає', () => {
    expect(
      mapFieldErrors([
        { path: 'name', message: 'Імʼя: мінімум 2 символи' },
        { path: 'name', message: 'друге' },
        { path: 'declaredDirectionIds.0', message: 'Invalid enum value' },
        { path: '', message: 'Загальна помилка' },
      ]),
    ).toEqual({ name: 'Імʼя: мінімум 2 символи', declaredDirectionIds: 'Invalid enum value', _form: 'Загальна помилка' });
    expect(mapFieldErrors(undefined)).toEqual({});
  });
});

describe('toRegistrationPayload', () => {
  test('обрізає пробіли, пропускає порожні необовʼязкові поля, вік — число', () => {
    expect(toRegistrationPayload({ name: ' Олена ', contact: ' +380501234567 ', participantAge: '11', comment: '  ', consent: true })).toEqual({
      name: 'Олена',
      contact: '+380501234567',
      participantAge: 11,
      consent: true,
    });
    expect(toRegistrationPayload({ name: 'А', contact: '', participantAge: '', comment: 'Після 16:00', consent: false })).toEqual({
      name: 'А',
      contact: '',
      comment: 'Після 16:00',
      consent: false,
    });
  });
});
```

Run: `npm run test:web -- src/forms/formErrors.spec.js` → FAIL.

- [ ] **Step 2: `web/src/forms/formErrors.js`**

```js
// details з VALIDATION_ERROR → помилки під полями форми
export function mapFieldErrors(details) {
  const errors = {};
  for (const { path, message } of details ?? []) {
    const field = String(path ?? '').split('.')[0] || '_form';
    if (!errors[field]) errors[field] = message;
  }
  return errors;
}

export function toRegistrationPayload(values) {
  const payload = {
    name: values.name.trim(),
    contact: values.contact.trim(),
    consent: values.consent === true,
  };
  const age = String(values.participantAge ?? '').trim();
  if (age !== '') payload.participantAge = Number(age);
  const comment = (values.comment ?? '').trim();
  if (comment) payload.comment = comment;
  return payload;
}
```

Run: `npm run test:web -- src/forms/formErrors.spec.js` → PASS.

- [ ] **Step 3: Фікстура та тести компонентів, що падають**

Додати в `web/src/test/fixtures.jsx`:
```jsx
export const courseDetailsFixture = {
  course: {
    id: 'khpi-robotics-arduino',
    institutionId: 'khpi',
    directionId: 'robotics',
    title: 'Робототехніка на Arduino',
    shortDescription: 'Збираємо та програмуємо власних роботів на Arduino.',
    description: 'Датчики, сервоприводи, двигуни та основи C++ для мікроконтролерів.',
    audience: 'Школярі, які вже пробували конструювати і хочуть програмувати «залізо»',
    ageMin: 11,
    ageMax: 16,
    level: 'beginner',
    format: 'offline',
    price: 1200,
    priceUnit: 'month',
    durationText: '5 місяців, 1 заняття на тиждень',
    scheduleText: 'Субота, 12:00–14:00',
    scheduleDays: ['sat'],
    startDate: '2026-10-03',
    language: 'uk',
    seatsTotal: 12,
    seatsLeft: 3,
  },
  institution: {
    id: 'khpi',
    name: 'Національний технічний університет «Харківський політехнічний інститут»',
    shortName: 'НТУ «ХПІ»',
    type: 'university',
    address: 'вул. Кирпичова, 2, Харків, 61002',
    lat: 49.9989798,
    lng: 36.2483061,
    website: 'https://www.kpi.kharkov.ua',
    phone: null,
    email: null,
    status: 'approved',
  },
  direction: { slug: 'robotics', name: 'Робототехніка', categoryCode: 'T' },
  category: { code: 'T', name: 'Технології', color: '#2563EB' },
};
```

`web/src/forms/RegistrationDialog.spec.jsx`:
```jsx
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { courseDetailsFixture, mockFetch, renderWithProviders } from '../test/fixtures.jsx';
import { RegistrationDialog } from './RegistrationDialog.jsx';

const { course, institution } = courseDetailsFixture;
const REG_URL = '/api/courses/khpi-robotics-arduino/registrations';

const renderDialog = (onRegistered = vi.fn()) => {
  renderWithProviders(
    <RegistrationDialog course={course} institution={institution} open onClose={vi.fn()} onRegistered={onRegistered} />,
  );
  return onRegistered;
};

describe('RegistrationDialog', () => {
  test('успішна реєстрація', async () => {
    const fetchMock = mockFetch({ [REG_URL]: () => ({ status: 201, body: { id: 'r1', courseId: course.id, status: 'received', seatsLeft: 2 } }) });
    const onRegistered = renderDialog();

    await userEvent.type(screen.getByLabelText(/Ім’я/), 'Олена');
    await userEvent.type(screen.getByLabelText(/Телефон або email/), '+380501234567');
    await userEvent.type(screen.getByLabelText('Вік учасника'), '11');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Надіслати заявку' }));

    expect(await screen.findByRole('heading', { name: 'Заявку прийнято' })).toBeInTheDocument();
    expect(screen.getByText('Лишилось 2 місця')).toBeInTheDocument();
    expect(onRegistered).toHaveBeenCalledWith(2);
    const [, init] = fetchMock.mock.calls.find(([u]) => u === REG_URL);
    expect(JSON.parse(init.body)).toEqual({ name: 'Олена', contact: '+380501234567', participantAge: 11, consent: true });
  });

  test('помилки валідації під полями, фокус на першому', async () => {
    mockFetch({
      [REG_URL]: () => ({
        status: 400,
        body: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Некоректні дані форми',
            details: [
              { path: 'name', message: 'Імʼя: мінімум 2 символи' },
              { path: 'consent', message: 'Потрібна згода на обробку персональних даних' },
            ],
          },
        },
      }),
    });
    renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Надіслати заявку' }));

    expect(await screen.findByText('Імʼя: мінімум 2 символи')).toBeInTheDocument();
    expect(screen.getByText('Потрібна згода на обробку персональних даних')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(/Ім’я/)).toHaveFocus());
  });

  test('409 — місця закінчились', async () => {
    mockFetch({ [REG_URL]: () => ({ status: 409, body: { error: { code: 'NO_SEATS', message: 'Вільних місць немає' } } }) });
    const onRegistered = renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Надіслати заявку' }));
    expect(await screen.findByText('На жаль, місця на цей курс щойно закінчились.')).toBeInTheDocument();
    expect(onRegistered).toHaveBeenCalledWith(0);
  });
});
```

`web/src/panels/CourseDetailsPanel.spec.jsx`:
```jsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { MapProvider } from '../state/MapProvider.jsx';
import { courseDetailsFixture, markersFixture, mockFetch, renderWithProviders } from '../test/fixtures.jsx';
import { CourseDetailsPanel } from './CourseDetailsPanel.jsx';

const renderPanel = (route) =>
  renderWithProviders(
    <MapProvider>
      <CourseDetailsPanel />
    </MapProvider>,
    { route, path: '/courses/:courseId' },
  );

describe('CourseDetailsPanel', () => {
  test('деталі курсу та відкриття реєстрації', async () => {
    mockFetch({ '/api/courses/khpi-robotics-arduino': courseDetailsFixture, '/api/institutions': markersFixture });
    renderPanel('/courses/khpi-robotics-arduino?age=10-13');

    expect(await screen.findByRole('heading', { level: 2, name: 'Робототехніка на Arduino' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'НТУ «ХПІ»' })).toHaveAttribute('href', '/institutions/khpi?age=10-13');
    expect(screen.getByRole('link', { name: 'Робототехніка' })).toHaveAttribute('href', '/institutions/khpi/robotics?age=10-13');
    expect(screen.getByText('11–16 років')).toBeInTheDocument();
    expect(screen.getByText('Початковий')).toBeInTheDocument();
    expect(screen.getByText('Субота, 12:00–14:00')).toBeInTheDocument();
    expect(screen.getByText('Лишилось 3 місця')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Зареєструватися' }));
    expect(screen.getByRole('dialog', { name: 'Реєстрація на курс' })).toBeInTheDocument();
  });

  test('без місць кнопка недоступна', async () => {
    const full = { ...courseDetailsFixture, course: { ...courseDetailsFixture.course, seatsLeft: 0 } };
    mockFetch({ '/api/courses/khpi-robotics-arduino': full, '/api/institutions': markersFixture });
    renderPanel('/courses/khpi-robotics-arduino');
    expect(await screen.findByRole('button', { name: 'Місць немає' })).toBeDisabled();
  });

  test('404 → «Курс не знайдено»', async () => {
    mockFetch({
      '/api/courses/nope': () => ({ status: 404, body: { error: { code: 'NOT_FOUND', message: 'Курс не знайдено' } } }),
      '/api/institutions': markersFixture,
    });
    renderPanel('/courses/nope');
    expect(await screen.findByRole('heading', { name: 'Курс не знайдено' })).toBeInTheDocument();
  });
});
```

Run: `npm run test:web -- src/forms src/panels/CourseDetailsPanel.spec.jsx` → FAIL.

- [ ] **Step 4: `RegistrationDialog`**

`web/src/forms/RegistrationDialog.jsx`:
```jsx
import { CircleCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { request } from '../api/client.js';
import { seatsLabel } from '../lib/format.js';
import { Button } from '../ui/Button.jsx';
import { Checkbox } from '../ui/Checkbox.jsx';
import { Dialog } from '../ui/Dialog.jsx';
import { Field } from '../ui/Field.jsx';
import { mapFieldErrors, toRegistrationPayload } from './formErrors.js';
import styles from './RegistrationDialog.module.css';

const INITIAL_VALUES = { name: '', contact: '', participantAge: '', comment: '', consent: false };
const FORM_ID = 'registration-form';

export function RegistrationDialog({ course, institution, open, onClose, onRegistered }) {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const formRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setValues(INITIAL_VALUES);
    setErrors({});
    setFormError('');
    setSubmitting(false);
    setResult(null);
  }, [open]);

  const update = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError('');
    try {
      const response = await request(`/api/courses/${encodeURIComponent(course.id)}/registrations`, {
        method: 'POST',
        body: toRegistrationPayload(values),
      });
      setResult(response);
      onRegistered?.(response.seatsLeft);
    } catch (error) {
      if (error.code === 'VALIDATION_ERROR' && error.details?.length) {
        const fieldErrors = mapFieldErrors(error.details);
        setErrors(fieldErrors);
        setFormError(fieldErrors._form ?? '');
        const first = Object.keys(fieldErrors).find((key) => key !== '_form');
        requestAnimationFrame(() => formRef.current?.querySelector(`[name="${first}"]`)?.focus());
      } else if (error.code === 'NO_SEATS') {
        setFormError('На жаль, місця на цей курс щойно закінчились.');
        onRegistered?.(0);
      } else {
        setFormError(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <Dialog open={open} onClose={onClose} title="Заявку прийнято" footer={<Button onClick={onClose}>Готово</Button>}>
        <div className={styles.success} role="status">
          <CircleCheck aria-hidden="true" size={44} className={styles.successIcon} />
          <p>
            Дякуємо, {values.name.trim()}! {institution.shortName} зв’яжеться з вами за контактом{' '}
            <strong>{values.contact.trim()}</strong>.
          </p>
          {result.seatsLeft !== null && <p className={styles.muted}>{seatsLabel(result.seatsLeft)}</p>}
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Реєстрація на курс"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Скасувати
          </Button>
          <Button type="submit" form={FORM_ID} disabled={submitting}>
            {submitting ? 'Надсилаємо…' : 'Надіслати заявку'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} ref={formRef} noValidate onSubmit={onSubmit} className={styles.form}>
        <p className={styles.course}>
          <strong>{course.title}</strong>
          <span>
            {institution.shortName} · {course.scheduleText}
          </span>
        </p>
        {formError && (
          <p role="alert" className={styles.formError}>
            {formError}
          </p>
        )}
        <Field label="Ім’я" error={errors.name} required>
          <input name="name" autoComplete="name" value={values.name} onChange={update('name')} />
        </Field>
        <Field label="Телефон або email" hint="Наприклад, +380 50 123 45 67 або name@example.com" error={errors.contact} required>
          <input name="contact" autoComplete="tel" value={values.contact} onChange={update('contact')} />
        </Field>
        <Field label="Вік учасника" error={errors.participantAge}>
          <input
            name="participantAge"
            type="number"
            inputMode="numeric"
            min="0"
            max="120"
            value={values.participantAge}
            onChange={update('participantAge')}
          />
        </Field>
        <Field label="Коментар" error={errors.comment}>
          <textarea name="comment" maxLength={500} value={values.comment} onChange={update('comment')} />
        </Field>
        <Checkbox
          name="consent"
          checked={values.consent}
          onChange={update('consent')}
          error={errors.consent}
          label="Погоджуюся на обробку персональних даних для зв’язку щодо курсу"
        />
      </form>
    </Dialog>
  );
}
```

`web/src/forms/RegistrationDialog.module.css`:
```css
.form {
  display: grid;
  gap: var(--space-4);
}

.course {
  display: grid;
  gap: 2px;
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  font-size: var(--text-sm);
}

.formError {
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-danger-soft);
  color: #b91c1c;
  font-weight: 700;
}

.success {
  display: grid;
  justify-items: center;
  gap: var(--space-3);
  padding: var(--space-4) 0;
  text-align: center;
}

.successIcon {
  color: var(--color-success);
}

.muted {
  color: var(--color-text-muted);
}
```

- [ ] **Step 5: `CourseDetailsPanel`**

`web/src/panels/CourseDetailsPanel.jsx`:
```jsx
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useApi } from '../api/useApi.js';
import { RegistrationDialog } from '../forms/RegistrationDialog.jsx';
import { BackLink } from '../layout/BackLink.jsx';
import { formatAge, formatDate, formatPrice, seatsLabel } from '../lib/format.js';
import { useMapState, useSelectedInstitution } from '../state/MapProvider.jsx';
import { useMeta } from '../state/MetaProvider.jsx';
import { useLinkTo } from '../state/useFilters.js';
import { Button } from '../ui/Button.jsx';
import { ErrorState } from '../ui/ErrorState.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import styles from './CourseDetailsPanel.module.css';
import { NotFoundPanel } from './NotFoundPanel.jsx';
import shared from './Panels.module.css';

export function CourseDetailsPanel() {
  const { courseId } = useParams();
  const { labels, dataNotice } = useMeta();
  const { catalogVersion } = useMapState();
  const linkTo = useLinkTo();
  const [registerOpen, setRegisterOpen] = useState(false);

  const { data, error, slow, reload } = useApi(`/api/courses/${encodeURIComponent(courseId)}`, {
    refreshKey: catalogVersion,
  });
  useSelectedInstitution(data?.institution.id ?? null);

  if (error?.code === 'NOT_FOUND') return <NotFoundPanel title="Курс не знайдено" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <Skeleton lines={4} slow={slow} />;

  const { course, institution, direction, category } = data;
  const noSeats = course.seatsLeft === 0;
  const facts = [
    ['Вік', formatAge(course.ageMin, course.ageMax)],
    ['Формат', labels.format[course.format]],
    ['Рівень', labels.level[course.level]],
    ['Тривалість', course.durationText],
    ['Розклад', course.scheduleText],
    ['Старт', formatDate(course.startDate)],
    ['Вартість', formatPrice(course.price, course.priceUnit)],
    ['Місця', seatsLabel(course.seatsLeft) ?? 'Без обмежень'],
  ];

  return (
    <article className={shared.section} aria-labelledby="course-title">
      <BackLink to={linkTo(`/institutions/${institution.id}/${direction.slug}`)}>{direction.name}</BackLink>

      <div className={shared.stack}>
        <p className={shared.eyebrow}>
          <span className={styles.dot} style={{ background: category?.color }} aria-hidden="true" />
          {category?.name}
        </p>
        <h2 id="course-title" className={shared.title}>
          {course.title}
        </h2>
        <Link to={linkTo(`/institutions/${institution.id}`)} className={styles.institution}>
          {institution.shortName}
        </Link>
      </div>

      <p>{course.shortDescription}</p>

      <dl className={styles.facts}>
        {facts.map(([label, value]) => (
          <div key={label} className={styles.fact}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <section className={shared.stack} aria-labelledby="course-about">
        <h3 id="course-about">Про курс</h3>
        <p>{course.description}</p>
      </section>
      <section className={shared.stack} aria-labelledby="course-audience">
        <h3 id="course-audience">Для кого</h3>
        <p>{course.audience}</p>
      </section>

      <p className={shared.notice}>{dataNotice}</p>

      <div className={styles.cta}>
        <Button onClick={() => setRegisterOpen(true)} disabled={noSeats} className={styles.ctaButton}>
          {noSeats ? 'Місць немає' : 'Зареєструватися'}
        </Button>
      </div>

      <RegistrationDialog
        course={course}
        institution={institution}
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onRegistered={reload}
      />
    </article>
  );
}
```

`web/src/panels/CourseDetailsPanel.module.css`:
```css
.dot {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
}

.institution {
  font-weight: 700;
}

.facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
  margin: 0;
}

.fact {
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
}

.fact dt {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  font-weight: 700;
}

.fact dd {
  margin: 0;
  font-weight: 700;
}

.cta {
  position: sticky;
  bottom: calc(-1 * var(--space-5));
  margin: 0 calc(-1 * var(--space-4));
  padding: var(--space-3) var(--space-4);
  background: linear-gradient(to top, var(--color-surface) 75%, transparent);
}

.ctaButton {
  width: 100%;
}
```

- [ ] **Step 6: Маршрут**

`web/src/App.jsx`:
```jsx
<Route path="courses/:courseId" element={<CourseDetailsPanel />} />
```

- [ ] **Step 7: Кінець фази**

Run: `npm test && npm run test:web && npm run build` → усе зелене.
Браузер (сервер на MemoryStore): ХПІ → «Робототехніка» → «Робототехніка на Arduino» → «Зареєструватися»: три заявки успішні (на екрані успіху «Лишилось 2 місця», «Лишилось 1 місце», «Місць немає»), після третьої кнопка на сторінці курсу стає недоступною «Місць немає»; порожня форма показує помилки під полями; deep link `/courses/khpi-robotics-arduino` відкривається після перезавантаження.
Зупинитися: **«Фаза F3 готова, перевірте картку закладу, курси та реєстрацію»**.

---

# Фаза F4 — «Додати заклад» і квіз

### Task 14: «Додати заклад»

**Files:**
- Modify: `web/src/forms/formErrors.js`, `web/src/forms/formErrors.spec.js`
- Create: `web/src/forms/InstitutionForm.jsx` (+ `InstitutionForm.module.css`), `web/src/forms/AddInstitutionPanel.jsx` (+ `AddInstitutionPanel.module.css`)
- Modify: `web/src/App.jsx`
- Test: `web/src/forms/InstitutionForm.spec.jsx`, `web/src/forms/AddInstitutionPanel.spec.jsx`

**Interfaces:**
- Consumes: `request`, `mapFieldErrors`, `toggleValue`, `isWithinBounds`, `useMapState` (`pickPoint`, `setPickPoint`, `refreshCatalog`), `useSheet`, `useSelectedInstitution`, `useLinkTo`, `useToast`, `useMeta` (`institutionTypes`, `directions`, `categories`, `city.bounds`), `Field`, `Chip`, `Button`, `BackLink`.
- Produces:
  - `toSubmissionPayload(values, point) → body для POST /api/institutions` (`hasShelter`: `'yes'` → `true`, `'no'` → `false`, `''` → `null`; порожні необов’язкові поля → `undefined`)
  - `InstitutionForm({ point, onBack, onCreated(institution) })`
  - `AddInstitutionPanel()` — маршрут `/add` (у `MapProvider` `pickMode = true`, карта ловить кліки)

- [ ] **Step 1: Тести, що падають**

Додати в `web/src/forms/formErrors.spec.js`:
```js
import { toSubmissionPayload } from './formErrors.js';

describe('toSubmissionPayload', () => {
  const values = {
    name: ' Школа «Кібер» ',
    type: 'private_school',
    address: ' вул. Пушкінська, 50 ',
    shortDescription: '',
    website: ' https://kiber.example ',
    phone: '+380501112233',
    email: '',
    contactPerson: 'Ірина',
    hasShelter: 'yes',
    declaredDirectionIds: ['robotics'],
  };

  test('обрізає, пропускає порожні, додає координати', () => {
    expect(toSubmissionPayload(values, { lat: 50.0021, lng: 36.2445 })).toEqual({
      name: 'Школа «Кібер»',
      type: 'private_school',
      address: 'вул. Пушкінська, 50',
      lat: 50.0021,
      lng: 36.2445,
      shortDescription: undefined,
      website: 'https://kiber.example',
      phone: '+380501112233',
      email: undefined,
      contactPerson: 'Ірина',
      hasShelter: true,
      declaredDirectionIds: ['robotics'],
    });
  });

  test('укриття: ні / не вказано', () => {
    expect(toSubmissionPayload({ ...values, hasShelter: 'no' }, null).hasShelter).toBe(false);
    expect(toSubmissionPayload({ ...values, hasShelter: '' }, null).hasShelter).toBeNull();
  });
});
```

`web/src/forms/InstitutionForm.spec.jsx`:
```jsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { mockFetch, renderWithProviders } from '../test/fixtures.jsx';
import { InstitutionForm } from './InstitutionForm.jsx';

const point = { lat: 50.0021, lng: 36.2445 };

describe('InstitutionForm', () => {
  test('надсилає заявку і повертає створений заклад', async () => {
    const created = { id: 'new-1', status: 'pending', name: 'Школа «Кібер»' };
    const fetchMock = mockFetch({ '/api/institutions': () => ({ status: 201, body: { institution: created } }) });
    const onCreated = vi.fn();
    renderWithProviders(<InstitutionForm point={point} onBack={vi.fn()} onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText(/Назва закладу/), 'Школа «Кібер»');
    await userEvent.selectOptions(screen.getByLabelText(/Тип закладу/), 'private_school');
    await userEvent.type(screen.getByLabelText(/Адреса/), 'вул. Пушкінська, 50');
    await userEvent.type(screen.getByLabelText('Телефон'), '+380501112233');
    await userEvent.click(screen.getByRole('radio', { name: 'Так' }));
    await userEvent.click(screen.getByRole('button', { name: 'Робототехніка' }));
    await userEvent.click(screen.getByRole('button', { name: 'Надіслати на модерацію' }));

    await vi.waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    const [, init] = fetchMock.mock.calls.find(([u, i]) => u === '/api/institutions' && i.method === 'POST');
    expect(JSON.parse(init.body)).toEqual({
      name: 'Школа «Кібер»',
      type: 'private_school',
      address: 'вул. Пушкінська, 50',
      lat: 50.0021,
      lng: 36.2445,
      phone: '+380501112233',
      hasShelter: true,
      declaredDirectionIds: ['robotics'],
    });
  });

  test('помилки полів і координат', async () => {
    mockFetch({
      '/api/institutions': () => ({
        status: 400,
        body: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Некоректні дані форми',
            details: [
              { path: 'phone', message: 'Вкажіть телефон або email' },
              { path: 'lat', message: 'Точка має бути в межах міста' },
            ],
          },
        },
      }),
    });
    renderWithProviders(<InstitutionForm point={point} onBack={vi.fn()} onCreated={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Надіслати на модерацію' }));
    expect(await screen.findByText('Вкажіть телефон або email')).toBeInTheDocument();
    expect(screen.getByText('Точка на карті поза межами міста. Поверніться до кроку 1 і оберіть іншу.')).toBeInTheDocument();
  });
});
```

`web/src/forms/AddInstitutionPanel.spec.jsx`:
```jsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { MapProvider, useMapState } from '../state/MapProvider.jsx';
import { markersFixture, mockFetch, renderWithProviders } from '../test/fixtures.jsx';
import { AddInstitutionPanel } from './AddInstitutionPanel.jsx';

function PickButtons() {
  const { setPickPoint, pickMode } = useMapState();
  return (
    <>
      <p data-testid="mode">{String(pickMode)}</p>
      <button onClick={() => setPickPoint({ lat: 50.45, lng: 30.52 })}>kyiv</button>
      <button onClick={() => setPickPoint({ lat: 50.0021, lng: 36.2445 })}>kharkiv</button>
    </>
  );
}

describe('AddInstitutionPanel', () => {
  test('крок 1: точка має бути в межах Харкова, потім форма', async () => {
    mockFetch({ '/api/institutions': markersFixture });
    renderWithProviders(
      <MapProvider>
        <PickButtons />
        <AddInstitutionPanel />
      </MapProvider>,
      { route: '/add', path: '/add' },
    );

    expect(screen.getByTestId('mode')).toHaveTextContent('true');
    expect(screen.getByText('Точку ще не обрано.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Далі' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'kyiv' }));
    expect(screen.getByText('Точка поза межами Харкова. Оберіть місце в місті.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Далі' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'kharkiv' }));
    expect(screen.getByText('Обрано: 50.00210, 36.24450')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Далі' }));
    expect(screen.getByText('Крок 2 з 2')).toBeInTheDocument();
    expect(screen.getByLabelText(/Назва закладу/)).toBeInTheDocument();
  });
});
```

Run: `npm run test:web -- src/forms` → FAIL.

- [ ] **Step 2: `toSubmissionPayload`**

Додати в `web/src/forms/formErrors.js`:
```js
const optionalText = (value) => {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? undefined : trimmed;
};

const SHELTER_VALUES = { yes: true, no: false };

export function toSubmissionPayload(values, point) {
  return {
    name: values.name.trim(),
    type: values.type,
    address: values.address.trim(),
    lat: point?.lat,
    lng: point?.lng,
    shortDescription: optionalText(values.shortDescription),
    website: optionalText(values.website),
    phone: optionalText(values.phone),
    email: optionalText(values.email),
    contactPerson: optionalText(values.contactPerson),
    hasShelter: SHELTER_VALUES[values.hasShelter] ?? null,
    declaredDirectionIds: values.declaredDirectionIds,
  };
}
```
(`JSON.stringify` не включає ключі з `undefined`, тому тіло запиту в тесті форми їх не містить.)

- [ ] **Step 3: `InstitutionForm`**

`web/src/forms/InstitutionForm.jsx`:
```jsx
import { ArrowLeft } from 'lucide-react';
import { useRef, useState } from 'react';
import { request } from '../api/client.js';
import { useMeta } from '../state/MetaProvider.jsx';
import { toggleValue } from '../state/filters.js';
import { Button } from '../ui/Button.jsx';
import { Chip } from '../ui/Chip.jsx';
import { Field } from '../ui/Field.jsx';
import { mapFieldErrors, toSubmissionPayload } from './formErrors.js';
import styles from './InstitutionForm.module.css';

const INITIAL_VALUES = {
  name: '',
  type: '',
  address: '',
  shortDescription: '',
  website: '',
  phone: '',
  email: '',
  contactPerson: '',
  hasShelter: '',
  declaredDirectionIds: [],
};

const SHELTER_OPTIONS = [
  { value: 'yes', label: 'Так' },
  { value: 'no', label: 'Ні' },
  { value: '', label: 'Не вказано' },
];

const POINT_ERROR = 'Точка на карті поза межами міста. Поверніться до кроку 1 і оберіть іншу.';

export function InstitutionForm({ point, onBack, onCreated }) {
  const { institutionTypes, directions, categories } = useMeta();
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef(null);

  const update = (field) => (event) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const toggleDirection = (id) =>
    setValues((prev) => ({ ...prev, declaredDirectionIds: toggleValue(prev.declaredDirectionIds, id) }));

  const onSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError('');
    try {
      const { institution } = await request('/api/institutions', {
        method: 'POST',
        body: toSubmissionPayload(values, point),
      });
      onCreated(institution);
    } catch (error) {
      if (error.code === 'VALIDATION_ERROR' && error.details?.length) {
        const fieldErrors = mapFieldErrors(error.details);
        setErrors(fieldErrors);
        setFormError(fieldErrors.lat || fieldErrors.lng ? POINT_ERROR : (fieldErrors._form ?? ''));
        const first = Object.keys(fieldErrors).find((key) => !['lat', 'lng', '_form'].includes(key));
        if (first) requestAnimationFrame(() => formRef.current?.querySelector(`[name="${first}"]`)?.focus());
      } else {
        setFormError(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className={styles.form}>
      {formError && (
        <p role="alert" className={styles.formError}>
          {formError}
        </p>
      )}

      <Field label="Назва закладу" required error={errors.name}>
        <input name="name" value={values.name} onChange={update('name')} />
      </Field>
      <Field label="Тип закладу" required error={errors.type}>
        <select name="type" value={values.type} onChange={update('type')}>
          <option value="">Оберіть тип</option>
          {institutionTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Адреса" required hint="Вулиця та номер будинку" error={errors.address}>
        <input name="address" autoComplete="street-address" value={values.address} onChange={update('address')} />
      </Field>
      <Field label="Короткий опис" hint={`${values.shortDescription.length} / 300`} error={errors.shortDescription}>
        <textarea name="shortDescription" maxLength={300} value={values.shortDescription} onChange={update('shortDescription')} />
      </Field>
      <Field label="Сайт" hint="Починається з https://" error={errors.website}>
        <input name="website" type="url" inputMode="url" autoComplete="url" value={values.website} onChange={update('website')} />
      </Field>
      <Field label="Телефон" hint="Потрібен телефон або email" error={errors.phone}>
        <input name="phone" type="tel" autoComplete="tel" value={values.phone} onChange={update('phone')} />
      </Field>
      <Field label="Email" error={errors.email}>
        <input name="email" type="email" autoComplete="email" value={values.email} onChange={update('email')} />
      </Field>
      <Field label="Контактна особа" hint="Бачить лише модератор" error={errors.contactPerson}>
        <input name="contactPerson" autoComplete="name" value={values.contactPerson} onChange={update('contactPerson')} />
      </Field>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Чи є укриття?</legend>
        <div className={styles.segmented}>
          {SHELTER_OPTIONS.map((option) => (
            <label key={option.label} className={styles.segment}>
              <input
                type="radio"
                name="hasShelter"
                value={option.value}
                checked={values.hasShelter === option.value}
                onChange={update('hasShelter')}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Напрямки</legend>
        <p className={styles.hint}>Оберіть, чого навчають у закладі.</p>
        <div className={styles.chips}>
          {categories.flatMap((category) =>
            directions
              .filter((d) => d.categoryCode === category.code)
              .map((d) => (
                <Chip
                  key={d.id}
                  color={category.color}
                  pressed={values.declaredDirectionIds.includes(d.id)}
                  onToggle={() => toggleDirection(d.id)}
                >
                  {d.name}
                </Chip>
              )),
          )}
        </div>
        {errors.declaredDirectionIds && (
          <p role="alert" className={styles.fieldError}>
            {errors.declaredDirectionIds}
          </p>
        )}
      </fieldset>

      <div className={styles.actions}>
        <Button variant="ghost" icon={ArrowLeft} onClick={onBack}>
          Змінити точку
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Надсилаємо…' : 'Надіслати на модерацію'}
        </Button>
      </div>
    </form>
  );
}
```

`web/src/forms/InstitutionForm.module.css`:
```css
.form {
  display: grid;
  gap: var(--space-4);
}

.formError {
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-danger-soft);
  color: #b91c1c;
  font-weight: 700;
}

.fieldset {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  border: 0;
}

.legend {
  margin-bottom: var(--space-2);
  padding: 0;
  font-size: var(--text-sm);
  font-weight: 700;
}

.hint {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
}

.segmented {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
}

.segment {
  position: relative;
}

.segment input {
  position: absolute;
  opacity: 0;
}

.segment span {
  display: grid;
  place-items: center;
  min-height: var(--touch-target);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-weight: 700;
  cursor: pointer;
}

.segment input:checked + span {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
  color: var(--color-primary-hover);
}

.segment input:focus-visible + span {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.fieldError {
  color: var(--color-danger);
  font-size: var(--text-sm);
  font-weight: 600;
}

.actions {
  position: sticky;
  bottom: calc(-1 * var(--space-5));
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-3) 0;
  background: linear-gradient(to top, var(--color-surface) 75%, transparent);
}
```

- [ ] **Step 4: `AddInstitutionPanel`**

`web/src/forms/AddInstitutionPanel.jsx`:
```jsx
import { ArrowRight, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { BackLink } from '../layout/BackLink.jsx';
import { useSheet } from '../layout/Panel.jsx';
import { isWithinBounds } from '../map/geo.js';
import shared from '../panels/Panels.module.css';
import { useMapState, useSelectedInstitution } from '../state/MapProvider.jsx';
import { useMeta } from '../state/MetaProvider.jsx';
import { useLinkTo } from '../state/useFilters.js';
import { Button } from '../ui/Button.jsx';
import { useToast } from '../ui/Toast.jsx';
import styles from './AddInstitutionPanel.module.css';
import { InstitutionForm } from './InstitutionForm.jsx';

export function AddInstitutionPanel() {
  const { city } = useMeta();
  const { pickPoint, setPickPoint, refreshCatalog } = useMapState();
  const { setSnap } = useSheet();
  const navigate = useNavigate();
  const linkTo = useLinkTo();
  const toast = useToast();
  const [step, setStep] = useState('pick');
  useSelectedInstitution(null);

  useEffect(() => () => setPickPoint(null), [setPickPoint]);

  const inBounds = pickPoint ? isWithinBounds(pickPoint, city.bounds) : false;

  const status = !pickPoint
    ? { tone: styles.hint, text: 'Точку ще не обрано.' }
    : inBounds
      ? { tone: styles.ok, text: `Обрано: ${pickPoint.lat.toFixed(5)}, ${pickPoint.lng.toFixed(5)}` }
      : { tone: styles.error, text: 'Точка поза межами Харкова. Оберіть місце в місті.' };

  const onCreated = (institution) => {
    refreshCatalog();
    setPickPoint(null);
    toast.show('Заклад додано. Він позначений «На модерації», доки його не перевірять.', { tone: 'success' });
    navigate(linkTo(`/institutions/${institution.id}`));
  };

  return (
    <section className={shared.section} aria-labelledby="add-title">
      <BackLink to={linkTo('/')}>Скасувати</BackLink>
      <div className={shared.stack}>
        <p className={shared.eyebrow}>Крок {step === 'pick' ? 1 : 2} з 2</p>
        <h2 id="add-title" className={shared.title}>
          Додати заклад
        </h2>
      </div>

      {step === 'pick' ? (
        <>
          <p className={shared.muted}>Натисніть на карті місце, де розташований заклад. Мітку можна перетягнути.</p>
          <p aria-live="polite" className={`${styles.status} ${status.tone}`}>
            <MapPin aria-hidden="true" size={18} />
            {status.text}
          </p>
          <Button
            icon={ArrowRight}
            disabled={!inBounds}
            onClick={() => {
              setStep('form');
              setSnap('full');
            }}
          >
            Далі
          </Button>
        </>
      ) : (
        <InstitutionForm
          point={pickPoint}
          onBack={() => {
            setStep('pick');
            setSnap('peek');
          }}
          onCreated={onCreated}
        />
      )}
    </section>
  );
}
```

`web/src/forms/AddInstitutionPanel.module.css`:
```css
.status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  font-weight: 700;
}

.hint {
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
}

.ok {
  background: var(--color-success-soft);
  color: #15803d;
}

.error {
  background: var(--color-danger-soft);
  color: #b91c1c;
}
```

- [ ] **Step 5: Маршрут і перевірка**

`web/src/App.jsx`:
```jsx
<Route path="add" element={<AddInstitutionPanel />} />
```

Run: `npm run test:web` → PASS.

---

### Task 15: Квіз «Що обрати дитині?» і дії на карті

**Files:**
- Create: `web/src/quiz/quizInput.js`, `web/src/quiz/icons.js`, `web/src/quiz/QuizDialog.jsx` (+ `QuizDialog.module.css`)
- Create: `web/src/ui/IconLink.jsx`, `web/src/layout/MapActions.jsx` (+ `MapActions.module.css`)
- Modify: `web/src/layout/MapLayout.jsx`, `web/src/test/fixtures.jsx`, `web/src/App.jsx`
- Test: `web/src/quiz/quizInput.spec.js`, `web/src/quiz/QuizDialog.spec.jsx`

**Interfaces:**
- Consumes: `useApi`, `request`, `useMapState` (`locate`, `showHighlight`), `fromApiFilters`, `filtersToSearchString`, `useMeta`, `Dialog`, `Button`, `EmptyState`, `ErrorState`, `Skeleton`, `useLinkTo`, `useMediaQuery`.
- Produces:
  - `isSelected(question, answers, optionId)`, `toggleAnswer(question, answers, optionId) → answers`, `isAnswered(question, answers)`
  - `buildRecommendationInput(quiz, answers, coords) → { input, wantsLocation }`
  - `quizIcon(optionId) → LucideIcon`
  - `QuizDialog()` — маршрут `/quiz` поверх `ResultsPanel`
  - `IconLink({ to, label, icon, variant? })`, `MapActions()` — «Підібрати курс» і «Додати заклад» (desktop — кнопки з текстом, mobile — круглі іконки)
  - Фікстури `quizFixture`, `recommendationsFixture`

- [ ] **Step 1: Фікстури**

Додати в `web/src/test/fixtures.jsx`:
```jsx
export const quizFixture = {
  id: 'what-to-choose',
  title: 'Що обрати дитині?',
  subtitle: '5 коротких запитань — і ми покажемо 3 найкращі варіанти на карті.',
  questions: [
    {
      id: 'age',
      title: 'Скільки років учасникові?',
      type: 'single',
      required: true,
      options: [
        { id: 'age-6-9', label: '6–9 років', value: { age: 8 } },
        { id: 'age-10-13', label: '10–13 років', value: { age: 11 } },
        { id: 'age-14-17', label: '14–17 років', value: { age: 15 } },
        { id: 'age-18-plus', label: '18+ років', value: { age: 25 } },
      ],
    },
    {
      id: 'interests',
      title: 'Що найбільше подобається робити?',
      subtitle: 'Можна обрати кілька варіантів.',
      type: 'multi',
      required: true,
      options: [
        { id: 'build', label: 'Будувати й конструювати', value: { interests: ['robotics', '3d-modeling', 'electronics'] } },
        { id: 'code', label: 'Створювати ігри та програми', value: { interests: ['programming', 'game-dev'] } },
        { id: 'draw', label: 'Малювати й оживляти персонажів', value: { interests: ['digital-design', 'animation'] } },
      ],
    },
    {
      id: 'format',
      title: 'Який формат занять зручніший?',
      type: 'single',
      required: true,
      options: [
        { id: 'format-offline', label: 'Наживо, в класі', value: { format: ['offline', 'hybrid'] } },
        { id: 'format-online', label: 'Онлайн з дому', value: { format: ['online', 'hybrid'] } },
        { id: 'format-any', label: 'Не важливо', value: { format: [] } },
      ],
    },
    {
      id: 'price',
      title: 'Розглядаєте платні заняття?',
      type: 'single',
      required: true,
      options: [
        { id: 'price-free', label: 'Лише безкоштовні', value: { price: 'free' } },
        { id: 'price-any', label: 'Підійдуть і платні', value: { price: 'any' } },
      ],
    },
    {
      id: 'distance',
      title: 'Чи важливо, щоб заклад був поруч?',
      type: 'single',
      required: false,
      options: [
        { id: 'distance-near', label: 'Так, шукати біля мене', value: { useLocation: true } },
        { id: 'distance-any', label: 'Не важливо', value: { useLocation: false } },
      ],
    },
  ],
};

export const recommendationsFixture = {
  filters: { ageFrom: 11, ageTo: 11, direction: ['robotics', '3d-modeling', 'electronics'], format: ['offline', 'hybrid'] },
  items: [
    {
      course: { id: 'khpi-robotics-arduino', title: 'Робототехніка на Arduino', shortDescription: '…', ageMin: 11, ageMax: 16, level: 'beginner', format: 'offline', price: 1200, priceUnit: 'month', durationText: '5 місяців', scheduleText: 'Субота, 12:00–14:00', startDate: '2026-10-03', seatsTotal: 12, seatsLeft: 3 },
      institution: { id: 'khpi', name: 'НТУ «ХПІ»', shortName: 'НТУ «ХПІ»', lat: 49.9989798, lng: 36.2483061 },
      direction: { slug: 'robotics', name: 'Робототехніка', categoryCode: 'T' },
      score: 1,
      reasons: ['Підходить за віком (11–16 років)', 'Ваш інтерес: Робототехніка', 'Формат: офлайн'],
      distanceKm: null,
    },
    {
      course: { id: 'itstep-scratch', title: 'Scratch: перші ігри', shortDescription: '…', ageMin: 8, ageMax: 11, level: 'beginner', format: 'hybrid', price: 1600, priceUnit: 'month', durationText: '4 місяці', scheduleText: 'Неділя, 10:00–11:30', startDate: '2026-10-04', seatsTotal: 10, seatsLeft: 4 },
      institution: { id: 'itstep-kharkiv', name: 'ITSTEP', shortName: 'ITSTEP Академія', lat: 50.0045811, lng: 36.2568894 },
      direction: { slug: 'game-dev', name: 'Розробка ігор', categoryCode: 'T' },
      score: 0.69,
      reasons: ['Підходить за віком (8–11 років)', 'Схожий напрям: Розробка ігор', 'Формат: гібрид'],
      distanceKm: null,
    },
  ],
};
```

- [ ] **Step 2: Тести, що падають**

`web/src/quiz/quizInput.spec.js`:
```js
import { describe, expect, test } from 'vitest';
import { quizFixture } from '../test/fixtures.jsx';
import { buildRecommendationInput, isAnswered, isSelected, toggleAnswer } from './quizInput.js';

const [age, interests, , , distance] = quizFixture.questions;

describe('відповіді квізу', () => {
  test('single замінює, multi перемикає', () => {
    let answers = toggleAnswer(age, {}, 'age-6-9');
    answers = toggleAnswer(age, answers, 'age-10-13');
    expect(answers.age).toBe('age-10-13');
    answers = toggleAnswer(interests, answers, 'build');
    answers = toggleAnswer(interests, answers, 'code');
    answers = toggleAnswer(interests, answers, 'build');
    expect(answers.interests).toEqual(['code']);
    expect(isSelected(interests, answers, 'code')).toBe(true);
    expect(isSelected(age, answers, 'age-6-9')).toBe(false);
  });

  test('isAnswered: обовʼязкові потребують відповіді, необовʼязкові — ні', () => {
    expect(isAnswered(age, {})).toBe(false);
    expect(isAnswered(interests, { interests: [] })).toBe(false);
    expect(isAnswered(interests, { interests: ['draw'] })).toBe(true);
    expect(isAnswered(distance, {})).toBe(true);
  });
});

describe('buildRecommendationInput', () => {
  const answers = { age: 'age-10-13', interests: ['build', 'code'], format: 'format-offline', price: 'price-any', distance: 'distance-near' };

  test('збирає тіло POST /api/recommendations', () => {
    expect(buildRecommendationInput(quizFixture, answers, { lat: 50, lng: 36.2 })).toEqual({
      wantsLocation: true,
      input: {
        age: 11,
        interests: ['robotics', '3d-modeling', 'electronics', 'programming', 'game-dev'],
        format: ['offline', 'hybrid'],
        price: 'any',
        lat: 50,
        lng: 36.2,
      },
    });
  });

  test('без координат або без бажання шукати поруч — без lat/lng', () => {
    expect(buildRecommendationInput(quizFixture, answers, null).input).not.toHaveProperty('lat');
    const noNear = buildRecommendationInput(quizFixture, { ...answers, distance: 'distance-any' }, { lat: 50, lng: 36 });
    expect(noNear.wantsLocation).toBe(false);
    expect(noNear.input).not.toHaveProperty('lat');
  });
});
```

`web/src/quiz/QuizDialog.spec.jsx`:
```jsx
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router';
import { describe, expect, test } from 'vitest';
import { MapProvider, useMapState } from '../state/MapProvider.jsx';
import { markersFixture, mockFetch, quizFixture, recommendationsFixture, renderWithProviders } from '../test/fixtures.jsx';
import { QuizDialog } from './QuizDialog.jsx';

function Probe() {
  const { pathname, search } = useLocation();
  const { highlightedIds } = useMapState();
  return (
    <>
      <p data-testid="location">{decodeURIComponent(pathname + search)}</p>
      <p data-testid="highlight">{highlightedIds.join(',')}</p>
    </>
  );
}

const renderQuiz = () =>
  renderWithProviders(
    <MapProvider>
      <QuizDialog />
      <Probe />
    </MapProvider>,
    { route: '/quiz' },
  );

describe('QuizDialog', () => {
  test('проходження квізу → рекомендації → показ на карті з підсвіткою', async () => {
    const fetchMock = mockFetch({
      '/api/quiz': quizFixture,
      '/api/recommendations': () => ({ body: recommendationsFixture }),
      '/api/institutions': markersFixture,
    });
    renderQuiz();

    expect(await screen.findByText('Питання 1 з 5')).toBeInTheDocument();
    const next = () => screen.getByRole('button', { name: /Далі|Показати результати/ });
    expect(next()).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: '10–13 років' }));
    await userEvent.click(next());
    await userEvent.click(screen.getByRole('button', { name: 'Будувати й конструювати' }));
    await userEvent.click(next());
    await userEvent.click(screen.getByRole('button', { name: 'Наживо, в класі' }));
    await userEvent.click(next());
    await userEvent.click(screen.getByRole('button', { name: 'Підійдуть і платні' }));
    await userEvent.click(next());
    await userEvent.click(screen.getByRole('button', { name: 'Не важливо' }));
    await userEvent.click(screen.getByRole('button', { name: 'Показати результати' }));

    expect(await screen.findByRole('heading', { name: 'Робототехніка на Arduino' })).toBeInTheDocument();
    expect(screen.getByText('Ваш інтерес: Робототехніка')).toBeInTheDocument();

    const [, init] = fetchMock.mock.calls.find(([u]) => u === '/api/recommendations');
    expect(JSON.parse(init.body)).toEqual({
      age: 11,
      interests: ['robotics', '3d-modeling', 'electronics'],
      format: ['offline', 'hybrid'],
      price: 'any',
    });

    await userEvent.click(screen.getByRole('button', { name: 'Показати на карті' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/?direction=robotics,3d-modeling,electronics&format=offline,hybrid&age=10-13');
    expect(screen.getByTestId('highlight')).toHaveTextContent('khpi,itstep-kharkiv');
  });

  test('порожній результат пропонує змінити відповіді', async () => {
    mockFetch({
      '/api/quiz': quizFixture,
      '/api/recommendations': () => ({ body: { filters: { ageFrom: 25, ageTo: 25 }, items: [] } }),
      '/api/institutions': markersFixture,
    });
    renderQuiz();
    await screen.findByText('Питання 1 з 5');
    for (const option of ['18+ років', 'Малювати й оживляти персонажів', 'Онлайн з дому', 'Лише безкоштовні', 'Не важливо']) {
      await userEvent.click(screen.getByRole('button', { name: option }));
      await userEvent.click(screen.getByRole('button', { name: /Далі|Показати результати/ }));
    }
    expect(await screen.findByText('Точних збігів немає')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Змінити відповіді' }));
    expect(screen.getByText('Питання 1 з 5')).toBeInTheDocument();
  });
});
```

Run: `npm run test:web -- src/quiz` → FAIL.

- [ ] **Step 3: `quizInput.js` та іконки**

`web/src/quiz/quizInput.js`:
```js
export function isSelected(question, answers, optionId) {
  const answer = answers[question.id];
  return question.type === 'multi' ? (answer ?? []).includes(optionId) : answer === optionId;
}

export function toggleAnswer(question, answers, optionId) {
  if (question.type !== 'multi') return { ...answers, [question.id]: optionId };
  const current = answers[question.id] ?? [];
  const next = current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId];
  return { ...answers, [question.id]: next };
}

export function isAnswered(question, answers) {
  if (!question.required) return true;
  const answer = answers[question.id];
  return Array.isArray(answer) ? answer.length > 0 : Boolean(answer);
}

// Значення обраних варіантів зливаються в тіло POST /api/recommendations
export function buildRecommendationInput(quiz, answers, coords) {
  const input = { interests: [], format: [], price: 'any' };
  let wantsLocation = false;

  for (const question of quiz.questions) {
    const selected = [answers[question.id]].flat().filter(Boolean);
    for (const optionId of selected) {
      const option = question.options.find((o) => o.id === optionId);
      if (!option) continue;
      const { interests, useLocation, ...rest } = option.value;
      if (interests) input.interests.push(...interests);
      if (useLocation) wantsLocation = true;
      Object.assign(input, rest);
    }
  }

  input.interests = [...new Set(input.interests)];
  if (wantsLocation && coords) {
    input.lat = coords.lat;
    input.lng = coords.lng;
  }
  return { input, wantsLocation };
}
```

`web/src/quiz/icons.js`:
```js
import {
  Baby,
  Briefcase,
  Calculator,
  Code,
  Gift,
  GraduationCap,
  House,
  Map,
  MapPin,
  Palette,
  School,
  Shuffle,
  Smile,
  Sparkles,
  Telescope,
  Wallet,
  Wrench,
} from 'lucide-react';

const ICONS = {
  'age-6-9': Baby,
  'age-10-13': Smile,
  'age-14-17': GraduationCap,
  'age-18-plus': Briefcase,
  build: Wrench,
  code: Code,
  draw: Palette,
  explore: Telescope,
  numbers: Calculator,
  'format-offline': School,
  'format-online': House,
  'format-any': Shuffle,
  'price-free': Gift,
  'price-any': Wallet,
  'distance-near': MapPin,
  'distance-any': Map,
};

// Emoji з quiz.json в UI не використовуємо — SVG-іконки за id варіанта
export function quizIcon(optionId) {
  return ICONS[optionId] ?? Sparkles;
}
```
Якщо якоїсь назви немає в `lucide-react@1.47`, `npm run build` впаде з помилкою імпорту — замінити на найближчу наявну іконку (перевірити в `node_modules/lucide-react/dist/lucide-react.d.ts`).

- [ ] **Step 4: `QuizDialog`**

`web/src/quiz/QuizDialog.jsx`:
```jsx
import { Check, Map as MapIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { request } from '../api/client.js';
import { useApi } from '../api/useApi.js';
import { useMapState } from '../state/MapProvider.jsx';
import { useMeta } from '../state/MetaProvider.jsx';
import { filtersToSearchString, fromApiFilters } from '../state/filters.js';
import { Button } from '../ui/Button.jsx';
import { Dialog } from '../ui/Dialog.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { ErrorState } from '../ui/ErrorState.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { quizIcon } from './icons.js';
import styles from './QuizDialog.module.css';
import { buildRecommendationInput, isAnswered, isSelected, toggleAnswer } from './quizInput.js';

export function QuizDialog() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const meta = useMeta();
  const { locate, showHighlight } = useMapState();
  const questionId = useId();
  const { data: quiz, error, slow, reload } = useApi('/api/quiz');

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [usedCoords, setUsedCoords] = useState(null);
  const [locationMissing, setLocationMissing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const close = () => navigate({ pathname: '/', search });

  const restart = () => {
    setResult(null);
    setIndex(0);
  };

  const finish = async () => {
    setSubmitting(true);
    setSubmitError('');
    const { wantsLocation } = buildRecommendationInput(quiz, answers, null);
    const coords = wantsLocation ? await locate() : null;
    const { input } = buildRecommendationInput(quiz, answers, coords);
    try {
      const response = await request('/api/recommendations', { method: 'POST', body: input });
      setUsedCoords(coords);
      setLocationMissing(wantsLocation && !coords);
      setResult(response);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const applyResult = (pathname) => {
    const filters = { ...fromApiFilters(result.filters, meta), near: Boolean(usedCoords) };
    showHighlight([...new Set(result.items.map((item) => item.institution.id))], filters);
    navigate({ pathname, search: filtersToSearchString(filters) });
  };

  if (error) {
    return (
      <Dialog open onClose={close} title="Що обрати дитині?">
        <ErrorState error={error} onRetry={reload} />
      </Dialog>
    );
  }
  if (!quiz) {
    return (
      <Dialog open onClose={close} title="Що обрати дитині?">
        <Skeleton lines={3} slow={slow} />
      </Dialog>
    );
  }

  if (result) {
    const empty = result.items.length === 0;
    return (
      <Dialog
        open
        size="lg"
        onClose={close}
        title={empty ? 'Результати підбору' : 'Ми підібрали для вас'}
        footer={
          !empty && (
            <>
              <Button variant="ghost" onClick={restart}>
                Пройти ще раз
              </Button>
              <Button icon={MapIcon} onClick={() => applyResult('/')}>
                Показати на карті
              </Button>
            </>
          )
        }
      >
        {locationMissing && <p className={styles.note}>Геолокація недоступна — підібрали без урахування відстані.</p>}
        {empty ? (
          <EmptyState
            title="Точних збігів немає"
            text="Спробуйте обрати більше інтересів, інший формат або платні заняття."
            action={<Button onClick={restart}>Змінити відповіді</Button>}
          />
        ) : (
          <ol className={styles.results}>
            {result.items.map((item, position) => (
              <li key={item.course.id} className={styles.result}>
                <span className={styles.rank} aria-hidden="true">
                  {position + 1}
                </span>
                <div className={styles.resultBody}>
                  <h3>{item.course.title}</h3>
                  <p className={styles.muted}>
                    {item.institution.shortName} · {item.direction.name}
                  </p>
                  <ul className={styles.reasons}>
                    {item.reasons.map((reason) => (
                      <li key={reason}>
                        <Check aria-hidden="true" size={16} />
                        {reason}
                      </li>
                    ))}
                  </ul>
                  <Button variant="secondary" size="sm" onClick={() => applyResult(`/courses/${item.course.id}`)}>
                    Детальніше
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Dialog>
    );
  }

  const question = quiz.questions[index];
  const last = index === quiz.questions.length - 1;
  const answered = isAnswered(question, answers);
  const total = quiz.questions.length;

  return (
    <Dialog
      open
      onClose={close}
      title={quiz.title}
      footer={
        <>
          {index > 0 && (
            <Button variant="ghost" onClick={() => setIndex((i) => i - 1)}>
              Назад
            </Button>
          )}
          <Button disabled={!answered || submitting} onClick={last ? finish : () => setIndex((i) => i + 1)}>
            {last ? (submitting ? 'Підбираємо…' : 'Показати результати') : 'Далі'}
          </Button>
        </>
      }
    >
      <div className={styles.progressWrap}>
        <p className={styles.muted}>
          Питання {index + 1} з {total}
        </p>
        <div
          className={styles.progress}
          role="progressbar"
          aria-label="Прогрес квізу"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={index + 1}
        >
          <span style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>
      </div>
      <h3 id={questionId} className={styles.question}>
        {question.title}
      </h3>
      {question.subtitle && <p className={styles.muted}>{question.subtitle}</p>}
      {submitError && (
        <p role="alert" className={styles.error}>
          {submitError}
        </p>
      )}
      <div role="group" aria-labelledby={questionId} className={styles.options}>
        {question.options.map((option) => {
          const Icon = quizIcon(option.id);
          return (
            <button
              key={option.id}
              type="button"
              className={styles.option}
              aria-pressed={isSelected(question, answers, option.id)}
              onClick={() => setAnswers((prev) => toggleAnswer(question, prev, option.id))}
            >
              <Icon aria-hidden="true" size={24} />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </Dialog>
  );
}
```

`web/src/quiz/QuizDialog.module.css`:
```css
.progressWrap {
  display: grid;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.progress {
  height: 6px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--color-surface-muted);
}

.progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--color-primary);
  transition: width var(--duration-base) var(--ease-out);
}

.question {
  margin-bottom: var(--space-2);
  font-size: var(--text-lg);
}

.muted {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-3);
  margin-top: var(--space-4);
}

.option {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 64px;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  transition: border-color var(--duration-fast) var(--ease-out), background-color var(--duration-fast) var(--ease-out);
}

.option svg {
  flex: none;
  color: var(--color-primary);
}

.option[aria-pressed='true'] {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
  box-shadow: inset 0 0 0 1px var(--color-primary);
}

.error,
.note {
  margin-top: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  font-weight: 600;
}

.error {
  background: var(--color-danger-soft);
  color: #b91c1c;
}

.note {
  background: var(--color-warning-soft);
  color: var(--color-warning);
}

.results {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.result {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.rank {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: #fff;
  font-weight: 800;
}

.resultBody {
  display: grid;
  gap: var(--space-2);
  justify-items: start;
}

.resultBody h3 {
  font-size: var(--text-md);
}

.reasons {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--text-sm);
}

.reasons li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.reasons svg {
  color: var(--color-success);
}
```

- [ ] **Step 5: Дії на карті**

`web/src/ui/IconLink.jsx`:
```jsx
import { Link } from 'react-router';
import styles from './IconButton.module.css';

export function IconLink({ to, label, icon: Icon, variant = 'default' }) {
  return (
    <Link to={to} aria-label={label} title={label} className={`${styles.iconButton} ${variant === 'primary' ? styles.primary : ''}`}>
      <Icon aria-hidden="true" size={20} strokeWidth={2.2} />
    </Link>
  );
}
```
Додати в `web/src/ui/IconButton.module.css`:
```css
.primary {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.primary:hover {
  background: var(--color-primary-hover);
}
```

`web/src/layout/MapActions.jsx`:
```jsx
import { Plus, Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import { DESKTOP_QUERY, useMediaQuery } from '../lib/useMediaQuery.js';
import { useLinkTo } from '../state/useFilters.js';
import { Button } from '../ui/Button.jsx';
import { IconLink } from '../ui/IconLink.jsx';
import styles from './MapActions.module.css';

export function MapActions() {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const linkTo = useLinkTo();

  if (!isDesktop) {
    return (
      <>
        <IconLink to={linkTo('/quiz')} label="Підібрати курс" icon={Sparkles} />
        <IconLink to={linkTo('/add')} label="Додати заклад" icon={Plus} variant="primary" />
      </>
    );
  }

  return (
    <div className={styles.actions}>
      <Button as={Link} to={linkTo('/quiz')} variant="secondary" icon={Sparkles}>
        Підібрати курс
      </Button>
      <Button as={Link} to={linkTo('/add')} icon={Plus}>
        Додати заклад
      </Button>
    </div>
  );
}
```

`web/src/layout/MapActions.module.css`:
```css
.actions {
  position: absolute;
  z-index: 900;
  top: var(--space-4);
  right: var(--space-4);
  display: flex;
  gap: var(--space-2);
}
```

`web/src/layout/MapLayout.jsx` — у `MapScreen`:
```jsx
      {isDesktop && <MapActions />}
      <div className={styles.mapControls}>
        <LocationButton compact={!isDesktop} />
        {!isDesktop && <MapActions />}
      </div>
```
(імпортувати `MapActions`).

- [ ] **Step 6: Маршрут**

`web/src/App.jsx`:
```jsx
<Route
  path="quiz"
  element={
    <>
      <ResultsPanel />
      <QuizDialog />
    </>
  }
/>
```

- [ ] **Step 7: Кінець фази**

Run: `npm test && npm run test:web && npm run build` → усе зелене.
Браузер (1440 і 375):
- «Підібрати курс» → 5 питань → результати (ХПІ Arduino, ITSTEP Scratch) → «Показати на карті»: фільтри застосовані, дві мітки пульсують, у списку бейдж «Рекомендовано»; зміна будь-якого фільтра знімає підсвітку.
- «Додати заклад» → шторка згорнута, клік по карті ставить синю шпильку, перетягування працює; клік поза Харковом — червоне повідомлення; форма → відкривається картка нового закладу з «На модерації», на карті пунктирне кільце.
Зупинитися: **«Фаза F4 готова, перевірте “Додати заклад” і квіз»**.

---

# Фаза F5 — модерація, якість, документація

### Task 16: Сторінка модерації `/admin`

**Files:**
- Create: `web/src/admin/adminToken.js`, `web/src/admin/AdminPage.jsx` (+ `Admin.module.css`), `web/src/admin/AdminLogin.jsx`, `web/src/admin/SubmissionsTab.jsx`, `web/src/admin/RegistrationsTab.jsx`
- Modify: `web/src/lib/format.js`, `web/src/lib/format.spec.js`, `web/src/App.jsx`
- Test: `web/src/admin/AdminPage.spec.jsx`

**Interfaces:**
- Consumes: `request`, `useApi` (`headers`, `refreshKey`), `useMeta` (`labels`, `directionById`), `useToast`, `formatDateTime`, `Brand`, `Button`, `Field`, `Badge`, `EmptyState`, `ErrorState`, `Skeleton`.
- Produces:
  - `readToken()`, `saveToken(token)`, `clearToken()` (sessionStorage, ключ `academy-locator-admin-token`), `adminHeaders(token) → { 'X-Admin-Token': token }`
  - `contactHref(contact) → 'mailto:…' | 'tel:…'`
  - `AdminPage()` — маршрут `/admin` (поза `MapLayout`)
  - `AdminLogin({ notice, onSuccess(token) })`, `SubmissionsTab({ state, token, onChanged })`, `RegistrationsTab({ state })`

- [ ] **Step 1: Тести, що падають**

Додати в `web/src/lib/format.spec.js`:
```js
import { contactHref } from './format.js';

describe('contactHref', () => {
  test('email → mailto, телефон → tel без пробілів', () => {
    expect(contactHref('olena@example.com')).toBe('mailto:olena@example.com');
    expect(contactHref('+380 50 123-45-67')).toBe('tel:+380501234567');
  });
});
```

`web/src/admin/AdminPage.spec.jsx`:
```jsx
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import { mockFetch, renderWithProviders } from '../test/fixtures.jsx';
import { AdminPage } from './AdminPage.jsx';

const TOKEN = 'smoke-token';
const submission = {
  id: 'p1',
  name: 'Школа робототехніки «Кібер»',
  shortName: 'Школа робототехніки «Кібер»',
  type: 'private_school',
  shortDescription: 'Робототехніка для дітей 7–14 років.',
  address: 'вул. Пушкінська, 50, Харків',
  website: null,
  phone: '+380501112233',
  email: null,
  contactPerson: 'Ірина',
  hasShelter: true,
  declaredDirectionIds: ['robotics'],
  status: 'pending',
  createdAt: '2026-09-17T11:05:00.000Z',
};
const registration = {
  id: 'r1',
  courseId: 'khpi-robotics-arduino',
  institutionId: 'khpi',
  name: 'Олена',
  contact: '+380501234567',
  participantAge: 11,
  comment: null,
  consent: true,
  createdAt: '2026-09-17T12:00:00.000Z',
  courseTitle: 'Робототехніка на Arduino',
  institutionShortName: 'НТУ «ХПІ»',
};

const unauthorized = () => ({ status: 401, body: { error: { code: 'UNAUTHORIZED', message: 'Потрібен коректний X-Admin-Token' } } });

function adminApi({ pendingItems = [submission] } = {}) {
  let items = pendingItems;
  const guard = (init, respond) => (init.headers?.['X-Admin-Token'] === TOKEN ? respond() : unauthorized());
  return mockFetch({
    '/api/admin/submissions': (url, init) => guard(init, () => ({ body: { items } })),
    '/api/admin/registrations': (url, init) => guard(init, () => ({ body: { items: [registration] } })),
    '/api/admin/institutions/': (url, init) =>
      guard(init, () => {
        items = [];
        return { body: { institution: { ...submission, status: JSON.parse(init.body).status } } };
      }),
  });
}

const login = async (token = TOKEN) => {
  await userEvent.type(screen.getByLabelText(/Адмін-токен/), token);
  await userEvent.click(screen.getByRole('button', { name: 'Увійти' }));
};

beforeEach(() => sessionStorage.clear());

describe('AdminPage', () => {
  test('неправильний токен', async () => {
    adminApi();
    renderWithProviders(<AdminPage />, { route: '/admin' });
    await login('wrong');
    expect(await screen.findByText('Невірний токен.')).toBeInTheDocument();
    expect(sessionStorage.getItem('academy-locator-admin-token')).toBeNull();
  });

  test('модерацію вимкнено на сервері (404)', async () => {
    mockFetch({ '/api/admin/submissions': () => ({ status: 404, body: { error: { code: 'NOT_FOUND', message: 'Маршрут не знайдено' } } }) });
    renderWithProviders(<AdminPage />, { route: '/admin' });
    await login();
    expect(await screen.findByText('Модерацію вимкнено на сервері: не задано ADMIN_TOKEN.')).toBeInTheDocument();
  });

  test('вхід, схвалення заявки з підтвердженням, реєстрації', async () => {
    const fetchMock = adminApi();
    renderWithProviders(<AdminPage />, { route: '/admin' });
    await login();

    expect(await screen.findByRole('tab', { name: 'Заявки (1)' })).toHaveAttribute('aria-selected', 'true');
    expect(sessionStorage.getItem('academy-locator-admin-token')).toBe(TOKEN);
    const card = screen.getByRole('listitem');
    expect(within(card).getByText('Ірина · +380501112233')).toBeInTheDocument();
    expect(within(card).getByText('Робототехніка')).toBeInTheDocument();

    await userEvent.click(within(card).getByRole('button', { name: 'Схвалити' }));
    expect(within(card).getByText('Схвалити заклад?')).toBeInTheDocument();
    await userEvent.click(within(card).getByRole('button', { name: 'Так' }));

    expect(await screen.findByText('Нових заявок немає')).toBeInTheDocument();
    const [, patch] = fetchMock.mock.calls.find(([u]) => u === '/api/admin/institutions/p1');
    expect(patch.method).toBe('PATCH');
    expect(JSON.parse(patch.body)).toEqual({ status: 'approved' });
    expect(screen.getByRole('status')).toHaveTextContent('«Школа робототехніки «Кібер»» схвалено');

    await userEvent.click(screen.getByRole('tab', { name: 'Реєстрації (1)' }));
    const row = screen.getByRole('row', { name: /Олена/ });
    expect(within(row).getByText('Робототехніка на Arduino')).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: '+380501234567' })).toHaveAttribute('href', 'tel:+380501234567');
  });

  test('токен став недійсним → повернення до входу', async () => {
    sessionStorage.setItem('academy-locator-admin-token', 'expired');
    adminApi();
    renderWithProviders(<AdminPage />, { route: '/admin' });
    expect(await screen.findByText('Сесію завершено: токен більше не дійсний.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Адмін-токен/)).toBeInTheDocument();
  });
});
```

Run: `npm run test:web -- src/admin src/lib` → FAIL.

- [ ] **Step 2: `contactHref` і токен**

Додати в `web/src/lib/format.js`:
```js
export function contactHref(contact) {
  return contact.includes('@') ? `mailto:${contact}` : `tel:${contact.replace(/[^\d+]/g, '')}`;
}
```

`web/src/admin/adminToken.js`:
```js
const STORAGE_KEY = 'academy-locator-admin-token';

// sessionStorage: токен живе до закриття вкладки. У приватному режимі сховище може бути недоступне.
export function readToken() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveToken(token) {
  try {
    sessionStorage.setItem(STORAGE_KEY, token);
  } catch {
    // токен лишиться лише в пам'яті сторінки
  }
}

export function clearToken() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // нічого очищати
  }
}

export function adminHeaders(token) {
  return { 'X-Admin-Token': token };
}
```

- [ ] **Step 3: Компоненти**

`web/src/admin/AdminLogin.jsx`:
```jsx
import { useState } from 'react';
import { request } from '../api/client.js';
import { Button } from '../ui/Button.jsx';
import { Field } from '../ui/Field.jsx';
import styles from './Admin.module.css';
import { adminHeaders } from './adminToken.js';

export function AdminLogin({ notice, onSuccess }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    const token = value.trim();
    if (!token) {
      setError('Введіть токен.');
      return;
    }
    setChecking(true);
    setError('');
    try {
      await request('/api/admin/submissions', { headers: adminHeaders(token) });
      onSuccess(token);
    } catch (err) {
      if (err.code === 'UNAUTHORIZED') setError('Невірний токен.');
      else if (err.status === 404) setError('Модерацію вимкнено на сервері: не задано ADMIN_TOKEN.');
      else setError(err.message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <form className={styles.loginCard} onSubmit={onSubmit} noValidate>
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
      <Field label="Адмін-токен" hint="Значення ADMIN_TOKEN у налаштуваннях сервісу на Render" error={error} required>
        <input
          name="token"
          type="password"
          autoComplete="current-password"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError('');
          }}
        />
      </Field>
      <Button type="submit" disabled={checking}>
        {checking ? 'Перевіряємо…' : 'Увійти'}
      </Button>
    </form>
  );
}
```

`web/src/admin/SubmissionsTab.jsx`:
```jsx
import { Check, Inbox, MapPin, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { request } from '../api/client.js';
import { formatDateTime } from '../lib/format.js';
import { useMeta } from '../state/MetaProvider.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { ErrorState } from '../ui/ErrorState.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { useToast } from '../ui/Toast.jsx';
import styles from './Admin.module.css';
import { adminHeaders } from './adminToken.js';

const SHELTER_LABELS = { true: 'Так', false: 'Ні', null: 'Не вказано' };

export function SubmissionsTab({ state, token, onChanged }) {
  const { labels, directionById } = useMeta();
  const toast = useToast();
  const [confirming, setConfirming] = useState(null);
  const [busyId, setBusyId] = useState(null);

  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} />;
  if (!state.data) return <Skeleton lines={2} slow={state.slow} />;
  if (state.data.items.length === 0) {
    return <EmptyState icon={Inbox} title="Нових заявок немає" text="Коли заклад надішле форму «Додати заклад», заявка з’явиться тут." />;
  }

  const decide = async (item, status) => {
    setBusyId(item.id);
    try {
      await request(`/api/admin/institutions/${encodeURIComponent(item.id)}`, {
        method: 'PATCH',
        body: { status },
        headers: adminHeaders(token),
      });
      toast.show(status === 'approved' ? `«${item.name}» схвалено` : `«${item.name}» відхилено`, {
        tone: status === 'approved' ? 'success' : 'neutral',
      });
      setConfirming(null);
      onChanged();
    } catch (error) {
      toast.show(error.message, { tone: 'danger' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ul className={styles.list}>
      {state.data.items.map((item) => {
        const contacts = [item.contactPerson, item.phone, item.email, item.website].filter(Boolean).join(' · ');
        const directions = item.declaredDirectionIds.map((id) => directionById[id]?.name ?? id).join(', ');
        const isConfirming = confirming?.id === item.id;
        return (
          <li key={item.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h3>{item.name}</h3>
                <p className={styles.muted}>
                  {labels.type[item.type]} · надіслано {formatDateTime(item.createdAt)}
                </p>
              </div>
              <Badge tone="warning">На модерації</Badge>
            </div>
            <dl className={styles.details}>
              <div>
                <dt>Адреса</dt>
                <dd>{item.address}</dd>
              </div>
              {item.shortDescription && (
                <div>
                  <dt>Опис</dt>
                  <dd>{item.shortDescription}</dd>
                </div>
              )}
              <div>
                <dt>Контакти</dt>
                <dd>{contacts || '—'}</dd>
              </div>
              <div>
                <dt>Укриття</dt>
                <dd>{SHELTER_LABELS[String(item.hasShelter)]}</dd>
              </div>
              <div>
                <dt>Напрямки</dt>
                <dd>{directions || '—'}</dd>
              </div>
            </dl>
            <div className={styles.actions}>
              <Button as={Link} to={`/institutions/${item.id}`} variant="ghost" size="sm" icon={MapPin}>
                На карті
              </Button>
              {isConfirming ? (
                <>
                  <span className={styles.confirmText}>
                    {confirming.status === 'approved' ? 'Схвалити заклад?' : 'Відхилити заклад?'}
                  </span>
                  <Button
                    size="sm"
                    variant={confirming.status === 'approved' ? 'primary' : 'danger'}
                    disabled={busyId === item.id}
                    onClick={() => decide(item, confirming.status)}
                  >
                    Так
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                    Скасувати
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="danger" icon={X} onClick={() => setConfirming({ id: item.id, status: 'rejected' })}>
                    Відхилити
                  </Button>
                  <Button size="sm" icon={Check} onClick={() => setConfirming({ id: item.id, status: 'approved' })}>
                    Схвалити
                  </Button>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
```

`web/src/admin/RegistrationsTab.jsx`:
```jsx
import { ClipboardList } from 'lucide-react';
import { contactHref, formatDateTime } from '../lib/format.js';
import { EmptyState } from '../ui/EmptyState.jsx';
import { ErrorState } from '../ui/ErrorState.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import styles from './Admin.module.css';

export function RegistrationsTab({ state }) {
  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} />;
  if (!state.data) return <Skeleton lines={2} slow={state.slow} />;
  if (state.data.items.length === 0) {
    return <EmptyState icon={ClipboardList} title="Реєстрацій ще немає" text="Заявки з форм курсів з’являться тут." />;
  }

  return (
    <table className={styles.table}>
      <caption className="visually-hidden">Реєстрації на курси</caption>
      <thead>
        <tr>
          <th scope="col">Дата</th>
          <th scope="col">Ім’я</th>
          <th scope="col">Контакт</th>
          <th scope="col">Вік</th>
          <th scope="col">Курс</th>
          <th scope="col">Заклад</th>
          <th scope="col">Коментар</th>
        </tr>
      </thead>
      <tbody>
        {state.data.items.map((r) => (
          <tr key={r.id}>
            <td data-label="Дата">{formatDateTime(r.createdAt)}</td>
            <td data-label="Ім’я">{r.name}</td>
            <td data-label="Контакт">
              <a href={contactHref(r.contact)}>{r.contact}</a>
            </td>
            <td data-label="Вік">{r.participantAge ?? '—'}</td>
            <td data-label="Курс">{r.courseTitle ?? r.courseId}</td>
            <td data-label="Заклад">{r.institutionShortName ?? '—'}</td>
            <td data-label="Коментар">{r.comment ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

`web/src/admin/AdminPage.jsx`:
```jsx
import { LogOut, Map as MapIcon } from 'lucide-react';
import { useCallback, useEffect, useId, useState } from 'react';
import { Link } from 'react-router';
import { useApi } from '../api/useApi.js';
import { Brand } from '../layout/Brand.jsx';
import { Button } from '../ui/Button.jsx';
import styles from './Admin.module.css';
import { AdminLogin } from './AdminLogin.jsx';
import { adminHeaders, clearToken, readToken, saveToken } from './adminToken.js';
import { RegistrationsTab } from './RegistrationsTab.jsx';
import { SubmissionsTab } from './SubmissionsTab.jsx';

const DEFAULT_TITLE = 'Academy Locator — STEAM-освіта Харкова';

export function AdminPage() {
  const [token, setToken] = useState(readToken);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    document.title = 'Модерація — Academy Locator';
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, []);

  const logout = useCallback((message = '') => {
    clearToken();
    setToken('');
    setNotice(message);
  }, []);

  const onUnauthorized = useCallback(() => logout('Сесію завершено: токен більше не дійсний.'), [logout]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Brand compact />
        <div className={styles.headerActions}>
          <Button as={Link} to="/" variant="ghost" size="sm" icon={MapIcon}>
            До карти
          </Button>
          {token && (
            <Button variant="secondary" size="sm" icon={LogOut} onClick={() => logout()}>
              Вийти
            </Button>
          )}
        </div>
      </header>
      <main className={styles.main}>
        <h1 className={styles.title}>Модерація</h1>
        {token ? (
          <AdminDashboard token={token} onUnauthorized={onUnauthorized} />
        ) : (
          <AdminLogin
            notice={notice}
            onSuccess={(value) => {
              saveToken(value);
              setToken(value);
              setNotice('');
            }}
          />
        )}
      </main>
    </div>
  );
}

const TABS = [
  { id: 'submissions', label: 'Заявки' },
  { id: 'registrations', label: 'Реєстрації' },
];

function AdminDashboard({ token, onUnauthorized }) {
  const baseId = useId();
  const [tab, setTab] = useState('submissions');
  const [version, setVersion] = useState(0);
  const headers = adminHeaders(token);
  const submissions = useApi('/api/admin/submissions', { headers, refreshKey: version });
  const registrations = useApi('/api/admin/registrations', { headers, refreshKey: version });

  useEffect(() => {
    if (submissions.error?.code === 'UNAUTHORIZED' || registrations.error?.code === 'UNAUTHORIZED') onUnauthorized();
  }, [submissions.error, registrations.error, onUnauthorized]);

  const counts = {
    submissions: submissions.data?.items.length,
    registrations: registrations.data?.items.length,
  };

  const onKeyDown = (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    setTab((current) => (current === 'submissions' ? 'registrations' : 'submissions'));
  };

  return (
    <div className={styles.dashboard}>
      <div role="tablist" aria-label="Розділи модерації" className={styles.tabs} onKeyDown={onKeyDown}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${baseId}-${t.id}-tab`}
            aria-controls={`${baseId}-${t.id}-panel`}
            aria-selected={tab === t.id}
            tabIndex={tab === t.id ? 0 : -1}
            className={styles.tab}
            onClick={() => setTab(t.id)}
          >
            {counts[t.id] === undefined ? t.label : `${t.label} (${counts[t.id]})`}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${baseId}-${tab}-panel`} aria-labelledby={`${baseId}-${tab}-tab`}>
        {tab === 'submissions' ? (
          <SubmissionsTab state={submissions} token={token} onChanged={() => setVersion((v) => v + 1)} />
        ) : (
          <RegistrationsTab state={registrations} />
        )}
      </div>
    </div>
  );
}
```

`web/src/admin/Admin.module.css`:
```css
.page {
  min-height: 100dvh;
  background: var(--color-bg);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.headerActions {
  display: flex;
  gap: var(--space-2);
}

.main {
  display: grid;
  gap: var(--space-5);
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: var(--space-5) var(--space-4);
}

.title {
  font-size: var(--text-2xl);
}

.loginCard {
  display: grid;
  gap: var(--space-4);
  width: min(420px, 100%);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-md);
}

.notice {
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-warning-soft);
  color: var(--color-warning);
  font-weight: 700;
}

.dashboard {
  display: grid;
  gap: var(--space-4);
}

.tabs {
  display: flex;
  gap: var(--space-2);
  border-bottom: 1px solid var(--color-border);
}

.tab {
  min-height: var(--touch-target);
  padding: 0 var(--space-4);
  border: 0;
  border-bottom: 3px solid transparent;
  background: transparent;
  color: var(--color-text-muted);
  font-weight: 800;
  cursor: pointer;
}

.tab[aria-selected='true'] {
  border-bottom-color: var(--color-primary);
  color: var(--color-text);
}

.list {
  display: grid;
  gap: var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

.card {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.cardHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.muted {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-3);
  margin: 0;
}

.details dt {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  font-weight: 700;
}

.details dd {
  margin: 0;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
}

.confirmText {
  font-weight: 700;
}

.table {
  width: 100%;
  border-collapse: collapse;
  overflow: hidden;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  font-size: var(--text-sm);
}

.table th,
.table td {
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
  vertical-align: top;
}

.table th {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
}

@media (max-width: 767px) {
  .table thead {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }

  .table tr {
    display: grid;
    padding: var(--space-3);
    border-bottom: 1px solid var(--color-border);
  }

  .table td {
    display: grid;
    grid-template-columns: 96px 1fr;
    gap: var(--space-2);
    padding: 4px 0;
    border: 0;
  }

  .table td::before {
    color: var(--color-text-muted);
    font-weight: 700;
    content: attr(data-label);
  }
}
```

- [ ] **Step 4: Маршрут**

`web/src/App.jsx` — у `<Routes>` перед `<Route element={<MapLayout />}>`:
```jsx
<Route path="/admin" element={<AdminPage />} />
```

- [ ] **Step 5: Перевірка**

Run: `npm run test:web` → PASS.
Браузер (сервер з `ADMIN_TOKEN=smoke-token`): `/admin` → вхід → додати заклад на карті в іншій вкладці → оновити `/admin` → «Схвалити» → «Так» → на карті мітка стала суцільною; вкладка «Реєстрації» показує заявки з F3; на 375px таблиця стає картками.

---

### Task 17: Прохід чекліста якості

**Files:**
- Modify: файли компонентів, у яких знайдено проблеми (кожне виправлення — з тестом, якщо зачіпає логіку)
- Create: `docs/tech/2026-09-17-frontend-qa-pass.md`

**Interfaces:**
- Consumes: зібраний застосунок (`npm run build`), сервер на MemoryStore з `ADMIN_TOKEN=smoke-token`.
- Produces: звіт `docs/tech/2026-09-17-frontend-qa-pass.md` (англійською): що перевірено, що знайдено, що виправлено, що свідомо лишено.

- [ ] **Step 1: Підготовка**

```bash
npm run build
PORT=3999 MONGODB_URI= ADMIN_TOKEN=smoke-token node src/server.js
```
(у фоні; чекати `/api/health`). Скіл `claude-in-chrome`: завантажити інструменти одним викликом (`tabs_context_mcp`, `tabs_create_mcp`, `navigate`, `computer`, `read_page`, `resize_window`, `javascript_tool`, `read_console_messages`).

- [ ] **Step 2: Адаптивність**

Для кожної ширини 375×812, 768×1024, 1024×768, 1440×900 (`resize_window`) і кожного маршруту `/`, `/institutions/khpi`, `/institutions/khpi/robotics`, `/courses/khpi-robotics-arduino`, `/add`, `/quiz`, `/admin`:
- скріншот;
- `javascript_tool`: `document.documentElement.scrollWidth <= window.innerWidth` → має бути `true`;
- жодних перекриттів панелі й кнопок карти, текст не обрізається.

- [ ] **Step 3: Клавіатура та фокус**

На 1440×900, `/`: Tab проходить пошук → «Фільтри» → «Скинути» (якщо є) → «Поруч зі мною» → «Підібрати курс» → «Додати заклад» → пункти списку; фокус видно на кожному елементі; Enter на пункті відкриває картку; у діалогах Tab не виходить за межі, Esc закриває; після закриття фокус повертається на кнопку, що відкрила діалог (нативний `<dialog>`).

- [ ] **Step 4: Контраст**

`javascript_tool` на `/institutions/khpi?price=free` (є приглушені напрямки) і `/institutions/itstep-kharkiv/game-dev?format=online` (приглушена картка): порахувати контраст тексту `.muted`-елементів з урахуванням `opacity` (ефективний колір = змішування з білим). Якщо < 4.5:1 — замінити `opacity: 0.6` на `color: var(--color-text-muted)` для тексту і `opacity` лише для кольорової смуги/іконок.

- [ ] **Step 5: Консоль і мережа**

`read_console_messages` з `pattern: "Content Security Policy|Error|Warning"` після проходу всіх маршрутів → порожньо. Перезавантаження кожного маршруту (deep link) відкриває той самий екран.

- [ ] **Step 6: Сценарії демо**

1. Олена (375px): «Підібрати курс» → 10–13, «Будувати», «Наживо», «Підійдуть і платні», «Не важливо» → «Показати на карті» → мітка ХПІ пульсує → ХПІ → «Робототехніка» → «Робототехніка на Arduino» → «Зареєструватися» → успіх.
2. Ірина (1440px): «Додати заклад» → точка на Пушкінській → форма → картка «На модерації» → `/admin` → «Схвалити» → на карті суцільне кільце.
3. Порожні стани: фільтр «Мистецтво» + «18+ років» → «Нічого не знайдено» → «Скинути фільтри».

- [ ] **Step 7: Звіт і перевірка**

Записати `docs/tech/2026-09-17-frontend-qa-pass.md` (дата, ширини, знахідки з файлами, виправлення, лишені компроміси, розмір бандла з виводу `vite build`).
Run: `npm test && npm run test:web && npm run build` → усе зелене.

---

### Task 18: Документація та скіл `frontend`

**Files:**
- Create: `.claude/skills/frontend/SKILL.md`
- Modify: `CLAUDE.md`, `README.md`, `.claude/README.md`, `.claude/skills/deploy-render/SKILL.md`, `.claude/skills/api-architecture/SKILL.md`

- [ ] **Step 1: `.claude/skills/frontend/SKILL.md`**

````markdown
---
name: frontend
description: Architecture and procedures for the Academy Locator React frontend in web/ (map, panels, filters in the URL, forms, quiz, admin). Use when changing anything under web/, adding a screen or panel, touching the map or markers, writing frontend tests, or debugging the built app served from public/.
---

# Frontend

## Shape

- `web/` is the Vite root; `npm run build` writes to `public/`, which Express serves with an SPA fallback
  (`src/app.js`). `public/` is git-ignored and built on Render (`npm ci --include=dev && npm run build`).
- One `package.json` for backend and frontend. Frontend never imports from `src/`; copy tiny helpers
  (see `web/src/map/geo.js`).
- Dev loop: `npm run dev` (API) + `npm run dev:web` (Vite on :5173, proxies `/api`; override with
  `API_PROXY_TARGET`). CSP applies only to the built app — check CSP in the browser against `npm run build` + `npm start`.

## State model

- **The URL is the state.** Route = screen (`/`, `/institutions/:id`, `/institutions/:id/:slug`,
  `/courses/:courseId`, `/add`, `/quiz`, `/admin`). Query = filters (`q`, `category`, `direction`, `age`, `price`,
  `format`, `type`, `near`). Pure helpers in `web/src/state/filters.js`; hook `useFilters()`; keep filters on every
  in-app link with `useLinkTo()`.
- `MetaProvider` loads `/api/meta` once; use `useMeta()` for labels, age groups, STEAM colors
  (`colorByCode`) — never hardcode category colors.
- `MapProvider` (inside `MapLayout`) owns markers (`/api/institutions` with current filters), `selectedId`,
  quiz highlight (auto-clears when filters change), `pickPoint` for `/add`, geolocation (`enableNear`,
  `locate`) and `refreshCatalog()` after writes. Panels call `useSelectedInstitution(id)` so the map focuses.
- Data fetching: `useApi(path, { query, headers, refreshKey, keepPreviousData, enabled })`; writes use
  `request()` directly. Errors arrive as `ApiError { code, message, details }`; map `details` to fields with
  `mapFieldErrors`.

## Procedure: add a panel (screen)

1. Spec and plan approved (CLAUDE.md hard rule 1).
2. Pure logic first in a `*.js` module with a `*.spec.js` (formatting, payloads, mapping).
3. Panel component in `web/src/panels/` (or feature folder) using `shared` styles from `Panels.module.css`:
   loading → `Skeleton` (pass `slow`), `NOT_FOUND` → `NotFoundPanel`, other errors → `ErrorState` with `reload`.
4. Route in `web/src/App.jsx` inside `<Route element={<MapLayout />}>` (or outside for full pages like `/admin`).
5. Component spec: `renderWithProviders(<MapProvider><Panel /></MapProvider>, { route, path })` + `mockFetch({...})`
   from `web/src/test/fixtures.jsx`. Add fixtures there in the real API shape.
6. `npm run test:web`, then check the flow in a browser at 375px and 1440px.

## Conventions

- Named exports; CSS Modules next to components; tokens from `web/src/styles/tokens.css`.
- UI text Ukrainian with `’`; icons from `lucide-react` only (quiz emoji are mapped to icons in `quiz/icons.js`).
- Interactive chips/options are `<button aria-pressed>`; dialogs use `ui/Dialog.jsx` (native `<dialog>`).
- Marker HTML is built as a string for Leaflet — every data string goes through `escapeHtml`
  (submission names are public input).
- Desktop breakpoint `min-width: 1024px` via `useMediaQuery(DESKTOP_QUERY)`; mobile uses the bottom sheet
  (`layout/Panel.jsx`, snaps `peek|half|full`, `useSheet().setSnap`).

## Testing limits

- Leaflet is not rendered in jsdom tests; `MapView` is verified in the browser. If a test renders `App` or
  `MapLayout`, mock it: `vi.mock('./map/MapView.jsx', () => ({ MapView: () => null }))`.
- jsdom polyfills for `<dialog>` and `matchMedia` live in `web/src/test/setup.js` (`matchMedia` → mobile layout).
- Browser checks: skill `verify-api` to run the server, then `claude-in-chrome`; read the console for CSP errors.
````

- [ ] **Step 2: `CLAUDE.md`**

У розділі **Project** замінити речення про фронтенд на:
```markdown
Frontend: React + Vite in `web/`, built into `public/` and served by the same Express app.
```
У таблицю **Commands** додати рядки:
```markdown
| `npm run dev:web` | Vite dev server on :5173, proxies `/api` to `npm run dev` |
| `npm run test:web` / `npm run build` | frontend tests (Vitest) / build into `public/` |
```
У таблицю **Where the knowledge lives** додати рядок після `api-architecture`:
```markdown
| anything under `web/`: panels, map, filters in URL, forms, frontend tests | skill `frontend` |
```
Перевірити: `wc -c CLAUDE.md` — не більше ~3.3 КБ; якщо більше — скоротити формулювання, не додаючи нових правил.

- [ ] **Step 3: `README.md`**

Після розділу «Запуск» додати:
```markdown
## Фронтенд

React + Vite у `web/`, збирається в `public/` і віддається тим самим сервером.

| Команда | Що робить |
|---|---|
| `npm run dev` + `npm run dev:web` | API на :3000 і фронтенд на http://localhost:5173 (проксі `/api`) |
| `npm run build` | збірка в `public/` (git-ignored) |
| `npm run test:web` | тести фронтенду (Vitest) |

Екрани: карта з фільтрами й пошуком, картка закладу, курси напрямку, курс з реєстрацією, «Додати заклад»,
квіз «Що обрати дитині?», модерація `/admin` (токен — `ADMIN_TOKEN`).
```
У розділі «Деплой на Render» до кроку 3 додати: «Build Command уже задано в `render.yaml`: `npm ci --include=dev && npm run build`.»

- [ ] **Step 4: Скіли та карта інфраструктури**

`.claude/README.md` — у таблицю скілів додати:
```markdown
| `frontend` | web/: state in URL, providers, panels, forms, tests with mocked fetch, Leaflet limits | — |
```
і видалити абзац «Candidates for later: a `frontend` skill …».

`.claude/skills/deploy-render/SKILL.md` — розділ «Frontend on the same service» замінити на:
```markdown
## Frontend on the same service

- Render builds it: `npm ci --include=dev && npm run build` (dev dependencies are needed for Vite even with
  `NODE_ENV=production`).
- `src/app.js` serves `public/` (hashed `assets/` cached as immutable, `index.html` no-cache) and falls back to
  `index.html` for client routes; `/api/*` is never intercepted.
- CSP is helmet's default plus `img-src https://*.basemaps.cartocdn.com` for map tiles. Fonts and Leaflet are
  bundled, so no CDN entries. A new external resource needs a CSP directive and a check in the browser console.
```

`.claude/skills/api-architecture/SKILL.md` — у блок «Layers» після рядка `src/app.js` додати:
```
                  also serves public/ (built frontend) with an SPA fallback; createApp accepts publicDir for tests
```

- [ ] **Step 5: Кінець фази**

Run: `npm test && npm run test:web && npm run build && node .claude/skills/seed-data/check-seed.mjs` → усе зелене.
Скіл `verify-api`: `smoke.mjs` проти зібраного сервера → усі PASS.
Зупинитися: **«Фаза F5 готова, перевірте модерацію, звіт якості та документацію»** (результати тестів, розмір бандла, посилання на `docs/tech/2026-09-17-frontend-qa-pass.md`).
