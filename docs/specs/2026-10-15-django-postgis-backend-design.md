# Academy Locator — перенесення бекенду на Django + PostgreSQL/PostGIS

## Context

Відмовляємося від одного Express-застосунку на Render. Цільовий стек:

- **Фронтенд:** React (наявний `web/`) на S3 + CloudFront. Стилістика й логіка геоміток зберігаються обов'язково.
- **Бекенд:** Django + PostgreSQL/PostGIS, вбудована Django admin для модерації заявок.
- **Хостинг:** варіант A — одна машина EC2/Lightsail з Docker (Django + Postgres/PostGIS). Бекапи — на команді.
  Деплой не раніше ніж за ~2 місяці.

Роботу розбито на підпроєкти, кожен має власні spec → план → реалізацію:

1. **Django + PostGIS бекенд** — цей документ.
2. Фронтенд на S3 + CloudFront: базовий URL API, CSP і `Referrer-Policy` на CloudFront, прибрати `/admin`.
3. AWS-інфраструктура й деплой (варіант A).
4. Кабінети шкіл, CRUD через REST для адміністратора — пізніше, окремо.

Шлях: **архітектурний**.

### Що погоджено

- HTTP-контракт `/api/*` зберігається 1:1 (шляхи, поля, порядок, формат помилок), крім `/api/admin/*`
  (видаляється) і значення `store` у `/api/health`.
- CRUD — лише в Django admin (варіант A). Публічне API як зараз: читання, заявка закладу, запис на курс, квіз.
- Дані з `data/seed/*.json` імпортуються в нормалізовану БД; після імпорту джерело правди — база.
- Стек бекенду — Django + Django REST Framework; локально все працює в Docker Compose.
- Неперевірені значення про реальні заклади лишаються `null` (скіл `seed-data`).

### Критерії успіху

- `docker compose up` піднімає PostGIS і Django; `import_seed` заповнює БД.
- Усі «золоті» відповіді, записані з нинішнього Node API, збігаються з відповідями Django.
- `npm run test:web` зелений; фронтенд через Vite-проксі працює з Django без змін у стилях і геомітках.
- Модератор у Django admin схвалює/відхиляє заявки та створює, редагує й видаляє заклади, курси, довідники, квіз.
- Node-бекенд, Mongo і Render видалені з репозиторію; `CLAUDE.md`, `README.md` і скіли описують новий стек.

### Поза межами

Деплой, S3/CloudFront, CORS для окремого домену, бекапи, облікові записи шкіл, REST CRUD для адміна,
перенесення фільтрів у SQL.

---

## 1. Структура проєкту

```
academy-locator/
  backend/
    manage.py
    config/                settings, urls (лише /api/ та /admin/)
    catalog/
      models.py            City, Category, Direction, Institution, Course, Registration
      choices.py           УСІ enum-и та українські підписи (аналог schemas.js)
      selectors.py         запити ORM/PostGIS → звичайні списки словників
      services/            чиста логіка: filters, catalog, recommend, steam_profile, text (сортування uk)
      api/                 DRF: serializers, views, urls, exceptions, throttling
      admin.py
      management/commands/import_seed.py
    quiz/                  Quiz → QuizQuestion → QuizOption
    tests/                 pytest + golden/
    Dockerfile
    requirements.txt
  docker-compose.yml       db (postgis/postgis:16) + api (Django :8000)
  web/                     React — без змін; Vite проксі /api → :8000
  data/seed/*.json         вхід для import_seed
```

`catalog/services/` чисті: не імпортують Django, DRF, моделі чи `selectors`. Отримують і повертають списки
словників у тій самій формі (camelCase-ключі), що й нинішні `src/services/*`.

Під час роботи Node-бекенд (`src/`, `tests/`) живе паралельно і видаляється в кінці (розділ 7).

## 2. Модель даних

| Модель | Поля | Обмеження й примітки |
|---|---|---|
| `City` | `id` (CharField PK, `"kharkiv"`), `name`, `center: PointField(4326)`, `bounds: PolygonField(4326)`, `zoom`, `data_notice` | `/api/meta` віддає `bounds` як `{south, west, north, east}` з `bounds.extent` |
| `Category` | `code` (PK, S/T/E/A/M), `name`, `name_en`, `color`, `icon` | |
| `Direction` | `id` (slug, PK), `name`, `category` FK, `keywords: ArrayField(CharField)` | у відповідях `slug == id` |
| `Institution` | `id` (CharField PK), `name`, `short_name`, `type`, `short_description`, `description`, `logo_url`, `address`, `city` FK, `location: PointField(4326)` + GiST, `website`, `phone`, `email`, `contact_person` (приватне), `has_shelter` (null), `declared_directions` M2M → Direction, `status`, `source`, `created_at` | нові записи: `id` = UUID-рядок, `status="pending"`, `source="submission"` |
| `Course` | `id` (CharField PK), `institution` FK, `direction` FK, `title`, `short_description`, `description`, `audience`, `age_min`, `age_max`, `level`, `format`, `price`, `price_unit`, `duration_text`, `schedule_text`, `schedule_days: ArrayField`, `start_date`, `language`, `seats_total`, `seats_left` | CHECK: `age_min ≤ age_max`; `seats_*` обидва null або обидва числа, `0 ≤ seats_left ≤ seats_total`; у `clean()`: `start_date` припадає на день із `schedule_days` |
| `Registration` | `id` (UUID), `course` FK (PROTECT), `name`, `contact`, `participant_age`, `comment`, `consent`, `created_at` | заклад — через `course` |
| `Quiz` | `id` (CharField PK), `title`, `subtitle` | |
| `QuizQuestion` | `quiz` FK, `key` (`"age"`, …), `order`, `title`, `subtitle`, `type` (single/multi), `required` | унікальні (`quiz`, `key`) |
| `QuizOption` | `question` FK, `key`, `order`, `label`, `emoji`, `value: JSONField` | `value` різної форми (вік, інтереси, формат) |

- `type`, `status`, `source`, `level`, `format`, `price_unit`, дні тижня — `TextChoices` у `catalog/choices.py`.
  Там само `AGE_GROUPS`, `PRICE_OPTIONS` та підписи для `/api/meta`.
- Відповіді API віддають `lat`/`lng` окремими полями, як зараз.
- Повний перелік полів відповідей береться з наявного коду (`src/services/catalog.js`) і фіксується «золотими» тестами.

## 3. API

### Ендпоінти

| Метод і шлях | Поведінка |
|---|---|
| `GET /api/health` | `{ status: "ok", store: "postgres", uptimeSec }` |
| `GET /api/meta` | довідники з БД, `Cache-Control: public, max-age=300` |
| `GET /api/quiz` | квіз з БД, той самий `Cache-Control` |
| `GET /api/institutions` | маркери, `summary`, `steamProfile`, `distanceKm` при `near` (сортування за відстанню) |
| `POST /api/institutions` | заявка закладу → 201 `{ institution }` без `contactPerson` |
| `GET /api/institutions/:id` | картка закладу з урахуванням фільтрів; `rejected` → 404 |
| `GET /api/institutions/:id/directions/:slug/courses` | курси напряму; 404 «Заклад не знайдено» / «Напрямок не знайдено» |
| `GET /api/courses/:id` | деталі курсу |
| `POST /api/courses/:id/registrations` | 201 `{ id, courseId, status: "received", seatsLeft }`; немає місць → 409 `NO_SEATS` |
| `GET /api/search/suggest` | підказки |
| `POST /api/recommendations` | `{ filters, items }` |
| `/api/admin/*` | **видаляється** |

Невідомий шлях під `/api/` → 404 `NOT_FOUND` «Маршрут не знайдено».

### Шари

`views` (DRF: розбір і валідація вводу, HTTP) → `selectors.py` (ORM/PostGIS) → `services/` (чисті функції).

- `selectors.load_catalog(near=None)` повертає `{ city, categories, directions, institutions, courses }` як списки
  словників. За `near` кожен заклад отримує відстань з PostGIS.
- `services/` — порт 1:1 `filters.js`, `catalog.js`, `recommend.js`, `steamProfile.js`:
  - фільтри «АБО» в межах списку, «І» між фільтрами;
  - вік — перетин діапазонів;
  - `q` — усі токени серед назви курсу, назви й ключових слів напряму, назв закладу, з нормалізацією апострофів;
  - правило карти: `rejected` приховані, `pending` публічні, з фільтром курсів лишаються заклади з ≥1 збігом;
  - `toPublicInstitution` прибирає `contactPerson`;
  - ваги рекомендацій і порядок сортування як зараз.
- Порівняння рядків з `localeCompare(..., 'uk')` замінює ключ сортування за українським алфавітом
  у `services/text.py` (без PyICU).

### PostGIS

- **Межі міста:** серіалізатор заявки перевіряє `city.bounds.contains(Point(lng, lat))`. При помилці
  поле в `details` і повідомлення ті самі, що зараз.
- **Відстань:** `Distance("location", point, spheroid=False)` (`ST_DistanceSphere`), у км, округлення до 0,1.
  Використовується для `near` у маркерах і в рекомендаціях.
- GiST-індекс на `Institution.location`.

### Валідація й помилки

- DRF-серіалізатори з українськими повідомленнями, перенесеними з `src/validation/schemas.js` дослівно.
  Списки в query приймаються як `a,b` і як повторювані параметри; порожні параметри ігноруються.
- Власний `EXCEPTION_HANDLER` → `{ error: { code, message, details? } }`, `details: [{ path, message }]`.

| Код | Статус | Коли |
|---|---|---|
| `VALIDATION_ERROR` | 400 | невалідний ввід; «Некоректний JSON у тілі запиту»; «Завеликий запит» |
| `NOT_FOUND` | 404 | немає запису або маршруту |
| `NO_SEATS` | 409 | немає вільних місць |
| `RATE_LIMITED` | 429 | «Забагато запитів, спробуйте пізніше» |
| `INTERNAL` | 500 | невідома помилка: «Внутрішня помилка сервера» + рядок у лог |

- Throttling DRF: загальний на `/api` — 300 запитів за 15 хв; scope `write` на всі POST — 30 за 15 хв.
  Значення з env, за замовчуванням як зараз.

### Запис на курс

В одній транзакції:

1. Курс існує, а його заклад публічний (`approved` або `pending`), інакше 404.
2. `seats_left IS NULL` → запис без зміни місць.
3. Інакше `Course.objects.filter(pk=id, seats_left__gt=0).update(seats_left=F("seats_left") - 1)`;
   оновлено 0 рядків → 409 `NO_SEATS`.
4. Створити `Registration`; повернути актуальний `seatsLeft`.

## 4. Django admin

- `LANGUAGE_CODE = "uk"`, `verbose_name` українською. Вхід — суперкористувач (`createsuperuser`).
- **Заклади:**
  - `GISModelAdmin` з картою OSM для `location`;
  - колонки: назва, тип, статус, джерело, `created_at`;
  - фільтри: `status`, `type`, `source`; пошук за назвою й адресою;
  - дії «Схвалити» / «Відхилити» для вибраних записів;
  - inline курсів.
- **Курси:** фільтри за закладом, напрямом, форматом; редагування місць.
- **Записи на курси:** тільки перегляд і видалення; додавати не можна.
- **Довідники:** місто (полігон меж на карті), категорії, напрями.
- **Квіз:** квіз з inline питань; питання з inline варіантів.
- Інваріанти з розділу 2 перевіряються в БД і в `clean()`, тому адмінка не може їх порушити.

## 5. Імпорт `data/seed/`

`python manage.py import_seed [--reset] [--yes]`

- Одна транзакція: імпортується все або нічого.
- Записи оновлюються або створюються за `id`, тож повторний запуск безпечний.
- Кожен запис проходить `full_clean()`; помилка зупиняє імпорт і називає файл та `id`.
- Перевірки з `.claude/skills/seed-data/check-seed.mjs` переносяться сюди. Приклади:
  посилання курсів на існуючі заклади й напрями, інтереси квізу як існуючі напрями,
  кожен напрям має хоча б один курс.
- `--reset` спершу видаляє каталог разом із записами на курси; потребує підтвердження або `--yes`.
- `city.bounds`: прямокутник з `{south, west, north, east}` → `Polygon.from_bbox`.
- Entrypoint контейнера виконує лише `migrate`; автоімпорту немає.

## 6. Тести

Запуск: `docker compose run --rm api pytest` (тестова БД PostGIS створюється й видаляється Django).

1. **«Золоті» відповіді — перший крок, до будь-яких змін у Node-коді.**
   - Скрипт піднімає нинішній `createApp` з MemoryStore і seed і робить ~30 запитів:
     - маркери без фільтрів, з кожним фільтром і їх комбінаціями, з `near`;
     - картка закладу, курси напряму, курс, suggest, recommendations;
     - заявка й запис на курс;
     - помилки 400 з `details`, 404, 409.
   - Результати зберігаються в `backend/tests/golden/`.
   - Pytest імпортує seed, повторює запити й порівнює тіло та статус точно, з порядком.
   - Ігноруються лише `id`/`createdAt` нових записів і `uptimeSec`.
2. **Сервіси:** порт `tests/services/*` у pytest без БД.
3. **API:** порт `tests/api/*` (крім `admin` і `spa`): статуси, `details[].path`, throttling.
4. **Гонка:** два паралельні записи на курс з `seats_left = 1` → один 201, один 409, `seats_left = 0`.
5. **Імпорт:** повторний запуск не дублює; зламаний JSON відкочує транзакцію.
6. **Адмінка:** сторінки відкриваються; дії «Схвалити» / «Відхилити» змінюють статус;
   порушений інваріант дає помилку форми.
7. **Фронтенд:** `npm run test:web` (без тестів `web/src/admin/`) і перевірка в браузері через Vite → Django.

## 7. Перехід (кінець підпроєкту)

Лише після зелених golden, pytest і `test:web`:

- **Видалити:** `src/`, `tests/`, `scripts/seed.js`, бекенд-залежності з `package.json`
  (express, mongodb, zod, helmet, cors, compression, express-rate-limit, dotenv, supertest), `render.yaml`,
  `web/src/admin/` і маршрут `/admin`, скіли `mongo-ops` і `deploy-render`.
- **Оновити:**
  - `CLAUDE.md`: стек, команди; `npm test` запускає pytest у Docker і `test:web`; правило 3 → `catalog/services/`;
  - `README.md`;
  - скіли `api-architecture`, `verify-api`, `seed-data`, `frontend`; `check-seed.mjs` замінює `import_seed`;
  - `.claude/README.md`.

**Проміжний стан:** продакшн-збірку `public/` разом із CSP і `Referrer-Policy` більше ніхто не віддає.
До підпроєкту 2 фронтенд працює лише через `npm run dev:web`.

## 8. Ризики

- **Розбіжності при порті логіки** (сортування, округлення, нормалізація тексту) — ловлять «золоті» тести.
- **Docker на Windows споживає RAM** — обмежено `.wslconfig` (3 ГБ, 4 ядра).
- **Відстань `ST_DistanceSphere`** (радіус 6371,0088 км) проти `haversine` (6371 км) — різниця ~0,00014 %,
  після округлення до 0,1 км не видна; перевіряється golden-тестами з `near`.
