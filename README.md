# Academy Locator

Інтерактивна карта STEAM-освіти Харкова (MVP). Node.js + Express, MongoDB Atlas з фолбеком на пам'ять;
фронтенд — React + Vite + Leaflet.
Заклади реальні; курси, розклади, ціни та кількість місць — демонстраційні.

## Запуск

```bash
npm install
cp .env.example .env     # MONGODB_URI можна лишити порожнім — тоді дані в пам'яті
npm run dev              # http://localhost:3000/api/health
```

| Команда | Що робить |
|---|---|
| `npm start` / `npm run dev` | сервер (dev — з перезапуском при змінах) |
| `npm test` | усі тести без бази (Mongo-тести пропускаються) |
| `npm run test:mongo` | те саме + тести на MongoDB з `.env` (окремі бази `*_test`, `*_seedtest`, видаляються) |
| `npm run seed` | оновити каталог у MongoDB з `data/seed` (заявки й реєстрації зберігаються) |
| `npm run seed -- --reset` | очистити заклади, курси, реєстрації й залити seed з нуля — перед показом |

Сервер при старті сам заливає seed у порожні колекції, тож `npm run seed` потрібен лише для оновлення даних.

## Фронтенд

React + Vite у `web/`, збирається в `public/` (не в git) і віддається тим самим сервером.

| Команда | Що робить |
|---|---|
| `npm run build` → `npm start` | зібрана версія на http://localhost:3000 — як на Render |
| `npm run dev` + `npm run dev:web` | API на :3000 і фронтенд з автооновленням на http://localhost:5173 |
| `npm run test:web` | тести фронтенду (Vitest) |

Екрани: карта з фільтрами й пошуком, картка закладу, курси напрямку, курс з реєстрацією, «Додати заклад»,
квіз «Що обрати дитині?», модерація `/admin` (вхід за `ADMIN_TOKEN`).
Підкладка карти — OpenStreetMap; «Поруч зі мною» працює лише на HTTPS або localhost.

## Змінні оточення

| Змінна | За замовчуванням | |
|---|---|---|
| `PORT` | `3000` | Render задає сам |
| `MONGODB_URI` | — | порожньо або база недоступна → MemoryStore (зміни до перезапуску) |
| `MONGODB_DB` | `academy_locator` | |
| `ADMIN_TOKEN` | — | порожньо → `/api/admin/*` вимкнені |
| `CORS_ORIGIN` | — | список доменів через кому, якщо фронтенд на іншому домені |
| `RATE_LIMIT_MAX` / `_WINDOW_MS` | `300` / 15 хв | усі запити до `/api` з однієї IP |
| `WRITE_RATE_LIMIT_MAX` / `_WINDOW_MS` | `30` / 15 хв | POST-запити з однієї IP |

## API

Помилки: `{ "error": { "code", "message", "details?" } }` —
`VALIDATION_ERROR` 400 · `UNAUTHORIZED` 401 · `NOT_FOUND` 404 · `NO_SEATS` 409 · `RATE_LIMITED` 429 · `INTERNAL` 500.

| Метод | Шлях | Призначення |
|---|---|---|
| GET | `/api/health` | статус і тип сховища |
| GET | `/api/meta` | місто, категорії, напрямки, типи, формати, вікові групи, рівні |
| GET | `/api/quiz` | питання квізу «Що обрати дитині?» |
| GET | `/api/institutions` | маркери карти + лічильник (фільтри нижче) |
| GET | `/api/institutions/:id` | картка закладу з напрямками |
| GET | `/api/institutions/:id/directions/:slug/courses` | курси напрямку в закладі |
| GET | `/api/courses/:id` | деталі курсу |
| GET | `/api/search/suggest?q=` | автопідказки (≥ 2 символи) |
| POST | `/api/courses/:id/registrations` | реєстрація на курс |
| POST | `/api/institutions` | заявка «Додати заклад» (статус `pending`) |
| POST | `/api/recommendations` | топ-3 курси за відповідями квізу + фільтри для карти |
| GET | `/api/admin/submissions` | заявки на модерацію ¹ |
| PATCH | `/api/admin/institutions/:id` | `{ "status": "approved" \| "rejected" \| "pending" }` ¹ |
| GET | `/api/admin/registrations` | усі реєстрації ¹ |

¹ заголовок `X-Admin-Token: <ADMIN_TOKEN>`.

**Фільтри** (`/api/institutions`, картка, курси напрямку): `q`, `category=T,E`, `direction=robotics`,
`ageFrom`, `ageTo`, `price=free|paid`, `format=offline,hybrid`, `type=university`, `lat`+`lng`.
Списки — через кому або повтором параметра; всередині списку АБО, між фільтрами І.

Детальна специфікація: [`docs/specs/2026-09-17-academy-locator-backend-design.md`](docs/specs/2026-09-17-academy-locator-backend-design.md).

## Деплой на Render

1. **MongoDB Atlas → Network Access:** додати `0.0.0.0/0` — у Render free немає статичних IP.
2. Запушити проєкт у GitHub (`render.yaml` — у корені репозиторію).
3. Render → **New → Blueprint** → вибрати репозиторій → ввести `MONGODB_URI`. Build Command уже в `render.yaml`: `npm ci --include=dev && npm run build`.
4. Після деплою: `https://<сервіс>.onrender.com/api/health` має повернути `"store": "mongo"`, а `https://<сервіс>.onrender.com/` — карту.
5. `ADMIN_TOKEN` згенерується автоматично — його видно в Dashboard → Environment.

Free-сервіс засинає після ~15 хв без запитів і прокидається до хвилини — відкрийте `/api/health` перед показом.
