# Academy Locator — бекенд MVP (архітектура + специфікація API)

## Context
MVP EdTech-платформи «Academy Locator» для презентації: інтерактивна карта STEAM-закладів Харкова.
Ланцюжок: Карта → Заклад → STEAM-напрямок → Курс → Деталі → Реєстрація, плюс форма «Додати заклад»
і кілер-фічі (STEAM-кільце на мітках, квіз-підбір). Працюємо по черзі: спершу повністю робочий
бекенд (API), потім фронтенд (UI/UX Pro Max). Деплой — Render. Папка `D:\Steam-in-Maps` порожня.
Цей документ — на затвердження ендпоінтів; коду сервера ще немає.

Шлях: **архітектурний** (новий проєкт).

---

## 1. Архітектура

**Стек:** Node.js 20 (ESM) · Express 4 · zod (валідація) · helmet, cors, compression, express-rate-limit ·
mongodb (офіційний драйвер) · тести: `node:test` + supertest.

**Один Render Web Service** віддає і `/api/*`, і (пізніше) зібраний фронтенд із `public/`.
Один URL, без CORS-проблем, один деплой.

```
academy-locator/
  package.json            engines.node >=20, scripts: start, dev, test, seed
  render.yaml             Blueprint: web service, healthCheckPath /api/health
  .env.example            PORT, MONGODB_URI, ADMIN_TOKEN, CORS_ORIGIN
  src/
    server.js             читає config, обирає store, слухає PORT
    app.js                createApp({ store }) — без listen, для тестів
    config.js
    routes/               meta · institutions · courses · search · recommendations · submissions · admin
    services/
      filters.js          чисті функції: parseFilters, courseMatches(course, filters)
      catalog.js          збирає відповіді: маркери, картка закладу, списки курсів
      steamProfile.js     підрахунок профілю S/T/E/A/M для кільця
      recommend.js        скоринг квізу (топ-3)
      geo.js              haversine, distanceKm
    store/
      index.js            MONGODB_URI задано → MongoStore, інакше MemoryStore
      memoryStore.js      дані з data/seed у пам'яті (тести, локальна розробка, fallback)
      mongoStore.js       MongoDB Atlas; автосід, якщо колекції порожні
    validation/schemas.js zod-схеми query/body
    middleware/           errorHandler · adminAuth · rateLimits
  data/seed/              city.json · categories.json · directions.json · institutions.json · courses.json · quiz.json
  scripts/seed.js         `npm run seed [-- --reset]` у Mongo
  public/                 місце для фронтенду (наступний етап)
  tests/                  unit (filters, recommend) + API (supertest на MemoryStore)
```

**Принцип:** вся логіка фільтрації — у `services/` над звичайними масивами. Store лише віддає/зберігає
документи. Даних мало (десятки закладів, сотні курсів), тому і MemoryStore, і MongoStore просто
віддають колекції, а фільтрує один і той самий код — однакова поведінка в тестах і на проді.

**Інтерфейс Store:**
`listInstitutions() · getInstitution(id) · listCourses() · getCourse(id) · createInstitution(doc) ·
updateInstitutionStatus(id, status) · createRegistration(doc) /* атомарно зменшує seatsLeft */ ·
listRegistrations() · getReference() /* city, categories, directions, quiz */`

## 2. Зберігання даних — рекомендація

**MongoDB Atlas M0 (безкоштовний) + MemoryStore як fallback.**

| Варіант | Чому ні / так |
|---|---|
| JSON-файл на диску Render | Диск ефемерний; на free-тарифі сервіс засинає → заявки й нові заклади зникають між підготовкою і показом |
| Render Postgres (free) | Безкоштовна БД має обмежений термін життя — ризик для демо через кілька тижнів |
| Supabase Postgres | Добре, але free-проєкт ставиться на паузу при неактивності; реляційна схема надлишкова для MVP |
| **MongoDB Atlas M0** ✅ | Не залежить від Render-диска; документи 1:1 як seed JSON; не треба міграцій |

Каталог (заклади/курси) сідиться з `data/seed`; у БД зберігаються й записи, що створюються
(заявки на заклади, реєстрації на курси). Без `MONGODB_URI` застосунок усе одно запускається на
MemoryStore — деплой «в один клік» працює навіть до налаштування Atlas.
ID — читабельні рядки (`hnpu`, `khpi-robotics-arduino`) для seed; `crypto.randomUUID()` для нових записів.
Поле Mongo `_id` назовні не віддаємо.

## 3. Модель даних

**City** `{ id:"kharkiv", name, center:{lat,lng}, zoom, bounds }`
**SteamCategory** `{ code:"S|T|E|A|M", name, color, icon }`
**Direction** `{ id, slug, name, categoryCode, keywords[] }`
**Institution**
```
id, name, shortName, type: university|academy|private_school|center,
shortDescription, description, logoUrl|null, address, city, lat, lng,
website, phone, email, hasShelter: true|false|null (null = не вказано),
declaredDirectionIds[] (для заявок без курсів), status: approved|pending|rejected,
source: seed|submission, createdAt
```
**Course**
```
id, institutionId, directionId, title, shortDescription, description, audience,
ageMin, ageMax, level: beginner|intermediate|advanced, format: offline|online|hybrid,
price (UAH, 0 = безкоштовно), priceUnit: month|course, durationText,
scheduleText, scheduleDays["mon".."sun"], startDate (ISO), language,
seatsTotal|null, seatsLeft|null
```
**Registration** `{ id, courseId, name, contact, participantAge|null, comment|null, consent:true, createdAt }`

Реєстрація — **внутрішня форма**, а не зовнішнє посилання: курси вигадані, тож лінк на реальний сайт
закладу вводив би в оману. Бонус для демо — лічильник «лишилось N місць» зменшується наживо.

## 4. Специфікація API

Базовий префікс `/api`. JSON, UTF-8. Пагінації немає (малий обсяг) — додамо, якщо знадобиться.

### Спільні параметри фільтрів (query)
Застосовуються до **курсів**; заклад повертається, якщо має ≥1 відповідний курс
(коли жоден фільтр курсу не заданий — повертаються всі заклади, включно з тими, де курсів немає).

| Параметр | Приклад | Семантика |
|---|---|---|
| `q` | `робото` | пошук без регістру по: назва курсу, назва/keywords напрямку, назва закладу |
| `category` | `T,E` | коди STEAM, АБО |
| `direction` | `robotics,3d-modeling` | slug-и напрямків, АБО |
| `ageFrom`,`ageTo` | `10`,`13` | перетин діапазонів: `course.ageMin <= ageTo && course.ageMax >= ageFrom` |
| `price` | `free` \| `paid` | `price == 0` / `> 0` |
| `format` | `offline,hybrid` | АБО |
| `type` | `university` | тип закладу, АБО |
| `lat`,`lng` | `49.99`,`36.23` | додає `distanceKm`, сортування за відстанню |

Невалідні значення → `400 VALIDATION_ERROR`.

### Довідники і сервіс
**`GET /api/health`** → `200 { status:"ok", store:"mongo|memory", uptimeSec }`

**`GET /api/meta`** — один запит для старту фронтенду
```json
{ "city": { "id":"kharkiv","name":"Харків","center":{"lat":49.9935,"lng":36.2304},"zoom":13 },
  "categories": [{ "code":"T","name":"Технології","color":"#2F80ED","icon":"cpu" }],
  "directions": [{ "id":"robotics","slug":"robotics","name":"Робототехніка","categoryCode":"T" }],
  "institutionTypes": [{ "id":"university","name":"Університет" }],
  "formats": [{ "id":"offline","name":"Офлайн" }],
  "ageGroups": [{ "id":"6-9","ageFrom":6,"ageTo":9,"name":"6–9 років" }],
  "dataNotice": "Заклади реальні; курси, розклади та ціни — демонстраційні." }
```

### Карта
**`GET /api/institutions`** + фільтри — легкі маркери і лічильник
```json
{ "summary": { "institutions": 3, "courses": 7 },
  "items": [{
    "id":"khpi","name":"Національний технічний університет «ХПІ»","shortName":"НТУ «ХПІ»",
    "type":"university","lat":49.9990,"lng":36.2480,"address":"вул. Кирпичова, 2",
    "status":"approved","courseCount":4,"matchedCourseCount":2,
    "steamProfile": { "S":0,"T":2,"E":2,"A":0,"M":0 },
    "distanceKm": 1.8 }] }
```
Статуси `approved` і `pending` повертаються (фронт малює бейдж «на модерації»); `rejected` — ні.
`steamProfile` рахується з усіх курсів закладу, для заявок без курсів — з `declaredDirectionIds`.

**`GET /api/institutions/:id`** + фільтри — картка закладу
```json
{ "institution": { "...всі поля закладу": "..." , "steamProfile": {} },
  "directions": [{
    "slug":"robotics","name":"Робототехніка","categoryCode":"T",
    "courseCount":1,"matchedCourseCount":1 }] }
```
`404 NOT_FOUND`, якщо немає або `rejected`.

**`GET /api/institutions/:id/directions/:slug/courses`** + фільтри
```json
{ "institution": { "id":"khpi","shortName":"НТУ «ХПІ»" },
  "direction": { "slug":"robotics","name":"Робототехніка","categoryCode":"T" },
  "items": [{ "id":"khpi-robotics-arduino","title":"Робототехніка на Arduino",
    "shortDescription":"…","ageMin":12,"ageMax":16,"format":"offline","price":1200,
    "priceUnit":"month","startDate":"2026-10-03","seatsLeft":3,"matchesFilters":true }] }
```
Повертає всі курси напрямку; `matchesFilters` дозволяє фронту підсвітити/відсортувати відповідні першими.

**`GET /api/courses/:id`** — деталі курсу
```json
{ "course": { "...всі поля курсу": "..." },
  "institution": { "id","name","shortName","address","lat","lng","phone","website" },
  "direction": { "slug","name","categoryCode" } }
```

### Пошук і квіз
**`GET /api/search/suggest?q=роб`** (мін. 2 символи) — автопідказки, до 5 у кожній групі
```json
{ "directions":[{ "slug":"robotics","name":"Робототехніка","categoryCode":"T" }],
  "institutions":[{ "id":"khpi","shortName":"НТУ «ХПІ»" }],
  "courses":[{ "id":"khpi-robotics-arduino","title":"Робототехніка на Arduino","institutionId":"khpi" }] }
```

**`GET /api/quiz`** — питання квізу «Що обрати дитині?» (4–5 питань; відповіді мапляться на вік,
категорії/напрямки, формат, ціну) із `data/seed/quiz.json`.

**`POST /api/recommendations`**
```json
// body
{ "age": 11, "interests": ["robotics","T"], "format": ["offline","hybrid"],
  "price": "any", "lat": 49.99, "lng": 36.23 }
// 200
{ "filters": { "ageFrom":11,"ageTo":11,"category":["T"],"direction":["robotics"],"format":["offline","hybrid"] },
  "items": [{ "course": { "id":"…","title":"…" }, "institution": { "id":"…","shortName":"…","lat":0,"lng":0 },
              "score": 0.92, "reasons": ["Підходить за віком","Ваш інтерес: Робототехніка","Офлайн"] }] }
```
Скоринг: вік (обов'язковий збіг) + збіг напрямку > збіг категорії + формат + ціна + близькість. Топ-3.
`filters` фронт застосовує до карти одним рухом.

### Записи
**`POST /api/courses/:id/registrations`** (rate limit)
```json
// body
{ "name":"Олена", "contact":"+380501234567", "participantAge":11, "comment":"", "consent":true }
// 201
{ "id":"…","courseId":"khpi-robotics-arduino","status":"received","seatsLeft":2 }
```
Помилки: `400 VALIDATION_ERROR` (contact — телефон або email; consent має бути `true`),
`404 NOT_FOUND`, `409 NO_SEATS` (seatsLeft = 0). Для `seatsLeft: null` місця не рахуються.

**`POST /api/institutions`** — «Додати заклад» (rate limit)
```json
// body
{ "name":"…","type":"private_school","address":"…","lat":50.0,"lng":36.2,
  "shortDescription":"…","website":"https://…","phone":"…","email":"…",
  "contactPerson":"Ірина","hasShelter":true,"declaredDirectionIds":["robotics"] }
// 201
{ "institution": { "id":"…","status":"pending", "...": "..." } }
```
Координати мають потрапляти в межі `city.bounds` Харкова, інакше `400`.

### Адмін (заголовок `X-Admin-Token: <ADMIN_TOKEN>`)
- **`GET /api/admin/submissions`** — заклади зі статусом `pending`
- **`PATCH /api/admin/institutions/:id`** `{ "status":"approved|rejected" }`
- **`GET /api/admin/registrations`** — усі реєстрації (з назвою курсу й закладу)

Без/з неправильним токеном → `401 UNAUTHORIZED`; якщо `ADMIN_TOKEN` не задано — адмін-роути вимкнені (`404`).

### Формат помилок
```json
{ "error": { "code":"VALIDATION_ERROR", "message":"Некоректні параметри", "details":[{ "path":"ageFrom","message":"…" }] } }
```
Коди: `VALIDATION_ERROR` 400 · `UNAUTHORIZED` 401 · `NOT_FOUND` 404 · `NO_SEATS` 409 · `RATE_LIMITED` 429 · `INTERNAL` 500.

## 5. Seed-дані (Харків)

**STEAM-напрямки (довідник):**
S — `natural-science` Природничі досліди, `astronomy` Астрономія ·
T — `programming` Програмування, `robotics` Робототехніка, `game-dev` Розробка ігор ·
E — `3d-modeling` 3D-моделювання та друк, `electronics` Електроніка ·
A — `digital-design` Цифровий дизайн, `animation` Анімація ·
M — `olympiad-math` Олімпіадна математика, `data-analysis` Аналіз даних

**Заклади (реальні) і курси (вигадані):**

| Заклад | Тип | Курси (вік · формат · ціна) |
|---|---|---|
| ХНПУ ім. Г. С. Сковороди, вул. Алчевських, 29 | university | Юний природодослідник (10–13 · офлайн · безкошт.) · Олімпіадна математика (14–17 · гібрид · безкошт.) · Цифрова ілюстрація для підлітків (13–17 · офлайн · 900/міс) |
| НТУ «ХПІ», вул. Кирпичова, 2 | university | Робототехніка на Arduino (12–16 · офлайн · 1200/міс · 3 місця) · Python для старшокласників (14–17 · онлайн · безкошт.) · Інженерне 3D-моделювання у Fusion 360 (15–18 · гібрид · 1500/міс) · Електроніка для початківців (12–15 · офлайн · безкошт.) |
| Харківський палац дитячої та юнацької творчості, вул. Сумська, 37 | center | LEGO-конструювання (7–10 · офлайн · безкошт.) · Астрономічний гурток (10–15 · офлайн · безкошт.) · Мультиплікація (9–14 · офлайн · безкошт.) |
| Комп'ютерна Академія ITSTEP, харківська філія | academy (приватна) | Scratch: перші ігри (8–11 · гібрид · 1600/міс) · Unity: 3D-ігри (12–16 · онлайн · 1900/міс) · Аналіз даних з нуля (18+ · онлайн · 2400/міс) |

Разом 4 заклади, 13 курсів, усі 5 категорій STEAM. Усі 4 типи фільтрів дають помітно різні результати.
`logoUrl: null` (фронт малює ініціали — без використання чужих логотипів), `hasShelter: null` для
реальних закладів (не вигадуємо дані про укриття), `source: "seed"`.

**Приклад записів:**
```json
// institutions.json
{ "id":"hnpu","name":"Харківський національний педагогічний університет імені Г. С. Сковороди",
  "shortName":"ХНПУ ім. Г. С. Сковороди","type":"university",
  "shortDescription":"Педагогічний університет з природничими, математичними та мистецькими факультетами.",
  "description":"…","logoUrl":null,"address":"вул. Алчевських, 29, Харків","city":"kharkiv",
  "lat":50.0027,"lng":36.2372,"website":"https://hnpu.edu.ua","phone":null,"email":null,
  "hasShelter":null,"declaredDirectionIds":[],"status":"approved","source":"seed",
  "createdAt":"2026-09-17T00:00:00Z" }

// courses.json
{ "id":"hnpu-young-naturalist","institutionId":"hnpu","directionId":"natural-science",
  "title":"Юний природодослідник: лабораторія вихідного дня",
  "shortDescription":"Досліди з біології та хімії в університетській лабораторії.",
  "description":"…","audience":"Школярі 5–8 класів, яким цікаво, як влаштований світ",
  "ageMin":10,"ageMax":13,"level":"beginner","format":"offline","price":0,"priceUnit":"course",
  "durationText":"8 тижнів, 1 заняття на тиждень","scheduleText":"Субота, 11:00–12:30",
  "scheduleDays":["sat"],"startDate":"2026-10-03","language":"uk","seatsTotal":15,"seatsLeft":6 }
```
Адреси, сайти й координати реальних закладів (особливо філії ITSTEP) — **звірити з відкритими
джерелами на етапі реалізації**; координати у прикладі наближені.

## 6. Render
`render.yaml`: `type: web`, `runtime: node`, `plan: free`, `buildCommand: npm ci`,
`startCommand: npm start`, `healthCheckPath: /api/health`, envVars: `MONGODB_URI` (sync:false),
`ADMIN_TOKEN` (generateValue:true), `CORS_ORIGIN` (опційно). Порт — з `process.env.PORT`.
Нагадування: free-сервіс засинає — відкрити URL за кілька хвилин до показу.

## 7. Наступні кроки після затвердження
1. Зберегти цей дизайн у `docs/superpowers/specs/2026-09-17-academy-locator-backend-design.md`, `git init` + коміт.
2. Скіл writing-plans → покроковий план реалізації (TDD).
3. Реалізація: seed-дані (зі звіркою адрес) → services + unit-тести → MemoryStore + роути + API-тести → MongoStore + seed-скрипт → render.yaml.

## Verification
- `npm test`: unit-тести `filters`/`recommend` (перетин віку, АБО-семантика, free/paid, відстань) і API-тести
  на MemoryStore для кожного ендпоінту, включно з 400/401/404/409.
- `npm run dev` без `MONGODB_URI` → пройти демо-ланцюжок curl-ами:
  `/api/meta` → `/api/institutions?direction=robotics&ageFrom=10&ageTo=13` → `/api/institutions/khpi` →
  `/api/institutions/khpi/directions/robotics/courses` → `/api/courses/khpi-robotics-arduino` →
  `POST …/registrations` (seatsLeft 3→2) → `POST /api/institutions` → видно з `status:"pending"` → `PATCH` адміном.
- Те саме з `MONGODB_URI` на Atlas M0; перезапуск сервера → заявки й реєстрації збереглися.
- Деплой на Render → `/api/health` повертає `store:"mongo"`.
