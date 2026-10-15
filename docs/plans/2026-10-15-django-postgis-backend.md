# Перенесення бекенду на Django + PostGIS — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Замінити Express + Mongo на Django + DRF + PostgreSQL/PostGIS з тим самим HTTP-контрактом `/api/*`,
нормалізованою БД, імпортом `data/seed/` і CRUD/модерацією в Django admin.

**Architecture:** `backend/` — Django-проєкт у Docker Compose поруч із PostGIS. Шари: DRF-views (ввід/вивід HTTP)
→ `selectors.py` (читання ORM/PostGIS у списки словників) і `actions.py` (записи) → `catalog/services/` (чистий
Python-порт `src/services/*.js`). «Золоті» відповіді, записані з нинішнього Node API, гарантують контракт.

**Tech Stack:** Python 3.12, Django 5.2 LTS (GeoDjango), Django REST Framework 3.16, psycopg 3, PostgreSQL 16 +
PostGIS 3.4 (`postgis/postgis:16-3.4`), pytest + pytest-django, Docker Compose. Фронтенд: React/Vite без змін.

**Spec:** `docs/specs/2026-10-15-django-postgis-backend-design.md`

## Global Constraints

- Контракт `/api/*` 1:1 з нинішнім Node API, крім: `/api/admin/*` видалено; `GET /api/health` → `store: "postgres"`.
- Коди помилок і статуси: `VALIDATION_ERROR` 400, `NOT_FOUND` 404, `NO_SEATS` 409, `RATE_LIMITED` 429, `INTERNAL` 500.
  Тіло: `{ "error": { "code", "message", "details"? } }`, `details: [{ "path", "message" }]`.
- Ліміти: загальний 300 запитів / 15 хв на IP; POST — додатково 30 / 15 хв. Env: `RATE_LIMIT_MAX`,
  `RATE_LIMIT_WINDOW_MS`, `WRITE_RATE_LIMIT_MAX`, `WRITE_RATE_LIMIT_WINDOW_MS`.
- Максимальний розмір тіла запиту — 20 КБ (`20480` байт) → 400 «Завеликий запит».
- `catalog/services/` не імпортує `django`, `rest_framework`, `catalog.models`, `catalog.selectors`. Дозволено лише
  стандартну бібліотеку, `catalog.choices` і модулі всередині `services/`.
- Усі enum-и й українські підписи — лише в `backend/catalog/choices.py` (чистий Python, без Django).
- Мова: коментарі в коді, повідомлення API й адмінки — українською з `ʼ`/`’` як у наявному коді. Цитовані
  літерали (повідомлення помилок, назви тестів, значення seed) — дослівно.
- Неперевірені факти про реальні заклади — `null` (скіл `seed-data`). Цей план не додає й не змінює seed-значень.
- Свідомі відхилення від Node, зафіксовані тестами:
  - `declaredDirectionIds` повертаються в порядку довідника напрямів, а не в порядку введення;
  - zod-повідомлення англійською за замовчуванням замінено українськими (перелік — Task 6);
  - `Content-Type`, відмінний від JSON, у POST → 400 «Некоректний JSON у тілі запиту» (у Node тіло ставало `{}`);
  - метод, не підтримуваний маршрутом (напр. `PUT /api/institutions`), → 404 «Маршрут не знайдено» (як у Node).
- Docker: усі Python-команди виконуються в контейнері: `docker compose run --rm api <cmd>`.
- Після кожної задачі — коміт; повідомлення комітів українською, з рядком
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Два одночасні записи на останнє місце** — один 201, другий 409, `seats_left` не стає −1 (Task 8, тест гонки).
2. **Кирилиця й апострофи в `q` та `suggest`** (`?q=ардуїно`, `?q=розв’язувати`, `%D1%80%D0%BE`) — ті самі збіги,
   що в Node (Task 4 юніт-тести `normalize_text`; Task 7 golden з кирилицею).
3. **Порожні та повторені query-параметри** (`?category=&age=`, `?direction=a&direction=b`, `?category[]=S`,
   `?category=s,t`) — ігноруються/об'єднуються як у Node (Task 6, тести `parse_catalog_filters`).
4. **Повторний `import_seed` після правок у адмінці** — не дублює записи, не чіпає заявки й записи на курси без
   `--reset`; зламаний JSON нічого не змінює (Task 3).
5. **Число замість рядка і навпаки в JSON** (`"age": "11"`, `"lat": "50"`, `"consent": "true"`, `true` як вік) —
   400 з українським повідомленням, а не 500 чи тихе приведення типу (Task 6).

---

## Файлова структура

| Файл | Відповідальність |
|---|---|
| `docker-compose.yml` | сервіси `db` (PostGIS) і `api` (Django) |
| `backend/Dockerfile`, `backend/requirements.txt`, `backend/.dockerignore` | образ з GDAL/GEOS |
| `backend/manage.py`, `backend/config/{settings,urls,wsgi}.py` | налаштування Django, маршрути `/api/` і `/admin/` |
| `backend/pytest.ini`, `backend/conftest.py` | pytest-django, скидання кешу лімітів |
| `backend/catalog/choices.py` | enum-и, підписи, `AGE_GROUPS`, `PRICE_OPTIONS`, `STEAM_CODES` |
| `backend/catalog/errors.py` | `AppError`, `ErrorCode`, `STATUS_BY_CODE` |
| `backend/catalog/models.py` | City, Category, Direction, Institution, Course, Registration |
| `backend/quiz/models.py` | Quiz, QuizQuestion, QuizOption |
| `backend/catalog/services/text.py` | нормалізація тексту, сортування uk, JS-сумісне округлення |
| `backend/catalog/services/filters.py` | порт `filters.js` |
| `backend/catalog/services/steam_profile.py` | порт `steamProfile.js` |
| `backend/catalog/services/catalog.py` | порт `catalog.js` + `build_meta` |
| `backend/catalog/services/recommend.py` | порт `recommend.js` |
| `backend/catalog/selectors.py` | БД → словники; відстані PostGIS |
| `backend/catalog/actions.py` | створення заявки й запису на курс |
| `backend/catalog/api/validation.py` | розбір і валідація query/body з повідомленнями як у zod-схемах |
| `backend/catalog/api/exceptions.py` | обробник помилок DRF, middleware розміру тіла |
| `backend/catalog/api/throttling.py` | ліміти запитів |
| `backend/catalog/api/views.py`, `backend/catalog/api/urls.py` | ендпоінти |
| `backend/catalog/admin.py`, `backend/quiz/admin.py` | Django admin |
| `backend/catalog/management/commands/import_seed.py` | імпорт `data/seed/` |
| `scripts/record-golden.mjs` | запис «золотих» відповідей з Node (видаляється в Task 11) |
| `backend/tests/golden/cases.json` | «золоті» відповіді |
| `backend/tests/test_*.py` | тести |

---

### Task 1: «Золоті» відповіді з нинішнього Node API

**Files:**
- Create: `scripts/record-golden.mjs`
- Create: `backend/tests/golden/cases.json` (генерується)

**Interfaces:**
- Produces: `backend/tests/golden/cases.json` — масив
  `{ name, method, path, body?, raw?, before?: [{method, path, body}], ignore?: string[], status, response }`.
  `path` уже percent-encoded; `ignore` — шляхи з крапками (`institution.id`) для полів, що не порівнюються;
  `before` — запити, які виконуються на тому самому застосунку перед основним; `raw` — тіло-рядок як є.

- [ ] **Step 1: Переконатися, що Node-тести зелені (база для запису)**

Run: `npm test`
Expected: усі тести PASS (Mongo-тести SKIP). Запишіть кількість pass/fail у звіт.

- [ ] **Step 2: Написати скрипт запису**

`scripts/record-golden.mjs`:

```js
// Записує «золоті» відповіді нинішнього Express API для перевірки Django-бекенду.
// Запуск: node scripts/record-golden.mjs  → backend/tests/golden/cases.json
// Кожен випадок — на свіжому MemoryStore з seed; ліміти запитів вимкнено.
import { mkdirSync, writeFileSync } from 'node:fs';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { createMemoryStore } from '../src/store/memoryStore.js';

const OUT_DIR = new URL('../backend/tests/golden/', import.meta.url);
const NEW_INSTITUTION_IGNORE = ['institution.id', 'institution.createdAt'];

const submission = {
  name: 'Тестова STEAM-школа',
  shortName: 'Тест STEAM',
  type: 'private_school',
  address: 'вул. Сумська, 1, Харків',
  lat: 50.0,
  lng: 36.23,
  shortDescription: 'Перевірка заявки',
  website: 'https://example.com',
  phone: '+380 (57) 700-00-00',
  email: 'school@example.com',
  contactPerson: 'Олена',
  hasShelter: null,
  declaredDirectionIds: ['astronomy', 'robotics', 'robotics'],
};

const registration = { name: 'Олена', contact: '+380501234567', participantAge: 11, comment: '', consent: true };
const lego = '/api/courses/palace-lego/registrations';

const cases = [
  { name: 'meta', path: '/api/meta' },
  { name: 'quiz', path: '/api/quiz' },
  { name: 'markers: без фільтрів', path: '/api/institutions' },
  { name: 'markers: category=T', path: '/api/institutions?category=T' },
  { name: 'markers: category=s,a (нижній регістр)', path: '/api/institutions?category=s,a' },
  { name: 'markers: повторений direction', path: '/api/institutions?direction=robotics&direction=astronomy' },
  { name: 'markers: category[]=E', path: '/api/institutions?category[]=E' },
  { name: 'markers: вік 6–9', path: '/api/institutions?ageFrom=6&ageTo=9' },
  { name: 'markers: лише ageFrom', path: '/api/institutions?ageFrom=16' },
  { name: 'markers: price=free', path: '/api/institutions?price=free' },
  { name: 'markers: price=paid&format=online', path: '/api/institutions?price=paid&format=online' },
  { name: 'markers: type=university', path: '/api/institutions?type=university' },
  { name: 'markers: порожні параметри', path: '/api/institutions?category=&ageFrom=&price=&q=%20' },
  { name: 'markers: q=python', path: '/api/institutions?q=python' },
  { name: 'markers: q=ардуїно (ключове слово)', path: `/api/institutions?q=${encodeURIComponent('ардуїно')}` },
  { name: 'markers: q без збігів', path: `/api/institutions?q=${encodeURIComponent('балет')}` },
  { name: 'markers: near', path: '/api/institutions?lat=49.99&lng=36.23' },
  { name: 'markers: near + category=T', path: '/api/institutions?lat=50.02&lng=36.33&category=T' },
  { name: 'card: hnpu', path: '/api/institutions/hnpu' },
  { name: 'card: khpi з category=T', path: '/api/institutions/khpi?category=T' },
  { name: 'direction courses: khpi/robotics', path: '/api/institutions/khpi/directions/robotics/courses' },
  {
    name: 'direction courses: khpi/programming price=free',
    path: '/api/institutions/khpi/directions/programming/courses?price=free',
  },
  { name: 'course: khpi-robotics-arduino', path: '/api/courses/khpi-robotics-arduino' },
  { name: 'suggest: ро', path: `/api/search/suggest?q=${encodeURIComponent('ро')}` },
  { name: 'suggest: харк', path: `/api/search/suggest?q=${encodeURIComponent('харк')}` },
  { name: 'suggest: python', path: '/api/search/suggest?q=python' },
  {
    name: 'recommendations: сценарій Олени',
    method: 'POST',
    path: '/api/recommendations',
    body: { age: 11, interests: ['robotics', '3d-modeling', 'electronics'], format: ['offline', 'hybrid'], price: 'any' },
  },
  {
    name: 'recommendations: категорія T, безкоштовно, з локацією',
    method: 'POST',
    path: '/api/recommendations',
    body: { age: 15, interests: ['T'], price: 'free', lat: 49.99, lng: 36.23 },
  },
  { name: 'recommendations: лише вік', method: 'POST', path: '/api/recommendations', body: { age: 8 } },
  {
    name: 'submission: валідна заявка',
    method: 'POST',
    path: '/api/institutions',
    body: submission,
    ignore: NEW_INSTITUTION_IGNORE,
  },
  {
    name: 'submission: заявка видна на карті як pending',
    path: '/api/institutions?type=private_school',
    before: [{ method: 'POST', path: '/api/institutions', body: submission }],
    ignore: ['items.0.id'],
  },
  { name: 'registration: palace-lego', method: 'POST', path: lego, body: registration, ignore: ['id'] },
  {
    name: 'registration: без обмеження місць',
    method: 'POST',
    path: '/api/courses/khpi-python-highschool/registrations',
    body: registration,
    ignore: ['id'],
  },
  {
    name: 'registration: місця закінчились',
    method: 'POST',
    path: lego,
    body: registration,
    before: [
      { method: 'POST', path: lego, body: registration },
      { method: 'POST', path: lego, body: registration },
    ],
  },
  { name: 'error: ageFrom > ageTo', path: '/api/institutions?ageFrom=10&ageTo=5' },
  { name: 'error: lat без lng', path: '/api/institutions?lat=50' },
  { name: 'error: вік не число', path: '/api/institutions?ageFrom=abc' },
  { name: 'error: невідомий заклад', path: '/api/institutions/nope' },
  { name: 'error: некоректний id', path: '/api/institutions/bad_id!' },
  { name: 'error: невідомий напрямок', path: '/api/institutions/khpi/directions/nope/courses' },
  { name: 'error: невідомий курс', path: '/api/courses/nope' },
  { name: 'error: невідомий маршрут', path: '/api/nope' },
  { name: 'error: suggest закороткий', path: '/api/search/suggest?q=a' },
  { name: 'error: suggest без q', path: '/api/search/suggest' },
  { name: 'error: порожня заявка', method: 'POST', path: '/api/institutions', body: {} },
  {
    name: 'error: заявка поза містом і без контактів',
    method: 'POST',
    path: '/api/institutions',
    body: { name: 'Школа', type: 'center', address: 'вул. Далека, 1', lat: 48.5, lng: 36.2 },
  },
  {
    name: 'error: заявка без телефону й email',
    method: 'POST',
    path: '/api/institutions',
    body: { name: 'Школа', type: 'center', address: 'вул. Сумська, 1', lat: 50.0, lng: 36.23 },
  },
  {
    name: 'error: некоректний запис на курс',
    method: 'POST',
    path: lego,
    body: { name: 'А', contact: 'x', participantAge: -1, consent: false },
  },
  { name: 'error: запис на невідомий курс', method: 'POST', path: '/api/courses/nope/registrations', body: registration },
  { name: 'error: некоректний JSON', method: 'POST', path: '/api/recommendations', raw: '{"age": ' },
];

async function send(api, { method = 'GET', path, body, raw }) {
  if (method === 'GET') return api.get(path);
  const req = api.post(path).set('Content-Type', 'application/json');
  return req.send(raw ?? JSON.stringify(body));
}

const silent = { error() {}, info() {}, warn() {} };
const config = loadConfig({ RATE_LIMIT_MAX: '100000', WRITE_RATE_LIMIT_MAX: '100000' });

const results = [];
for (const testCase of cases) {
  const app = createApp({ store: createMemoryStore(), config, logger: silent });
  const api = request(app);
  for (const step of testCase.before ?? []) await send(api, step);
  const res = await send(api, testCase);
  results.push({ method: 'GET', ...testCase, status: res.status, response: res.body });
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(new URL('cases.json', OUT_DIR), `${JSON.stringify(results, null, 2)}\n`);
console.log(`Записано ${results.length} випадків`);
```

- [ ] **Step 3: Запустити й перевірити результат**

Run: `node scripts/record-golden.mjs`
Expected: `Записано 50 випадків`. Відкрийте `backend/tests/golden/cases.json` і перевірте вибірково:
`markers: near` відсортовано за `distanceKm`; `registration: місця закінчились` має `status: 409` і
`error.code: "NO_SEATS"`; `error: некоректний JSON` має `status: 400` і повідомлення
«Некоректний JSON у тілі запиту»; у `submission: валідна заявка` немає `contactPerson`.
Якщо якийсь випадок має неочікуваний статус (наприклад, 404 замість 200 через опечатку в шляху) — виправте
шлях у скрипті, а не очікування.

- [ ] **Step 4: Commit**

```bash
git add scripts/record-golden.mjs backend/tests/golden/cases.json
git commit -m "test: золоті відповіді нинішнього API для перевірки Django-бекенду"
```

---

### Task 2: Docker, каркас Django, обробник помилок, health

**Files:**
- Create: `docker-compose.yml`, `backend/Dockerfile`, `backend/.dockerignore`, `backend/requirements.txt`
- Create: `backend/manage.py`, `backend/config/__init__.py`, `backend/config/settings.py`, `backend/config/urls.py`,
  `backend/config/wsgi.py`
- Create: `backend/pytest.ini`, `backend/conftest.py`
- Modify: `.gitignore`
- Create: `backend/catalog/__init__.py`, `backend/catalog/apps.py`, `backend/catalog/errors.py`
- Create: `backend/catalog/api/__init__.py`, `backend/catalog/api/exceptions.py`, `backend/catalog/api/throttling.py`,
  `backend/catalog/api/views.py`, `backend/catalog/api/urls.py`
- Create: `backend/quiz/__init__.py`, `backend/quiz/apps.py`
- Test: `backend/tests/__init__.py`, `backend/tests/test_errors.py`

**Interfaces:**
- Produces: `catalog.errors.AppError(code: str, message: str, details: list[dict] | None = None)`,
  `catalog.errors.ErrorCode.{VALIDATION_ERROR, NOT_FOUND, NO_SEATS, RATE_LIMITED, INTERNAL}`,
  `catalog.errors.STATUS_BY_CODE: dict[str, int]`;
  `catalog.api.exceptions.api_exception_handler`, `catalog.api.exceptions.BodySizeLimitMiddleware`;
  `catalog.api.throttling.ApiThrottle`, `WriteThrottle`; налаштування `SEED_DIR`, `API_RATE_LIMITS`.
- Команди: `docker compose up -d db`, `docker compose run --rm api pytest`.

- [ ] **Step 1: Docker-файли**

`docker-compose.yml`:

```yaml
# Локальна розробка: PostGIS + Django. Запуск: docker compose up
services:
  db:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: academy
      POSTGRES_USER: academy
      POSTGRES_PASSWORD: academy
    ports:
      - "5433:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U academy -d academy"]
      interval: 2s
      timeout: 3s
      retries: 30

  api:
    build: ./backend
    environment:
      DJANGO_DEBUG: "1"
      POSTGRES_HOST: db
      POSTGRES_DB: academy
      POSTGRES_USER: academy
      POSTGRES_PASSWORD: academy
      SEED_DIR: /seed
    volumes:
      - ./backend:/app
      - ./data/seed:/seed:ro
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy

volumes:
  pgdata:
```

`backend/Dockerfile`:

```dockerfile
FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

# GeoDjango потребує GDAL, GEOS і PROJ
RUN apt-get update \
    && apt-get install -y --no-install-recommends gdal-bin \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

CMD ["sh", "-c", "python manage.py migrate --noinput && python manage.py runserver 0.0.0.0:8000"]
```

`backend/.dockerignore`:

```
__pycache__/
*.pyc
.pytest_cache/
```

`backend/requirements.txt`:

```
Django>=5.2,<5.3
djangorestframework>=3.16,<3.17
psycopg[binary]>=3.2,<3.3
pytest>=8,<9
pytest-django>=4.9,<5
```

- [ ] **Step 2: Налаштування Django**

`backend/manage.py`:

```python
#!/usr/bin/env python
import os
import sys


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
```

`backend/config/__init__.py`: порожній.

`backend/config/settings.py`:

```python
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def env_int(name, default):
    # Як toInt у Node-конфігу: некоректне або ≤ 0 → значення за замовчуванням
    try:
        value = int(os.environ.get(name, ""))
    except ValueError:
        return default
    return value if value > 0 else default


DEBUG = os.environ.get("DJANGO_DEBUG") == "1"
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-only-insecure-key")
ALLOWED_HOSTS = [h for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if h]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.gis",
    "rest_framework",
    "catalog",
    "quiz",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "catalog.api.exceptions.BodySizeLimitMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

DATABASES = {
    "default": {
        "ENGINE": "django.contrib.gis.db.backends.postgis",
        "HOST": os.environ.get("POSTGRES_HOST", "localhost"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
        "NAME": os.environ.get("POSTGRES_DB", "academy"),
        "USER": os.environ.get("POSTGRES_USER", "academy"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "academy"),
    }
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

LANGUAGE_CODE = "uk"
TIME_ZONE = "Europe/Kyiv"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

APPEND_SLASH = False

# Тіло запиту до /api/ — не більше 20 КБ (як express.json({ limit: '20kb' }))
API_MAX_BODY_BYTES = 20 * 1024

SEED_DIR = Path(os.environ.get("SEED_DIR", BASE_DIR.parent / "data" / "seed"))

API_RATE_LIMITS = {
    "api": {
        "max": env_int("RATE_LIMIT_MAX", 300),
        "window_sec": env_int("RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000) // 1000,
    },
    "write": {
        "max": env_int("WRITE_RATE_LIMIT_MAX", 30),
        "window_sec": env_int("WRITE_RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000) // 1000,
    },
}

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    # Публічне API без сесій: немає CSRF на POST, немає request.user
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "UNAUTHENTICATED_USER": None,
    "DEFAULT_THROTTLE_CLASSES": [
        "catalog.api.throttling.ApiThrottle",
        "catalog.api.throttling.WriteThrottle",
    ],
    "EXCEPTION_HANDLER": "catalog.api.exceptions.api_exception_handler",
    "NUM_PROXIES": env_int("NUM_PROXIES", 0) or None,
}

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "loggers": {"catalog": {"handlers": ["console"], "level": "INFO"}},
}
```

`backend/config/wsgi.py`:

```python
import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
application = get_wsgi_application()
```

`backend/config/urls.py`:

```python
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("catalog.api.urls")),
]
```

`backend/catalog/__init__.py`, `backend/catalog/api/__init__.py`, `backend/quiz/__init__.py`,
`backend/tests/__init__.py`: порожні.

У `.gitignore` додайте в кінець:

```
# Django (backend/)
__pycache__/
.pytest_cache/
/backend/staticfiles/
```

`backend/catalog/apps.py`:

```python
from django.apps import AppConfig


class CatalogConfig(AppConfig):
    name = "catalog"
    verbose_name = "Каталог"
```

`backend/quiz/apps.py`:

```python
from django.apps import AppConfig


class QuizConfig(AppConfig):
    name = "quiz"
    verbose_name = "Квіз"
```

- [ ] **Step 3: pytest**

`backend/pytest.ini`:

```ini
[pytest]
DJANGO_SETTINGS_MODULE = config.settings
python_files = test_*.py
testpaths = tests
```

`backend/conftest.py`:

```python
import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def _reset_rate_limits(settings):
    # Лічильники лімітів живуть у кеші процесу — кожен тест починає з нуля, ліміти високі
    cache.clear()
    settings.API_RATE_LIMITS = {
        "api": {"max": 100_000, "window_sec": 900},
        "write": {"max": 100_000, "window_sec": 900},
    }
    yield
    cache.clear()
```

- [ ] **Step 4: Написати тести, що падають**

`backend/tests/test_errors.py`:

```python
import pytest

pytestmark = pytest.mark.django_db


def test_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["store"] == "postgres"
    assert isinstance(body["uptimeSec"], int)


@pytest.mark.parametrize("method", ["get", "post", "delete"])
def test_unknown_api_route_is_404_json(client, method):
    res = getattr(client, method)("/api/nope/deeper")
    assert res.status_code == 404
    assert res.json() == {"error": {"code": "NOT_FOUND", "message": "Маршрут не знайдено"}}


def test_unsupported_method_is_404(client):
    res = client.put("/api/health")
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "NOT_FOUND"


def test_body_too_large(client):
    res = client.post("/api/nope", data="x" * (20 * 1024 + 1), content_type="application/json")
    assert res.status_code == 400
    assert res.json() == {"error": {"code": "VALIDATION_ERROR", "message": "Завеликий запит"}}


def test_rate_limit(client, settings):
    settings.API_RATE_LIMITS = {
        "api": {"max": 2, "window_sec": 900},
        "write": {"max": 100, "window_sec": 900},
    }
    assert client.get("/api/health").status_code == 200
    assert client.get("/api/health").status_code == 200
    res = client.get("/api/health")
    assert res.status_code == 429
    assert res.json() == {"error": {"code": "RATE_LIMITED", "message": "Забагато запитів, спробуйте пізніше"}}


def test_write_rate_limit_counts_only_post(client, settings):
    settings.API_RATE_LIMITS = {
        "api": {"max": 100, "window_sec": 900},
        "write": {"max": 1, "window_sec": 900},
    }
    assert client.post("/api/nope", data="{}", content_type="application/json").status_code == 404
    assert client.post("/api/nope", data="{}", content_type="application/json").status_code == 429
    assert client.get("/api/health").status_code == 200


def test_internal_error_is_generic(client, monkeypatch):
    from catalog.api import views

    def boom(*args, **kwargs):
        raise RuntimeError("секрет")

    monkeypatch.setattr(views, "process_uptime_sec", boom)
    res = client.get("/api/health")
    assert res.status_code == 500
    assert res.json() == {"error": {"code": "INTERNAL", "message": "Внутрішня помилка сервера"}}
```

- [ ] **Step 5: Зібрати образ і переконатися, що тести падають**

Run: `docker compose build api && docker compose up -d db && docker compose run --rm api pytest tests/test_errors.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'catalog.api.exceptions'` (або помилка імпорту urls).

- [ ] **Step 6: Реалізація**

`backend/catalog/errors.py`:

```python
# Доменна помилка з машинним кодом. HTTP-статус за кодом визначає обробник у catalog/api/exceptions.py.


class ErrorCode:
    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    NO_SEATS = "NO_SEATS"
    RATE_LIMITED = "RATE_LIMITED"
    INTERNAL = "INTERNAL"


STATUS_BY_CODE = {
    ErrorCode.VALIDATION_ERROR: 400,
    ErrorCode.NOT_FOUND: 404,
    ErrorCode.NO_SEATS: 409,
    ErrorCode.RATE_LIMITED: 429,
    ErrorCode.INTERNAL: 500,
}


class AppError(Exception):
    def __init__(self, code, message, details=None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details

    def to_body(self):
        body = {"code": self.code, "message": self.message}
        if self.details is not None:
            body["details"] = self.details
        return {"error": body}
```

`backend/catalog/api/exceptions.py`:

```python
import logging

from django.conf import settings
from django.http import Http404, JsonResponse
from rest_framework.exceptions import MethodNotAllowed, NotFound, ParseError, Throttled, UnsupportedMediaType
from rest_framework.response import Response

from catalog.errors import STATUS_BY_CODE, AppError, ErrorCode

logger = logging.getLogger("catalog.api")


def to_app_error(exc, request=None):
    if isinstance(exc, AppError):
        return exc
    if isinstance(exc, (ParseError, UnsupportedMediaType)):
        return AppError(ErrorCode.VALIDATION_ERROR, "Некоректний JSON у тілі запиту")
    if isinstance(exc, Throttled):
        return AppError(ErrorCode.RATE_LIMITED, "Забагато запитів, спробуйте пізніше")
    if isinstance(exc, (MethodNotAllowed, NotFound, Http404)):
        return AppError(ErrorCode.NOT_FOUND, "Маршрут не знайдено")
    where = f"{request.method} {request.get_full_path()}" if request is not None else "?"
    logger.exception("[error] %s", where, exc_info=exc)
    return AppError(ErrorCode.INTERNAL, "Внутрішня помилка сервера")


# Єдиний формат: { error: { code, message, details? } }
def api_exception_handler(exc, context):
    error = to_app_error(exc, context.get("request"))
    return Response(error.to_body(), status=STATUS_BY_CODE[error.code])


class BodySizeLimitMiddleware:
    """DRF читає тіло потоком повз DATA_UPLOAD_MAX_MEMORY_SIZE, тому ліміт перевіряємо тут."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith("/api/"):
            try:
                length = int(request.META.get("CONTENT_LENGTH") or 0)
            except ValueError:
                length = 0
            if length > settings.API_MAX_BODY_BYTES:
                error = AppError(ErrorCode.VALIDATION_ERROR, "Завеликий запит")
                return JsonResponse(error.to_body(), status=400, json_dumps_params={"ensure_ascii": False})
        return self.get_response(request)
```

`backend/catalog/api/throttling.py`:

```python
from django.conf import settings
from rest_framework.throttling import SimpleRateThrottle


class _WindowThrottle(SimpleRateThrottle):
    """Ліміт «N запитів за вікно в секундах» з settings.API_RATE_LIMITS (DRF сам уміє лише s/m/h/d)."""

    limit_name = None

    def get_rate(self):
        return self.limit_name

    def parse_rate(self, rate):
        conf = settings.API_RATE_LIMITS[rate]
        return conf["max"], conf["window_sec"]

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class ApiThrottle(_WindowThrottle):
    scope = "api"
    limit_name = "api"


class WriteThrottle(_WindowThrottle):
    """Спільний суворіший лічильник для всіх POST."""

    scope = "write"
    limit_name = "write"

    def allow_request(self, request, view):
        if request.method != "POST":
            return True
        return super().allow_request(request, view)
```

`backend/catalog/api/views.py`:

```python
import time

from rest_framework.decorators import api_view
from rest_framework.response import Response

from catalog.errors import AppError, ErrorCode

_STARTED_AT = time.monotonic()


def process_uptime_sec():
    return round(time.monotonic() - _STARTED_AT)


@api_view(["GET"])
def health(request):
    return Response({"status": "ok", "store": "postgres", "uptimeSec": process_uptime_sec()})


@api_view(["GET", "POST", "PUT", "PATCH", "DELETE"])
def api_not_found(request, rest=None):
    raise AppError(ErrorCode.NOT_FOUND, "Маршрут не знайдено")
```

`backend/catalog/api/urls.py`:

```python
from django.urls import path, re_path

from . import views

urlpatterns = [
    path("health", views.health),
    # Має лишатися останнім: усе інше під /api/ → 404 у форматі API
    re_path(r"^(?P<rest>.*)$", views.api_not_found),
]
```

- [ ] **Step 7: Переконатися, що тести проходять**

Run: `docker compose run --rm api pytest tests/test_errors.py -v`
Expected: 9 passed.

- [ ] **Step 8: Commit**

```bash
git add docker-compose.yml .gitignore backend/
git commit -m "feat(backend): каркас Django + PostGIS у Docker, формат помилок, ліміти, health"
```

---

### Task 3: Моделі, константи та імпорт seed

**Files:**
- Create: `backend/catalog/choices.py`, `backend/catalog/models.py`, `backend/quiz/models.py`
- Create: `backend/catalog/migrations/__init__.py`, `backend/quiz/migrations/__init__.py` (+ згенеровані міграції)
- Create: `backend/catalog/management/__init__.py`, `backend/catalog/management/commands/__init__.py`,
  `backend/catalog/management/commands/import_seed.py`
- Test: `backend/tests/test_models.py`, `backend/tests/test_import_seed.py`

**Interfaces:**
- Consumes: `settings.SEED_DIR` (Task 2).
- Produces:
  - `catalog.choices`: `INSTITUTION_TYPES`, `FORMATS`, `LEVELS`, `AGE_GROUPS`, `PRICE_OPTIONS`,
    `INSTITUTION_STATUSES`, `PUBLIC_STATUSES`, `SOURCES`, `PRICE_UNITS`, `WEEKDAYS`, `QUESTION_TYPES`,
    `STEAM_CODES`, функції `ids(options)`, `label_of(options, value)`, `as_choices(options)`.
  - Моделі `catalog.models.{City, Category, Direction, Institution, Course, Registration}`,
    `quiz.models.{Quiz, QuizQuestion, QuizOption}` з полями як нижче; поле `position` задає порядок seed.
  - Команда `import_seed [--reset] [--yes]`; у тестах — `call_command("import_seed")`.

- [ ] **Step 1: Константи**

`backend/catalog/choices.py`:

```python
# Довідники-константи: єдине джерело для моделей, валідації, /api/meta та сервісів.
# Чистий Python без Django — його імпортують і catalog/services/.

INSTITUTION_TYPES = (
    {"id": "university", "name": "Університет"},
    {"id": "academy", "name": "Академія"},
    {"id": "private_school", "name": "Приватна школа"},
    {"id": "center", "name": "Освітній центр"},
)

FORMATS = (
    {"id": "offline", "name": "Офлайн"},
    {"id": "online", "name": "Онлайн"},
    {"id": "hybrid", "name": "Гібрид"},
)

AGE_GROUPS = (
    {"id": "6-9", "ageFrom": 6, "ageTo": 9, "name": "6–9 років"},
    {"id": "10-13", "ageFrom": 10, "ageTo": 13, "name": "10–13 років"},
    {"id": "14-17", "ageFrom": 14, "ageTo": 17, "name": "14–17 років"},
    {"id": "18+", "ageFrom": 18, "ageTo": 99, "name": "18+ років"},
)

LEVELS = (
    {"id": "beginner", "name": "Початковий"},
    {"id": "intermediate", "name": "Середній"},
    {"id": "advanced", "name": "Просунутий"},
)

PRICE_OPTIONS = (
    {"id": "free", "name": "Безкоштовно"},
    {"id": "paid", "name": "Платно"},
)

INSTITUTION_STATUSES = (
    {"id": "approved", "name": "Схвалено"},
    {"id": "pending", "name": "На модерації"},
    {"id": "rejected", "name": "Відхилено"},
)

# pending показуємо на карті одразу після заявки, rejected — ніде
PUBLIC_STATUSES = frozenset({"approved", "pending"})

SOURCES = (
    {"id": "seed", "name": "Початкові дані"},
    {"id": "submission", "name": "Заявка"},
)

PRICE_UNITS = (
    {"id": "course", "name": "За курс"},
    {"id": "month", "name": "За місяць"},
)

# Порядок як у Date#getUTCDay(): неділя = 0
WEEKDAYS = (
    {"id": "sun", "name": "Неділя"},
    {"id": "mon", "name": "Понеділок"},
    {"id": "tue", "name": "Вівторок"},
    {"id": "wed", "name": "Середа"},
    {"id": "thu", "name": "Четвер"},
    {"id": "fri", "name": "Пʼятниця"},
    {"id": "sat", "name": "Субота"},
)

QUESTION_TYPES = (
    {"id": "single", "name": "Одна відповідь"},
    {"id": "multi", "name": "Кілька відповідей"},
)

STEAM_CODES = ("S", "T", "E", "A", "M")


def ids(options):
    return [option["id"] for option in options]


def label_of(options, value):
    return next((option["name"] for option in options if option["id"] == value), value)


def as_choices(options):
    return [(option["id"], option["name"]) for option in options]
```

- [ ] **Step 2: Тести моделей, що падають**

`backend/tests/test_models.py`:

```python
import datetime

import pytest
from django.contrib.gis.geos import Point, Polygon
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from catalog.models import Category, City, Course, Direction, Institution

pytestmark = pytest.mark.django_db


@pytest.fixture
def city():
    return City.objects.create(
        id="kharkiv",
        name="Харків",
        center=Point(36.2304, 49.9935, srid=4326),
        bounds=Polygon.from_bbox((36.1, 49.88, 36.46, 50.1)),
        zoom=13,
        data_notice="",
    )


@pytest.fixture
def course_kwargs(city):
    category = Category.objects.create(code="T", name="Технології", name_en="Technology", color="#2563EB", icon="cpu")
    direction = Direction.objects.create(id="robotics", name="Робототехніка", category=category, keywords=["lego"])
    institution = Institution.objects.create(
        id="khpi", name="ХПІ", short_name="ХПІ", type="university", address="вул. Кирпичова, 2",
        city=city, location=Point(36.2483061, 49.9989798, srid=4326), status="approved", source="seed",
    )
    return dict(
        id="khpi-x", institution=institution, direction=direction, title="Курс", short_description="",
        description="", audience="", age_min=10, age_max=14, level="beginner", format="offline", price=0,
        price_unit="course", duration_text="", schedule_text="", schedule_days=["sat"],
        start_date=datetime.date(2026, 10, 3), language="uk", seats_total=10, seats_left=5,
    )


def test_valid_course_passes_full_clean(course_kwargs):
    Course(**course_kwargs).full_clean()


def test_age_range_constraint(course_kwargs):
    with pytest.raises(IntegrityError), transaction.atomic():
        Course.objects.create(**{**course_kwargs, "age_min": 15, "age_max": 10})


@pytest.mark.parametrize(
    "seats_total, seats_left",
    [(None, 3), (3, None), (3, 4)],
)
def test_seats_constraint(course_kwargs, seats_total, seats_left):
    with pytest.raises(IntegrityError), transaction.atomic():
        Course.objects.create(**{**course_kwargs, "seats_total": seats_total, "seats_left": seats_left})


def test_unlimited_seats_allowed(course_kwargs):
    Course(**{**course_kwargs, "seats_total": None, "seats_left": None}).full_clean()


def test_start_date_must_match_schedule_days(course_kwargs):
    # 2026-10-05 — понеділок, а розклад лише на суботу
    course = Course(**{**course_kwargs, "start_date": datetime.date(2026, 10, 5)})
    with pytest.raises(ValidationError) as exc:
        course.full_clean()
    assert "start_date" in exc.value.message_dict


def test_institution_outside_city_bounds(city):
    institution = Institution(
        id="far", name="Далеко", short_name="Далеко", type="center", address="вул. Далека, 1",
        city=city, location=Point(36.2, 48.5, srid=4326), status="pending", source="submission",
    )
    with pytest.raises(ValidationError) as exc:
        institution.full_clean()
    assert "location" in exc.value.message_dict
```

Run: `docker compose run --rm api pytest tests/test_models.py -v`
Expected: FAIL — `ImportError: cannot import name 'Category' from 'catalog.models'`.

- [ ] **Step 3: Моделі каталогу**

`backend/catalog/models.py`:

```python
import uuid

from django.contrib.gis.db import models
from django.contrib.postgres.fields import ArrayField
from django.core.exceptions import ValidationError
from django.db.models import F, Q
from django.utils import timezone

from .choices import (
    FORMATS,
    INSTITUTION_STATUSES,
    INSTITUTION_TYPES,
    LEVELS,
    PRICE_UNITS,
    SOURCES,
    STEAM_CODES,
    WEEKDAYS,
    as_choices,
    ids,
)


def new_id():
    return str(uuid.uuid4())


class City(models.Model):
    id = models.CharField("Код", primary_key=True, max_length=64)
    name = models.CharField("Назва", max_length=100)
    center = models.PointField("Центр карти", srid=4326)
    bounds = models.PolygonField("Межі міста", srid=4326)
    zoom = models.PositiveSmallIntegerField("Масштаб карти")
    data_notice = models.TextField("Примітка про дані", blank=True)

    class Meta:
        verbose_name = "Місто"
        verbose_name_plural = "Міста"

    def __str__(self):
        return self.name


class Category(models.Model):
    code = models.CharField("Код", primary_key=True, max_length=1, choices=[(c, c) for c in STEAM_CODES])
    name = models.CharField("Назва", max_length=50)
    name_en = models.CharField("Назва англійською", max_length=50)
    color = models.CharField("Колір", max_length=7)
    icon = models.CharField("Іконка lucide", max_length=50)
    position = models.PositiveSmallIntegerField("Порядок", default=0)

    class Meta:
        verbose_name = "Категорія STEAM"
        verbose_name_plural = "Категорії STEAM"
        ordering = ["position", "code"]

    def __str__(self):
        return f"{self.code} — {self.name}"


class Direction(models.Model):
    id = models.SlugField("Slug", primary_key=True, max_length=64)
    name = models.CharField("Назва", max_length=100)
    category = models.ForeignKey(Category, models.PROTECT, related_name="directions", verbose_name="Категорія")
    keywords = ArrayField(models.CharField(max_length=50), verbose_name="Ключові слова", default=list, blank=True)
    position = models.PositiveSmallIntegerField("Порядок", default=0)

    class Meta:
        verbose_name = "Напрям"
        verbose_name_plural = "Напрями"
        ordering = ["position", "id"]

    def __str__(self):
        return self.name


class Institution(models.Model):
    id = models.CharField("Ідентифікатор", primary_key=True, max_length=64, default=new_id)
    name = models.CharField("Назва", max_length=150)
    short_name = models.CharField("Коротка назва", max_length=150)
    type = models.CharField("Тип", max_length=20, choices=as_choices(INSTITUTION_TYPES))
    short_description = models.TextField("Короткий опис", null=True, blank=True)
    description = models.TextField("Опис", null=True, blank=True)
    logo_url = models.URLField("Логотип (URL)", null=True, blank=True)
    address = models.CharField("Адреса", max_length=200)
    city = models.ForeignKey(City, models.PROTECT, related_name="institutions", verbose_name="Місто")
    location = models.PointField("Точка на карті", srid=4326)
    website = models.URLField("Сайт", max_length=300, null=True, blank=True)
    phone = models.CharField("Телефон", max_length=30, null=True, blank=True)
    email = models.EmailField("Email", max_length=200, null=True, blank=True)
    contact_person = models.CharField("Контактна особа (приватне)", max_length=100, null=True, blank=True)
    has_shelter = models.BooleanField("Є укриття", null=True, blank=True)
    declared_directions = models.ManyToManyField(
        Direction, related_name="declared_by", blank=True, verbose_name="Заявлені напрями"
    )
    status = models.CharField("Статус", max_length=10, choices=as_choices(INSTITUTION_STATUSES), default="pending")
    source = models.CharField("Джерело", max_length=10, choices=as_choices(SOURCES), default="submission")
    created_at = models.DateTimeField("Створено", default=timezone.now)
    position = models.PositiveIntegerField("Порядок", default=0)

    class Meta:
        verbose_name = "Заклад"
        verbose_name_plural = "Заклади"
        ordering = ["created_at", "position", "id"]

    def __str__(self):
        return self.short_name or self.name

    def clean(self):
        if self.location is not None and self.city_id is not None and not self.city.bounds.contains(self.location):
            raise ValidationError({"location": "Точка має бути в межах міста"})


class Course(models.Model):
    id = models.CharField("Ідентифікатор", primary_key=True, max_length=64, default=new_id)
    institution = models.ForeignKey(Institution, models.CASCADE, related_name="courses", verbose_name="Заклад")
    direction = models.ForeignKey(Direction, models.PROTECT, related_name="courses", verbose_name="Напрям")
    title = models.CharField("Назва", max_length=200)
    short_description = models.TextField("Короткий опис", blank=True)
    description = models.TextField("Опис", blank=True)
    audience = models.CharField("Для кого", max_length=200, blank=True)
    age_min = models.PositiveSmallIntegerField("Вік від")
    age_max = models.PositiveSmallIntegerField("Вік до")
    level = models.CharField("Рівень", max_length=20, choices=as_choices(LEVELS))
    format = models.CharField("Формат", max_length=10, choices=as_choices(FORMATS))
    price = models.PositiveIntegerField("Ціна, грн (0 — безкоштовно)")
    price_unit = models.CharField("Одиниця ціни", max_length=10, choices=as_choices(PRICE_UNITS))
    duration_text = models.CharField("Тривалість", max_length=200, blank=True)
    schedule_text = models.CharField("Розклад", max_length=200, blank=True)
    schedule_days = ArrayField(
        models.CharField(max_length=3, choices=as_choices(WEEKDAYS)), verbose_name="Дні занять", default=list
    )
    start_date = models.DateField("Дата старту")
    language = models.CharField("Мова", max_length=8, default="uk")
    seats_total = models.PositiveIntegerField("Місць усього (порожньо — без обмежень)", null=True, blank=True)
    seats_left = models.PositiveIntegerField("Вільних місць", null=True, blank=True)
    position = models.PositiveIntegerField("Порядок", default=0)

    class Meta:
        verbose_name = "Курс"
        verbose_name_plural = "Курси"
        ordering = ["position", "id"]
        constraints = [
            models.CheckConstraint(condition=Q(age_min__lte=F("age_max")), name="course_age_range"),
            models.CheckConstraint(
                condition=(Q(seats_total__isnull=True) & Q(seats_left__isnull=True))
                | (Q(seats_total__isnull=False) & Q(seats_left__isnull=False) & Q(seats_left__lte=F("seats_total"))),
                name="course_seats_consistent",
                violation_error_message="Місця: обидва поля порожні або вільних не більше, ніж усього",
            ),
        ]

    def __str__(self):
        return self.title

    def clean(self):
        if self.start_date and self.schedule_days:
            weekday = ids(WEEKDAYS)[(self.start_date.weekday() + 1) % 7]
            if weekday not in self.schedule_days:
                raise ValidationError({"start_date": "Дата старту має припадати на один із днів занять"})


class Registration(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, models.PROTECT, related_name="registrations", verbose_name="Курс")
    name = models.CharField("Імʼя", max_length=100)
    contact = models.CharField("Контакт", max_length=200)
    participant_age = models.PositiveSmallIntegerField("Вік учасника", null=True, blank=True)
    comment = models.TextField("Коментар", null=True, blank=True)
    consent = models.BooleanField("Згода на обробку даних")
    created_at = models.DateTimeField("Створено", default=timezone.now)

    class Meta:
        verbose_name = "Запис на курс"
        verbose_name_plural = "Записи на курси"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} → {self.course_id}"
```

- [ ] **Step 4: Моделі квізу**

`backend/quiz/models.py`:

```python
from django.db import models

from catalog.choices import QUESTION_TYPES, as_choices


class Quiz(models.Model):
    id = models.SlugField("Ідентифікатор", primary_key=True, max_length=64)
    title = models.CharField("Заголовок", max_length=200)
    subtitle = models.CharField("Підзаголовок", max_length=300, blank=True)

    class Meta:
        verbose_name = "Квіз"
        verbose_name_plural = "Квізи"

    def __str__(self):
        return self.title


class QuizQuestion(models.Model):
    quiz = models.ForeignKey(Quiz, models.CASCADE, related_name="questions", verbose_name="Квіз")
    key = models.SlugField("Ідентифікатор", max_length=64)
    position = models.PositiveSmallIntegerField("Порядок", default=0)
    title = models.CharField("Питання", max_length=200)
    subtitle = models.CharField("Підказка", max_length=300, blank=True)
    type = models.CharField("Тип", max_length=10, choices=as_choices(QUESTION_TYPES))
    required = models.BooleanField("Обовʼязкове", default=True)

    class Meta:
        verbose_name = "Питання"
        verbose_name_plural = "Питання"
        ordering = ["position", "id"]
        constraints = [models.UniqueConstraint(fields=["quiz", "key"], name="quiz_question_key_unique")]

    def __str__(self):
        return self.title


class QuizOption(models.Model):
    question = models.ForeignKey(QuizQuestion, models.CASCADE, related_name="options", verbose_name="Питання")
    key = models.SlugField("Ідентифікатор", max_length=64)
    position = models.PositiveSmallIntegerField("Порядок", default=0)
    label = models.CharField("Текст", max_length=200)
    emoji = models.CharField("Емодзі", max_length=16, blank=True)
    value = models.JSONField("Значення (JSON)", default=dict)

    class Meta:
        verbose_name = "Варіант"
        verbose_name_plural = "Варіанти"
        ordering = ["position", "id"]
        constraints = [models.UniqueConstraint(fields=["question", "key"], name="quiz_option_key_unique")]

    def __str__(self):
        return self.label
```

- [ ] **Step 5: Міграції й тести моделей**

Створіть порожні `backend/catalog/migrations/__init__.py` і `backend/quiz/migrations/__init__.py`.

Run: `docker compose run --rm api python manage.py makemigrations catalog quiz`
Expected: створено `catalog/migrations/0001_initial.py` і `quiz/migrations/0001_initial.py`.

Run: `docker compose run --rm api pytest tests/test_models.py -v`
Expected: 8 passed.

- [ ] **Step 6: Тести імпорту, що падають**

`backend/tests/test_import_seed.py`:

```python
import json
import shutil

import pytest
from django.core.management import CommandError, call_command

from catalog.models import Category, City, Course, Direction, Institution, Registration
from quiz.models import Quiz, QuizOption, QuizQuestion

pytestmark = pytest.mark.django_db


def test_imports_seed():
    call_command("import_seed")
    assert City.objects.count() == 1
    assert Category.objects.count() == 5
    assert Direction.objects.count() == 11
    assert Institution.objects.count() == 4
    assert Course.objects.count() == 13
    assert Quiz.objects.count() == 1
    assert QuizQuestion.objects.count() == 5
    lego = Course.objects.get(pk="palace-lego")
    assert (lego.seats_total, lego.seats_left) == (12, 2)
    khpi = Institution.objects.get(pk="khpi")
    assert (khpi.location.y, khpi.location.x) == (49.9989798, 36.2483061)
    assert khpi.status == "approved" and khpi.source == "seed"
    assert list(Institution.objects.values_list("id", flat=True)) == ["hnpu", "khpi", "kh-palace", "itstep-kharkiv"]


def test_rerun_is_idempotent_and_keeps_registrations_and_submissions():
    call_command("import_seed")
    course = Course.objects.get(pk="palace-lego")
    Registration.objects.create(course=course, name="Олена", contact="+380501234567", consent=True)
    Institution.objects.create(
        name="Заявка", short_name="Заявка", type="center", address="вул. Сумська, 1",
        city=City.objects.get(), location=course.institution.location, status="pending", source="submission",
    )
    call_command("import_seed")
    assert Course.objects.count() == 13
    assert Institution.objects.count() == 5
    assert Registration.objects.count() == 1
    assert QuizOption.objects.filter(question__quiz_id="what-to-choose").count() > 0


def test_reset_requires_yes(monkeypatch):
    call_command("import_seed")
    monkeypatch.setattr("builtins.input", lambda prompt: "ні")
    with pytest.raises(CommandError):
        call_command("import_seed", reset=True)


def test_reset_clears_registrations_and_submissions():
    call_command("import_seed")
    course = Course.objects.get(pk="palace-lego")
    Registration.objects.create(course=course, name="Олена", contact="+380501234567", consent=True)
    call_command("import_seed", reset=True, yes=True)
    assert Registration.objects.count() == 0
    assert Course.objects.get(pk="palace-lego").seats_left == 2


def test_broken_seed_rolls_back(settings, tmp_path):
    seed_dir = tmp_path / "seed"
    shutil.copytree(settings.SEED_DIR, seed_dir)
    courses = json.loads((seed_dir / "courses.json").read_text("utf-8"))
    courses[-1]["ageMin"] = 99  # ageMin > ageMax
    (seed_dir / "courses.json").write_text(json.dumps(courses, ensure_ascii=False), "utf-8")
    settings.SEED_DIR = seed_dir

    with pytest.raises(CommandError) as exc:
        call_command("import_seed")
    assert courses[-1]["id"] in str(exc.value)
    assert Institution.objects.count() == 0


def test_unknown_quiz_interest_is_rejected(settings, tmp_path):
    seed_dir = tmp_path / "seed"
    shutil.copytree(settings.SEED_DIR, seed_dir)
    quiz = json.loads((seed_dir / "quiz.json").read_text("utf-8"))
    quiz["questions"][1]["options"][0]["value"]["interests"].append("ballet")
    (seed_dir / "quiz.json").write_text(json.dumps(quiz, ensure_ascii=False), "utf-8")
    settings.SEED_DIR = seed_dir

    with pytest.raises(CommandError) as exc:
        call_command("import_seed")
    assert "ballet" in str(exc.value)
```

Run: `docker compose run --rm api pytest tests/test_import_seed.py -v`
Expected: FAIL — `CommandError: Unknown command: 'import_seed'`.

- [ ] **Step 7: Команда імпорту**

Створіть порожні `backend/catalog/management/__init__.py` і `backend/catalog/management/commands/__init__.py`.

`backend/catalog/management/commands/import_seed.py`:

```python
import json

from django.conf import settings
from django.contrib.gis.geos import Point, Polygon
from django.core.exceptions import ValidationError
from django.core.management import BaseCommand, CommandError
from django.db import transaction
from django.utils.dateparse import parse_date, parse_datetime

from catalog.models import Category, City, Course, Direction, Institution, Registration
from quiz.models import Quiz, QuizOption, QuizQuestion

SEED_FILES = ("city", "categories", "directions", "institutions", "courses", "quiz")


def load_seed(seed_dir):
    data = {}
    for name in SEED_FILES:
        path = seed_dir / f"{name}.json"
        try:
            data[name] = json.loads(path.read_text("utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise CommandError(f"{path.name}: {exc}") from exc
    return data


def cross_checks(data):
    """Перевірки з check-seed.mjs, яких не покривають обмеження моделей."""
    errors = []
    for name in ("directions", "institutions", "courses"):
        seen = set()
        for item in data[name]:
            if item["id"] in seen:
                errors.append(f"{name}: дублікат id {item['id']}")
            seen.add(item["id"])
    for direction in data["directions"]:
        if direction["id"] != direction["slug"]:
            errors.append(f"directions {direction['id']}: id не дорівнює slug")
    direction_ids = {d["id"] for d in data["directions"]}
    used = {c["directionId"] for c in data["courses"]}
    for direction_id in sorted(direction_ids - used):
        errors.append(f"directions {direction_id}: немає жодного курсу")
    for question in data["quiz"]["questions"]:
        for option in question["options"]:
            for interest in option["value"].get("interests", []):
                if interest not in direction_ids:
                    errors.append(f"quiz {option['id']}: невідомий інтерес {interest}")
    if errors:
        raise CommandError("\n".join(errors))


def upsert(model, pk, label, **fields):
    obj = model.objects.filter(pk=pk).first() or model(pk=pk)
    for name, value in fields.items():
        setattr(obj, name, value)
    try:
        obj.full_clean()
    except ValidationError as exc:
        raise CommandError(f"{label} {pk}: {exc.message_dict}") from exc
    obj.save()
    return obj


class Command(BaseCommand):
    help = "Імпортує data/seed/*.json у БД (оновлює або створює записи за id)"

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="спершу видалити каталог, заявки й записи")
        parser.add_argument("--yes", action="store_true", help="не питати підтвердження для --reset")

    def handle(self, *args, reset=False, yes=False, **options):
        data = load_seed(settings.SEED_DIR)
        cross_checks(data)
        if reset and not yes:
            answer = input("Видалити всі заклади, курси, заявки й записи на курси? [так/ні] ")
            if answer.strip().lower() not in ("так", "y", "yes"):
                raise CommandError("Скасовано")

        with transaction.atomic():
            if reset:
                Registration.objects.all().delete()
                Course.objects.all().delete()
                Institution.objects.all().delete()
                Quiz.objects.all().delete()
            self.import_reference(data)
            self.import_institutions(data["institutions"])
            self.import_courses(data["courses"])
            self.import_quiz(data["quiz"])

        self.stdout.write(
            f"Імпортовано: закладів {len(data['institutions'])}, курсів {len(data['courses'])}, "
            f"напрямів {len(data['directions'])}"
        )

    def import_reference(self, data):
        city = data["city"]
        bounds = city["bounds"]
        upsert(
            City, city["id"], "city",
            name=city["name"],
            center=Point(city["center"]["lng"], city["center"]["lat"], srid=4326),
            bounds=Polygon.from_bbox((bounds["west"], bounds["south"], bounds["east"], bounds["north"])),
            zoom=city["zoom"],
            data_notice=city.get("dataNotice") or "",
        )
        for position, c in enumerate(data["categories"]):
            upsert(
                Category, c["code"], "categories",
                name=c["name"], name_en=c["nameEn"], color=c["color"], icon=c["icon"], position=position,
            )
        for position, d in enumerate(data["directions"]):
            upsert(
                Direction, d["id"], "directions",
                name=d["name"], category_id=d["categoryCode"], keywords=d["keywords"], position=position,
            )

    def import_institutions(self, institutions):
        for position, i in enumerate(institutions):
            obj = upsert(
                Institution, i["id"], "institutions",
                name=i["name"], short_name=i["shortName"], type=i["type"],
                short_description=i["shortDescription"], description=i["description"], logo_url=i["logoUrl"],
                address=i["address"], city_id=i["city"], location=Point(i["lng"], i["lat"], srid=4326),
                website=i["website"], phone=i["phone"], email=i["email"],
                contact_person=i.get("contactPerson"), has_shelter=i["hasShelter"],
                status=i["status"], source=i["source"], created_at=parse_datetime(i["createdAt"]),
                position=position,
            )
            obj.declared_directions.set(i["declaredDirectionIds"])

    def import_courses(self, courses):
        for position, c in enumerate(courses):
            upsert(
                Course, c["id"], "courses",
                institution_id=c["institutionId"], direction_id=c["directionId"], title=c["title"],
                short_description=c["shortDescription"], description=c["description"], audience=c["audience"],
                age_min=c["ageMin"], age_max=c["ageMax"], level=c["level"], format=c["format"],
                price=c["price"], price_unit=c["priceUnit"], duration_text=c["durationText"],
                schedule_text=c["scheduleText"], schedule_days=c["scheduleDays"],
                start_date=parse_date(c["startDate"]), language=c["language"],
                seats_total=c["seatsTotal"], seats_left=c["seatsLeft"], position=position,
            )

    def import_quiz(self, quiz):
        obj = upsert(Quiz, quiz["id"], "quiz", title=quiz["title"], subtitle=quiz.get("subtitle") or "")
        # Квіз — суто довідник, на нього ніщо не посилається: питання пересоздаємо цілком
        obj.questions.all().delete()
        for q_position, q in enumerate(quiz["questions"]):
            question = QuizQuestion.objects.create(
                quiz=obj, key=q["id"], position=q_position, title=q["title"], subtitle=q.get("subtitle") or "",
                type=q["type"], required=q["required"],
            )
            QuizOption.objects.bulk_create(
                QuizOption(
                    question=question, key=o["id"], position=o_position, label=o["label"],
                    emoji=o.get("emoji") or "", value=o["value"],
                )
                for o_position, o in enumerate(q["options"])
            )
```

- [ ] **Step 8: Тести проходять**

Run: `docker compose run --rm api pytest tests/test_models.py tests/test_import_seed.py -v`
Expected: 14 passed.

Run: `docker compose run --rm api python manage.py import_seed`
Expected: `Імпортовано: закладів 4, курсів 13, напрямів 11`.

- [ ] **Step 9: Commit**

```bash
git add backend/
git commit -m "feat(backend): моделі каталогу й квізу з PostGIS, імпорт data/seed"
```

---

### Task 4: Чисті сервіси — текст, фільтри, STEAM-профіль

**Files:**
- Create: `backend/catalog/services/__init__.py`, `backend/catalog/services/text.py`,
  `backend/catalog/services/filters.py`, `backend/catalog/services/steam_profile.py`
- Test: `backend/tests/test_services_text.py`, `backend/tests/test_services_filters.py`,
  `backend/tests/test_services_purity.py`

**Interfaces:**
- Consumes: `catalog.choices.STEAM_CODES`, `PUBLIC_STATUSES`.
- Produces (усі словники — з camelCase-ключами, як у JS):
  - `text.normalize_text(value) -> str`, `text.uk_sort_key(text) -> tuple`, `text.round1(n) -> float`
    (`Math.round(n*10)/10`), `text.js_to_fixed(value, digits) -> float` (`Number(v.toFixed(d))`),
    `text.js_number_str(value) -> str` (як `${n}` у JS).
  - `filters.index_by_id(items) -> dict`, `has_course_filters(filters) -> bool`,
    `is_publicly_visible(institution) -> bool`, `text_matches(query, fields) -> bool`,
    `course_matches(course, filters, ctx) -> bool` (`ctx = {"directions_by_id", "institutions_by_id"}`),
    `has_coordinates(point) -> bool`,
    `apply_filters(catalog, filters) -> list[{"institution", "courses", "matched_courses"}]`.
  - `steam_profile.empty_profile() -> dict`, `steam_profile.steam_profile(courses, declared_direction_ids,
    directions_by_id) -> {"S": int, ...}`.
- Формат `filters`: `{ q?, category?: list, direction?: list, ageFrom?, ageTo?, price?: 'free'|'paid',
  format?: list, type?: list, lat?, lng? }`.

- [ ] **Step 1: Тести, що падають**

`backend/tests/test_services_text.py`:

```python
from catalog.services.text import js_number_str, js_to_fixed, normalize_text, round1, uk_sort_key


def test_normalize_text():
    assert normalize_text("  Розв’язувати   ЗАДАЧІ ") == "розв'язувати задачі"
    assert normalize_text("Розвʼязувати") == "розв'язувати"
    assert normalize_text(None) == ""


def test_uk_sort_key_alphabet():
    words = ["ґудзик", "я", "їжак", "і", "и", "є", "е", "г", "д", "ь", "ю"]
    assert sorted(words, key=uk_sort_key) == ["г", "ґудзик", "д", "е", "є", "и", "і", "їжак", "ь", "ю", "я"]


def test_uk_sort_key_scripts_and_case():
    assert sorted(["Python", "3D-друк", "Астрономія", "аналіз"], key=uk_sort_key) == [
        "3D-друк",
        "аналіз",
        "Астрономія",
        "Python",
    ]


def test_js_rounding():
    assert round1(2.25) == 2.3  # Math.round(22.5) = 23
    assert round1(1.04999) == 1.0
    assert js_to_fixed(0.125, 2) == 0.13  # toFixed округлює точне значення половини вгору
    assert js_to_fixed(1.005, 2) == 1.0  # 1.005 у двійковому вигляді трохи менше
    assert js_to_fixed(0.6666666, 2) == 0.67


def test_js_number_str():
    assert js_number_str(3.0) == "3"
    assert js_number_str(2.5) == "2.5"
    assert js_number_str(0.1) == "0.1"
```

`backend/tests/test_services_filters.py`:

```python
from catalog.services.filters import (
    apply_filters,
    course_matches,
    has_coordinates,
    has_course_filters,
    index_by_id,
    text_matches,
)
from catalog.services.steam_profile import steam_profile

DIRECTIONS = [
    {"id": "robotics", "slug": "robotics", "name": "Робототехніка", "categoryCode": "T", "keywords": ["ардуїно", "lego"]},
    {"id": "astronomy", "slug": "astronomy", "name": "Астрономія", "categoryCode": "S", "keywords": ["космос"]},
]


def inst(id, status="approved", type="university", declared=()):
    return {"id": id, "name": f"Заклад {id}", "shortName": id.upper(), "type": type, "status": status,
            "declaredDirectionIds": list(declared)}


def course(id, institution_id, direction_id, age=(10, 14), price=0, format="offline", seats_left=5):
    return {"id": id, "institutionId": institution_id, "directionId": direction_id, "title": f"Курс {id}",
            "ageMin": age[0], "ageMax": age[1], "price": price, "format": format, "seatsLeft": seats_left,
            "startDate": "2026-10-03"}


CATALOG = {
    "directions": DIRECTIONS,
    "institutions": [inst("a"), inst("b", status="pending", type="center"), inst("c", status="rejected")],
    "courses": [
        course("a1", "a", "robotics", age=(10, 14), price=1200),
        course("a2", "a", "astronomy", age=(6, 9)),
        course("b1", "b", "astronomy", age=(14, 17), format="online"),
        course("c1", "c", "robotics"),
    ],
}


def ctx():
    return {"directions_by_id": index_by_id(DIRECTIONS), "institutions_by_id": index_by_id(CATALOG["institutions"])}


def ids_of(result):
    return [row["institution"]["id"] for row in result]


def test_has_course_filters():
    assert not has_course_filters({})
    assert not has_course_filters({"q": "  ", "type": ["center"], "lat": 50, "lng": 36})
    assert has_course_filters({"ageFrom": 0})
    assert has_course_filters({"q": "робот"})


def test_rejected_hidden_pending_public():
    assert ids_of(apply_filters(CATALOG, {})) == ["a", "b"]


def test_type_filter_is_not_a_course_filter():
    result = apply_filters(CATALOG, {"type": ["center"]})
    assert ids_of(result) == ["b"]
    assert len(result[0]["matched_courses"]) == 1


def test_lists_or_filters_and():
    result = apply_filters(CATALOG, {"category": ["S", "T"], "price": "free"})
    assert ids_of(result) == ["a", "b"]
    assert [c["id"] for c in result[0]["matched_courses"]] == ["a2"]


def test_age_overlap():
    assert ids_of(apply_filters(CATALOG, {"ageFrom": 15, "ageTo": 20})) == ["b"]
    assert ids_of(apply_filters(CATALOG, {"ageTo": 9})) == ["a"]


def test_paid_and_format():
    assert ids_of(apply_filters(CATALOG, {"price": "paid"})) == ["a"]
    assert ids_of(apply_filters(CATALOG, {"format": ["online"]})) == ["b"]


def test_q_matches_every_token_across_fields():
    assert course_matches(CATALOG["courses"][0], {"q": "Ардуїно заклад"}, ctx())
    assert not course_matches(CATALOG["courses"][0], {"q": "ардуїно космос"}, ctx())
    assert text_matches("", ["що завгодно"])


def test_has_coordinates():
    assert has_coordinates({"lat": 50.0, "lng": 36})
    assert not has_coordinates({"lat": 50.0})
    assert not has_coordinates({"lat": True, "lng": 36})


def test_steam_profile_uses_courses_then_declared():
    by_id = index_by_id(DIRECTIONS)
    assert steam_profile(CATALOG["courses"][:2], [], by_id) == {"S": 1, "T": 1, "E": 0, "A": 0, "M": 0}
    assert steam_profile([], ["robotics", "unknown"], by_id) == {"S": 0, "T": 1, "E": 0, "A": 0, "M": 0}
```

`backend/tests/test_services_purity.py`:

```python
import ast
from pathlib import Path

SERVICES = Path(__file__).resolve().parent.parent / "catalog" / "services"
FORBIDDEN = ("django", "rest_framework", "catalog.models", "catalog.selectors", "catalog.actions", "catalog.api")


def imported_modules(path):
    tree = ast.parse(path.read_text("utf-8"))
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            yield from (alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.level == 0:
            yield node.module


def test_services_are_pure():
    offenders = [
        f"{path.name}: {module}"
        for path in SERVICES.glob("*.py")
        for module in imported_modules(path)
        if module and module.startswith(FORBIDDEN)
    ]
    assert offenders == []
```

Run: `docker compose run --rm api pytest tests/test_services_text.py tests/test_services_filters.py tests/test_services_purity.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'catalog.services'`.

- [ ] **Step 2: Реалізація**

`backend/catalog/services/__init__.py`: порожній.

`backend/catalog/services/text.py`:

```python
# Текстові й числові помічники, що відтворюють поведінку JS з Node-версії.
import math
import re
from decimal import ROUND_HALF_UP, Decimal

_APOSTROPHES = re.compile(r"[’ʼ`‘]")
_SPACES = re.compile(r"\s+")

# Порядок як у Intl.Collator('uk'): пробіли й розділові знаки < цифри < кирилиця < латиниця < інше
_UK_ALPHABET = "абвгґдеєжзиіїйклмнопрстуфхцчшщьюя"
_UK_INDEX = {letter: index for index, letter in enumerate(_UK_ALPHABET)}


def normalize_text(value):
    text = "" if value is None else str(value)
    return _SPACES.sub(" ", _APOSTROPHES.sub("'", text.lower())).strip()


def _char_key(char):
    if char in _UK_INDEX:
        return (2, _UK_INDEX[char])
    if char.isdigit():
        return (1, ord(char))
    if "a" <= char <= "z":
        return (3, ord(char))
    if char.isalpha():
        return (4, ord(char))
    return (0, ord(char))


def uk_sort_key(text):
    # Спершу без урахування регістру; за рівності — малі літери перед великими (як ICU)
    primary = tuple(_char_key(char) for char in text.lower())
    tertiary = tuple(char.isupper() for char in text)
    return (primary, tertiary)


def round1(value):
    # Math.round(n * 10) / 10 — половина округлюється вгору
    return math.floor(value * 10 + 0.5) / 10


def js_to_fixed(value, digits):
    # Number(value.toFixed(digits)) — точне двійкове значення, половина вгору
    quantum = Decimal(1).scaleb(-digits)
    return float(Decimal(value).quantize(quantum, rounding=ROUND_HALF_UP))


def js_number_str(value):
    number = float(value)
    return str(int(number)) if number.is_integer() else repr(number)
```

`backend/catalog/services/filters.py`:

```python
# Чисті функції фільтрації каталогу. Отримують уже провалідовані фільтри:
# { q?, category?[], direction?[], ageFrom?, ageTo?, price?: 'free'|'paid', format?[], type?[] }
# Списки — АБО всередині, різні фільтри — І між собою.
import math

from catalog.choices import PUBLIC_STATUSES

from .text import normalize_text


def index_by_id(items):
    return {item["id"]: item for item in items}


def has_course_filters(filters):
    return bool(
        normalize_text(filters.get("q"))
        or filters.get("category")
        or filters.get("direction")
        or filters.get("ageFrom") is not None
        or filters.get("ageTo") is not None
        or filters.get("price")
        or filters.get("format")
    )


def is_publicly_visible(institution):
    return institution["status"] in PUBLIC_STATUSES


def has_coordinates(point):
    def finite(value):
        return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)

    return finite(point.get("lat")) and finite(point.get("lng"))


# Усі слова запиту мають зустрітися серед полів (підрядком, без регістру)
def text_matches(query, fields):
    tokens = [token for token in normalize_text(query).split(" ") if token]
    if not tokens:
        return True
    haystack = normalize_text(" ".join(field for field in fields if field))
    return all(token in haystack for token in tokens)


def course_matches(course, filters, ctx):
    direction = ctx["directions_by_id"].get(course["directionId"]) or {}

    if filters.get("category") and direction.get("categoryCode") not in filters["category"]:
        return False
    if filters.get("direction") and course["directionId"] not in filters["direction"]:
        return False

    age_from = filters.get("ageFrom")
    age_to = filters.get("ageTo")
    if age_to is not None and course["ageMin"] > age_to:
        return False
    if age_from is not None and course["ageMax"] < age_from:
        return False

    price = filters.get("price")
    if price == "free" and course["price"] != 0:
        return False
    if price == "paid" and not (course["price"] is not None and course["price"] > 0):
        return False

    if filters.get("format") and course["format"] not in filters["format"]:
        return False

    if filters.get("q"):
        institution = ctx["institutions_by_id"].get(course["institutionId"]) or {}
        fields = [
            course["title"],
            direction.get("name"),
            *direction.get("keywords", []),
            institution.get("name"),
            institution.get("shortName"),
        ]
        if not text_matches(filters["q"], fields):
            return False

    return True


# Правило карти: публічний заклад показуємо, якщо він проходить фільтр типу і
# (фільтрів курсів немає АБО в нього є хоча б один відповідний курс).
def apply_filters(catalog, filters=None):
    filters = filters or {}
    ctx = {
        "directions_by_id": index_by_id(catalog["directions"]),
        "institutions_by_id": index_by_id(catalog["institutions"]),
    }
    course_filter_active = has_course_filters(filters)

    courses_by_institution = {}
    for course in catalog["courses"]:
        courses_by_institution.setdefault(course["institutionId"], []).append(course)

    result = []
    for institution in catalog["institutions"]:
        if not is_publicly_visible(institution):
            continue
        if filters.get("type") and institution["type"] not in filters["type"]:
            continue
        own = courses_by_institution.get(institution["id"], [])
        matched = [c for c in own if course_matches(c, filters, ctx)] if course_filter_active else own
        if course_filter_active and not matched:
            continue
        result.append({"institution": institution, "courses": own, "matched_courses": matched})
    return result
```

`backend/catalog/services/steam_profile.py`:

```python
from catalog.choices import STEAM_CODES


def empty_profile():
    return {code: 0 for code in STEAM_CODES}


# Кількість курсів закладу в кожній категорії STEAM — дані для кільця на мітці.
# Якщо курсів немає (свіжа заявка), рахуємо заявлені напрямки.
def steam_profile(courses, declared_direction_ids, directions_by_id):
    profile = empty_profile()
    direction_ids = [c["directionId"] for c in courses] if courses else (declared_direction_ids or [])
    for direction_id in direction_ids:
        code = (directions_by_id.get(direction_id) or {}).get("categoryCode")
        if code in profile:
            profile[code] += 1
    return profile
```

- [ ] **Step 3: Тести проходять**

Run: `docker compose run --rm api pytest tests/test_services_text.py tests/test_services_filters.py tests/test_services_purity.py -v`
Expected: 15 passed.

- [ ] **Step 4: Commit**

```bash
git add backend/catalog/services backend/tests/test_services_*.py
git commit -m "feat(backend): порт фільтрів, STEAM-профілю й текстових помічників"
```

---

### Task 5: Чисті сервіси — відповіді каталогу та рекомендації

**Files:**
- Create: `backend/catalog/services/catalog.py`, `backend/catalog/services/recommend.py`
- Test: `backend/tests/test_services_catalog.py`, `backend/tests/test_services_recommend.py`

**Interfaces:**
- Consumes: Task 4 (`filters`, `steam_profile`, `text`), `catalog.choices`.
- Формат `catalog` (готує `selectors.load_catalog` у Task 7):
  `{ "city", "categories", "directions", "institutions", "courses", "distances": {institution_id: km} }`.
  Відстань для закладу береться з `catalog["distances"]`, а не рахується в сервісах.
- Produces:
  - `catalog.to_public_institution(institution) -> dict`
  - `catalog.build_meta(reference) -> dict` (`reference = {"city", "categories", "directions"}`)
  - `catalog.build_institution_markers(catalog, filters) -> {"summary", "items"}`
  - `catalog.build_institution_card(catalog, id, filters) -> dict | None`
  - `catalog.build_direction_courses(catalog, id, slug, filters) -> dict | None | {"directionNotFound": True}`
  - `catalog.build_course_details(course, institution, directions, categories) -> dict | None`
  - `catalog.build_suggestions(catalog, query) -> {"directions", "institutions", "courses"}`
  - `catalog.to_recommendation_items(items) -> list`
  - `recommend.build_map_filters(input, directions) -> dict`
  - `recommend.recommend(input, catalog, limit=3) -> list[{"course", "institution", "direction", "score", "reasons", "distanceKm"}]`

- [ ] **Step 1: Тести, що падають**

`backend/tests/test_services_catalog.py`:

```python
from catalog.services.catalog import (
    build_direction_courses,
    build_institution_card,
    build_institution_markers,
    build_suggestions,
    to_public_institution,
)

DIRECTIONS = [
    {"id": "robotics", "slug": "robotics", "name": "Робототехніка", "categoryCode": "T", "keywords": []},
    {"id": "astronomy", "slug": "astronomy", "name": "Астрономія", "categoryCode": "S", "keywords": ["космос"]},
    {"id": "animation", "slug": "animation", "name": "Анімація", "categoryCode": "A", "keywords": []},
]


def inst(id, **extra):
    return {"id": id, "name": f"Заклад {id}", "shortName": f"Заклад {id}", "type": "center", "lat": 50.0,
            "lng": 36.2, "address": "вул. Сумська, 1", "status": "approved", "declaredDirectionIds": [],
            "contactPerson": "Олена", **extra}


def course(id, institution_id, direction_id, start="2026-10-03", price=0):
    return {"id": id, "institutionId": institution_id, "directionId": direction_id, "title": f"Курс {id}",
            "shortDescription": "", "ageMin": 6, "ageMax": 12, "level": "beginner", "format": "offline",
            "price": price, "priceUnit": "course", "durationText": "", "scheduleText": "", "startDate": start,
            "seatsTotal": None, "seatsLeft": None}


def catalog(**overrides):
    base = {
        "directions": DIRECTIONS,
        "categories": [],
        "institutions": [inst("a"), inst("b", declaredDirectionIds=["animation"])],
        "courses": [course("a1", "a", "robotics", price=100), course("a2", "a", "astronomy")],
        "distances": {},
    }
    return {**base, **overrides}


def test_public_institution_strips_contact_person():
    assert "contactPerson" not in to_public_institution(inst("a"))


def test_markers_summary_and_profile():
    result = build_institution_markers(catalog(), {"price": "free"})
    assert result["summary"] == {"institutions": 1, "courses": 1}
    item = result["items"][0]
    assert item["courseCount"] == 2 and item["matchedCourseCount"] == 1
    assert item["steamProfile"] == {"S": 1, "T": 1, "E": 0, "A": 0, "M": 0}
    assert item["distanceKm"] is None


def test_markers_sorted_by_distance_when_near():
    data = catalog(distances={"a": 3.04, "b": 1.25})
    result = build_institution_markers(data, {"lat": 50.0, "lng": 36.2})
    assert [(i["id"], i["distanceKm"]) for i in result["items"]] == [("b", 1.3), ("a", 3.0)]


def test_card_lists_directions_in_steam_order_including_declared():
    card = build_institution_card(catalog(), "a", {"price": "free"})
    assert [d["slug"] for d in card["directions"]] == ["astronomy", "robotics"]
    assert card["directions"][1] == {"slug": "robotics", "name": "Робототехніка", "categoryCode": "T",
                                     "courseCount": 1, "matchedCourseCount": 0}
    assert "contactPerson" not in card["institution"]
    declared = build_institution_card(catalog(), "b", {})
    assert [d["slug"] for d in declared["directions"]] == ["animation"]


def test_card_hidden_for_rejected():
    assert build_institution_card(catalog(institutions=[inst("a", status="rejected")]), "a", {}) is None


def test_direction_courses_matching_first_then_by_date():
    data = catalog(courses=[
        course("x1", "a", "robotics", start="2026-10-01", price=100),
        course("x2", "a", "robotics", start="2026-10-10"),
    ])
    result = build_direction_courses(data, "a", "robotics", {"price": "free"})
    assert [(c["id"], c["matchesFilters"]) for c in result["items"]] == [("x2", True), ("x1", False)]
    assert build_direction_courses(data, "a", "nope", {}) == {"directionNotFound": True}
    assert build_direction_courses(data, "zzz", "robotics", {}) is None


def test_suggestions_prefix_first_and_only_offered_directions():
    # «ро» є і в «астРОномія», але збіг з початку назви — першим
    result = build_suggestions(catalog(), "ро")
    assert [d["slug"] for d in result["directions"]] == ["robotics", "astronomy"]
    result = build_suggestions(catalog(), "заклад")
    assert [i["id"] for i in result["institutions"]] == ["a", "b"]
```

`backend/tests/test_services_recommend.py`:

```python
from catalog.services.recommend import build_map_filters, recommend

DIRECTIONS = [
    {"id": "robotics", "slug": "robotics", "name": "Робототехніка", "categoryCode": "T", "keywords": []},
    {"id": "programming", "slug": "programming", "name": "Програмування", "categoryCode": "T", "keywords": []},
    {"id": "astronomy", "slug": "astronomy", "name": "Астрономія", "categoryCode": "S", "keywords": []},
]


def inst(id, status="approved"):
    return {"id": id, "name": id, "shortName": id, "lat": 50.0, "lng": 36.2, "status": status}


def course(id, institution_id, direction_id, age=(10, 14), price=0, format="offline", seats_left=5,
           start="2026-10-03"):
    return {"id": id, "institutionId": institution_id, "directionId": direction_id, "title": id,
            "shortDescription": "", "ageMin": age[0], "ageMax": age[1], "level": "beginner", "format": format,
            "price": price, "priceUnit": "course", "durationText": "", "scheduleText": "", "startDate": start,
            "seatsTotal": 10 if seats_left is not None else None, "seatsLeft": seats_left}


def data(courses, institutions=None, distances=None):
    return {"directions": DIRECTIONS, "institutions": institutions or [inst("a"), inst("b"), inst("p", "pending")],
            "courses": courses, "distances": distances or {}}


def test_hard_conditions():
    courses = [
        course("too-old", "a", "robotics", age=(15, 17)),
        course("paid", "a", "robotics", price=500),
        course("full", "a", "robotics", seats_left=0),
        course("pending", "p", "robotics"),
        course("ok", "b", "robotics"),
    ]
    result = recommend({"age": 11, "interests": [], "format": [], "price": "free"}, data(courses))
    assert [r["course"]["id"] for r in result] == ["ok"]
    assert result[0]["score"] == 1


def test_direction_beats_category_and_reasons():
    courses = [course("prog", "a", "programming"), course("robo", "b", "robotics")]
    result = recommend({"age": 11, "interests": ["robotics"], "format": ["offline"], "price": "any"}, data(courses))
    assert [r["course"]["id"] for r in result] == ["robo", "prog"]
    assert result[0]["reasons"] == [
        "Підходить за віком (10–14 років)",
        "Ваш інтерес: Робототехніка",
        "Формат: офлайн",
        "Безкоштовно",
    ]
    assert result[1]["reasons"][1] == "Схожий напрям: Програмування"


def test_distance_reason_and_rounding():
    courses = [course("robo", "a", "robotics")]
    result = recommend(
        {"age": 11, "interests": [], "format": [], "price": "any", "lat": 50.0, "lng": 36.2},
        data(courses, distances={"a": 2.96}),
    )
    assert result[0]["distanceKm"] == 3.0
    assert result[0]["reasons"][-1] == "3 км від вас"
    assert result[0]["score"] == 0.7  # 0.2 * (1 - 3/10) / 0.2


def test_one_course_per_institution_first():
    courses = [
        course("a1", "a", "robotics", start="2026-10-01"),
        course("a2", "a", "robotics", start="2026-10-02"),
        course("b1", "b", "astronomy", start="2026-10-03"),
    ]
    result = recommend({"age": 11, "interests": ["robotics", "S"], "format": [], "price": "any"}, data(courses))
    assert [r["course"]["id"] for r in result] == ["a1", "a2", "b1"]
    result = recommend({"age": 11, "interests": [], "format": [], "price": "any"}, data(courses), limit=2)
    assert [r["course"]["id"] for r in result] == ["a1", "b1"]


def test_build_map_filters():
    assert build_map_filters({"age": 11, "interests": ["robotics", "S"], "format": ["online"], "price": "free"},
                             DIRECTIONS) == {
        "ageFrom": 11, "ageTo": 11, "direction": ["robotics"], "category": ["S"], "format": ["online"],
        "price": "free",
    }
    assert build_map_filters({"age": 8, "interests": [], "format": [], "price": "any"}, DIRECTIONS) == {
        "ageFrom": 8, "ageTo": 8,
    }
```

Run: `docker compose run --rm api pytest tests/test_services_catalog.py tests/test_services_recommend.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'catalog.services.catalog'`.

- [ ] **Step 2: `catalog.py`**

`backend/catalog/services/catalog.py`:

```python
# Формування відповідей API з «сирих» даних. Чисті функції без I/O.
# catalog: { city, categories, directions, institutions, courses, distances }
from catalog.choices import AGE_GROUPS, FORMATS, INSTITUTION_TYPES, LEVELS, PRICE_OPTIONS, STEAM_CODES

from .filters import (
    apply_filters,
    course_matches,
    has_coordinates,
    index_by_id,
    is_publicly_visible,
    text_matches,
)
from .steam_profile import steam_profile
from .text import normalize_text, round1, uk_sort_key

SUGGEST_LIMIT = 5
PRIVATE_INSTITUTION_FIELDS = ("contactPerson",)


def to_public_institution(institution):
    return {key: value for key, value in institution.items() if key not in PRIVATE_INSTITUTION_FIELDS}


def direction_summary(direction):
    return {"slug": direction["slug"], "name": direction["name"], "categoryCode": direction["categoryCode"]}


# Короткі дані курсу для списків (без опису та розкладу по днях)
def course_summary(course):
    keys = ("id", "title", "shortDescription", "ageMin", "ageMax", "level", "format", "price", "priceUnit",
            "durationText", "scheduleText", "startDate", "seatsTotal", "seatsLeft")
    return {key: course[key] for key in keys}


def _steam_index(code):
    return STEAM_CODES.index(code) if code in STEAM_CODES else -1


def _direction_order(direction):
    return (_steam_index(direction["categoryCode"]), uk_sort_key(direction["name"]))


def _filter_context(catalog):
    return {
        "directions_by_id": index_by_id(catalog["directions"]),
        "institutions_by_id": index_by_id(catalog["institutions"]),
    }


def _find_visible_institution(catalog, id):
    institution = next((i for i in catalog["institutions"] if i["id"] == id), None)
    return institution if institution and is_publicly_visible(institution) else None


def _courses_of(catalog, institution_id):
    return [c for c in catalog["courses"] if c["institutionId"] == institution_id]


# GET /api/meta
def build_meta(reference):
    city = {key: value for key, value in reference["city"].items() if key != "dataNotice"}
    return {
        "city": city,
        "categories": reference["categories"],
        "directions": [
            {key: d[key] for key in ("id", "slug", "name", "categoryCode", "keywords")} for d in reference["directions"]
        ],
        "institutionTypes": list(INSTITUTION_TYPES),
        "formats": list(FORMATS),
        "ageGroups": list(AGE_GROUPS),
        "levels": list(LEVELS),
        "priceOptions": list(PRICE_OPTIONS),
        "dataNotice": reference["city"]["dataNotice"],
    }


# GET /api/institutions
def build_institution_markers(catalog, filters):
    directions_by_id = index_by_id(catalog["directions"])
    with_location = has_coordinates(filters)

    items = []
    for row in apply_filters(catalog, filters):
        institution = row["institution"]
        items.append({
            "id": institution["id"],
            "name": institution["name"],
            "shortName": institution["shortName"],
            "type": institution["type"],
            "lat": institution["lat"],
            "lng": institution["lng"],
            "address": institution["address"],
            "status": institution["status"],
            "courseCount": len(row["courses"]),
            "matchedCourseCount": len(row["matched_courses"]),
            "steamProfile": steam_profile(row["courses"], institution["declaredDirectionIds"], directions_by_id),
            "distanceKm": round1(catalog["distances"][institution["id"]]) if with_location else None,
        })

    if with_location:
        items.sort(key=lambda item: item["distanceKm"])

    return {
        "summary": {
            "institutions": len(items),
            "courses": sum(item["matchedCourseCount"] for item in items),
        },
        "items": items,
    }


# GET /api/institutions/:id — None, якщо заклад не існує або відхилений
def build_institution_card(catalog, id, filters):
    institution = _find_visible_institution(catalog, id)
    if institution is None:
        return None

    ctx = _filter_context(catalog)
    courses = _courses_of(catalog, id)

    stats = {}
    for course in courses:
        stat = stats.setdefault(course["directionId"], {"courseCount": 0, "matchedCourseCount": 0})
        stat["courseCount"] += 1
        if course_matches(course, filters, ctx):
            stat["matchedCourseCount"] += 1
    for direction_id in institution["declaredDirectionIds"]:
        stats.setdefault(direction_id, {"courseCount": 0, "matchedCourseCount": 0})

    directions = [
        {**direction_summary(ctx["directions_by_id"][direction_id]), **stat}
        for direction_id, stat in stats.items()
        if direction_id in ctx["directions_by_id"]
    ]
    directions.sort(key=_direction_order)

    return {
        "institution": {
            **to_public_institution(institution),
            "courseCount": len(courses),
            "steamProfile": steam_profile(courses, institution["declaredDirectionIds"], ctx["directions_by_id"]),
        },
        "directions": directions,
    }


# GET /api/institutions/:id/directions/:slug/courses
# None — заклад не знайдено; {"directionNotFound": True} — невідомий напрямок
def build_direction_courses(catalog, id, slug, filters):
    institution = _find_visible_institution(catalog, id)
    if institution is None:
        return None

    direction = next((d for d in catalog["directions"] if d["slug"] == slug), None)
    if direction is None:
        return {"directionNotFound": True}

    ctx = _filter_context(catalog)
    items = [
        {**course_summary(c), "matchesFilters": course_matches(c, filters, ctx)}
        for c in _courses_of(catalog, id)
        if c["directionId"] == direction["id"]
    ]
    items.sort(key=lambda item: (not item["matchesFilters"], item["startDate"]))

    return {
        "institution": {"id": institution["id"], "name": institution["name"], "shortName": institution["shortName"]},
        "direction": direction_summary(direction),
        "items": items,
    }


# GET /api/courses/:id — None, якщо курс не існує або його заклад прихований
def build_course_details(course, institution, directions, categories):
    if course is None or institution is None or not is_publicly_visible(institution):
        return None

    direction = next((d for d in directions if d["id"] == course["directionId"]), None)
    category = next((c for c in categories if direction and c["code"] == direction["categoryCode"]), None)
    institution_keys = ("id", "name", "shortName", "type", "address", "lat", "lng", "website", "phone", "email",
                        "status")

    return {
        "course": course,
        "institution": {key: institution[key] for key in institution_keys},
        "direction": direction_summary(direction) if direction else None,
        "category": {"code": category["code"], "name": category["name"], "color": category["color"]}
        if category
        else None,
    }


# Збіги з початку назви — першими, далі за алфавітом
def _rank_by_prefix(items, query, label_of):
    q = normalize_text(query)
    ranked = sorted(
        items,
        key=lambda item: (not normalize_text(label_of(item)).startswith(q), uk_sort_key(label_of(item))),
    )
    return ranked[:SUGGEST_LIMIT]


# GET /api/search/suggest
def build_suggestions(catalog, query):
    visible_institutions = [i for i in catalog["institutions"] if is_publicly_visible(i)]
    institutions_by_id = index_by_id(visible_institutions)
    visible_courses = [c for c in catalog["courses"] if c["institutionId"] in institutions_by_id]
    offered_direction_ids = {c["directionId"] for c in visible_courses}

    directions = [
        d for d in catalog["directions"]
        if d["id"] in offered_direction_ids and text_matches(query, [d["name"], *d["keywords"]])
    ]
    institutions = [i for i in visible_institutions if text_matches(query, [i["name"], i["shortName"]])]
    courses = [c for c in visible_courses if text_matches(query, [c["title"]])]
    slug_by_id = {d["id"]: d["slug"] for d in catalog["directions"]}

    return {
        "directions": [direction_summary(d) for d in _rank_by_prefix(directions, query, lambda d: d["name"])],
        "institutions": [
            {"id": i["id"], "shortName": i["shortName"], "type": i["type"]}
            for i in _rank_by_prefix(institutions, query, lambda i: i["shortName"])
        ],
        "courses": [
            {
                "id": c["id"],
                "title": c["title"],
                "institutionId": c["institutionId"],
                "institutionShortName": institutions_by_id[c["institutionId"]]["shortName"],
                "directionSlug": slug_by_id.get(c["directionId"]),
            }
            for c in _rank_by_prefix(courses, query, lambda c: c["title"])
        ],
    }


# POST /api/recommendations — елементи з recommend() у формат API
def to_recommendation_items(items):
    return [
        {
            "course": course_summary(item["course"]),
            "institution": {key: item["institution"][key] for key in ("id", "name", "shortName", "lat", "lng")},
            "direction": direction_summary(item["direction"]),
            "score": item["score"],
            "reasons": item["reasons"],
            "distanceKm": item["distanceKm"],
        }
        for item in items
    ]
```

- [ ] **Step 3: `recommend.py`**

`backend/catalog/services/recommend.py`:

```python
# Скоринг квізу «Що обрати дитині?».
# input: { age, interests: (slug напрямку | код категорії)[], format: [], price: 'free'|'any', lat?, lng? }
#
# Жорсткі умови: вік у межах курсу, «лише безкоштовні», є вільні місця, заклад approved,
# збіг з інтересами (за напрямком або категорією), якщо інтереси вказані.
# М'які (бали): точний напрямок > категорія, бажаний формат, близькість.
from catalog.choices import FORMATS, STEAM_CODES, label_of

from .filters import has_coordinates, index_by_id
from .text import js_number_str, js_to_fixed

WEIGHTS = {"directionMatch": 0.5, "categoryMatch": 0.25, "format": 0.3, "distance": 0.2}
DISTANCE_HORIZON_KM = 10


def _resolve_interests(interests, directions_by_id):
    direction_ids = set()
    category_codes = set()
    for item in interests or []:
        if item in directions_by_id:
            direction_ids.add(item)
            category_codes.add(directions_by_id[item]["categoryCode"])
        elif item in STEAM_CODES:
            category_codes.add(item)
    return direction_ids, category_codes


def build_map_filters(input, directions):
    directions_by_id = index_by_id(directions)
    interests = input.get("interests") or []
    direction = [i for i in interests if i in directions_by_id]
    category = [i for i in interests if i in STEAM_CODES]

    filters = {"ageFrom": input["age"], "ageTo": input["age"]}
    if direction:
        filters["direction"] = direction
    if category:
        filters["category"] = category
    if input.get("format"):
        filters["format"] = input["format"]
    if input.get("price") == "free":
        filters["price"] = "free"
    return filters


def _score_course(course, input, direction, interests, raw_distance_km):
    direction_ids, category_codes = interests
    has_interests = bool(direction_ids or category_codes)
    has_format_pref = bool(input.get("format"))
    has_location = has_coordinates(input)

    reasons = [f"Підходить за віком ({course['ageMin']}–{course['ageMax']} років)"]
    score = 0
    max_score = 0

    if has_interests:
        max_score += WEIGHTS["directionMatch"]
        if course["directionId"] in direction_ids:
            score += WEIGHTS["directionMatch"]
            reasons.append(f"Ваш інтерес: {direction['name']}")
        elif direction["categoryCode"] in category_codes:
            score += WEIGHTS["categoryMatch"]
            reasons.append(f"Схожий напрям: {direction['name']}")
        else:
            return None

    if has_format_pref:
        max_score += WEIGHTS["format"]
        if course["format"] in input["format"]:
            score += WEIGHTS["format"]
            reasons.append(f"Формат: {label_of(FORMATS, course['format']).lower()}")

    if course["price"] == 0:
        reasons.append("Безкоштовно")

    distance_km = None
    if has_location:
        distance_km = js_to_fixed(raw_distance_km, 1)
        max_score += WEIGHTS["distance"]
        score += WEIGHTS["distance"] * max(0, 1 - distance_km / DISTANCE_HORIZON_KM)
        reasons.append(f"{js_number_str(distance_km)} км від вас")

    # Без вподобань усі підхожі курси рівноцінні
    normalized = score / max_score if max_score > 0 else 1
    return {"score": js_to_fixed(normalized, 2), "raw_score": normalized, "reasons": reasons, "distanceKm": distance_km}


def _candidate_order(candidate):
    return (-candidate["raw_score"], candidate["course"]["startDate"], candidate["course"]["id"])


def recommend(input, catalog, limit=3):
    directions_by_id = index_by_id(catalog["directions"])
    institutions_by_id = index_by_id(catalog["institutions"])
    interests = _resolve_interests(input.get("interests"), directions_by_id)
    age = input.get("age")

    candidates = []
    for course in catalog["courses"]:
        institution = institutions_by_id.get(course["institutionId"])
        direction = directions_by_id.get(course["directionId"])
        if institution is None or institution["status"] != "approved" or direction is None:
            continue
        if age is not None and (age < course["ageMin"] or age > course["ageMax"]):
            continue
        if input.get("price") == "free" and course["price"] != 0:
            continue
        if course["seatsLeft"] == 0:
            continue
        scored = _score_course(course, input, direction, interests, catalog["distances"].get(institution["id"]))
        if scored:
            candidates.append({"course": course, "institution": institution, "direction": direction, **scored})
    candidates.sort(key=_candidate_order)

    # Спершу найкращий курс кожного закладу — на карті підсвічуються різні точки
    picked = []
    seen_institutions = set()
    for candidate in candidates:
        if len(picked) == limit:
            break
        if candidate["institution"]["id"] in seen_institutions:
            continue
        seen_institutions.add(candidate["institution"]["id"])
        picked.append(candidate)
    for candidate in candidates:
        if len(picked) == limit:
            break
        if not any(candidate is p for p in picked):
            picked.append(candidate)
    picked.sort(key=_candidate_order)

    return [{key: value for key, value in item.items() if key != "raw_score"} for item in picked]
```

- [ ] **Step 4: Тести проходять**

Run: `docker compose run --rm api pytest tests/test_services_catalog.py tests/test_services_recommend.py tests/test_services_purity.py -v`
Expected: 13 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/catalog/services backend/tests/test_services_*.py
git commit -m "feat(backend): порт відповідей каталогу й рекомендацій"
```

---

### Task 6: Валідація query й тіл запитів

**Files:**
- Create: `backend/catalog/api/validation.py`
- Test: `backend/tests/test_validation.py`

**Interfaces:**
- Consumes: `catalog.choices`, `catalog.errors.AppError`.
- Produces (усі кидають `AppError(VALIDATION_ERROR, message, details)` при помилці):
  - `parse_id(value) -> str` (path `id`), `parse_direction_params(id, slug) -> tuple[str, str]`
  - `parse_catalog_filters(query_dict, direction_ids) -> dict` — `query_dict`: Django `QueryDict`
  - `parse_suggest_query(query_dict) -> str`
  - `parse_submission(data, bounds, direction_ids) -> dict` — `bounds = {"south","west","north","east"}`;
    повідомлення «Некоректні дані форми»
  - `parse_registration(data) -> dict` — повідомлення «Некоректні дані форми»
  - `parse_recommendations(data, direction_ids) -> dict` — повідомлення «Некоректні відповіді квізу»
- Рішення: замість DRF-серіалізаторів — маленький модуль-валідатор. Причина: zod-семантика (кілька помилок на поле,
  `preprocess`, порядок помилок за ключами схеми, порожні значення → відсутні, суворі типи JSON) у DRF
  потребує перевизначення `run_validation` у кожному полі; явні функції коротші й прозоріші. Формат `details`
  такий самий: `[{ path, message }]`, шлях через крапку (`declaredDirectionIds.0`).

Українські повідомлення замість англійських zod-замовчувань (свідоме відхилення):

| Де | Повідомлення |
|---|---|
| невідомий елемент `category` / `direction` / `format` / `type` у фільтрах | «Невідома категорія» / «Невідомий напрямок» / «Невідомий формат» / «Невідомий тип закладу» |
| `price` у фільтрах | «Ціна: free або paid» |
| `q` не рядок | «Очікується рядок» |
| `contact` > 200 | «Контакт: максимум 200 символів» |
| `website` > 300 | «Посилання: максимум 300 символів» |
| `email` > 200 | «Email: максимум 200 символів» |
| необовʼязковий текст не рядок | «Очікується рядок» |
| `declaredDirectionIds.N` невідомий / забагато | «Невідомий напрямок» / «Забагато напрямків» |
| квіз: немає `age` | «Вік: обовʼязкове поле» |
| квіз: `interests` не список / > 20 | «Очікується список інтересів» / «Максимум 20 інтересів» |
| квіз: `format` не список / елемент | «Очікується список форматів» / «Невідомий формат» |
| квіз: `price` | «Ціна: free або any» |
| квіз: `lat`/`lng` не число / поза межами | «Координата має бути числом» / «Координата має бути в межах -90…90» (`-180…180`) |

- [ ] **Step 1: Тести, що падають**

`backend/tests/test_validation.py`:

```python
import pytest
from django.http import QueryDict

from catalog.api.validation import (
    parse_catalog_filters,
    parse_id,
    parse_recommendations,
    parse_registration,
    parse_submission,
    parse_suggest_query,
)
from catalog.errors import AppError

DIRECTIONS = ["robotics", "astronomy"]
BOUNDS = {"south": 49.88, "west": 36.1, "north": 50.1, "east": 36.46}


def details(fn, *args):
    with pytest.raises(AppError) as exc:
        fn(*args)
    assert exc.value.code == "VALIDATION_ERROR"
    return exc.value.message, exc.value.details


def q(text):
    return QueryDict(text)


def test_filters_lists_and_empty_values():
    assert parse_catalog_filters(q("category=s,t&category=S&direction=robotics&format=&price=&q=%20"), DIRECTIONS) == {
        "category": ["S", "T"],
        "direction": ["robotics"],
    }
    assert parse_catalog_filters(q("category[]=E&type=center"), DIRECTIONS) == {"category": ["E"], "type": ["center"]}


def test_filters_numbers():
    assert parse_catalog_filters(q("ageFrom=6&ageTo=9&lat=49.99&lng=36.23"), DIRECTIONS) == {
        "ageFrom": 6, "ageTo": 9, "lat": 49.99, "lng": 36.23,
    }


def test_filters_errors():
    message, errors = details(parse_catalog_filters, q("ageFrom=abc&direction=ballet&category=x"), DIRECTIONS)
    assert message == "Некоректні параметри запиту"
    assert errors == [
        {"path": "category.0", "message": "Невідома категорія"},
        {"path": "direction.0", "message": "Невідомий напрямок"},
        {"path": "ageFrom", "message": "Вік має бути числом"},
    ]
    _, errors = details(parse_catalog_filters, q("ageFrom=10&ageTo=5&lat=50"), DIRECTIONS)
    assert errors == [
        {"path": "ageTo", "message": "ageTo має бути ≥ ageFrom"},
        {"path": "lng", "message": "lat і lng передаються разом"},
    ]
    _, errors = details(parse_catalog_filters, q("ageFrom=-1.5"), DIRECTIONS)
    assert errors == [
        {"path": "ageFrom", "message": "Вік має бути цілим числом"},
        {"path": "ageFrom", "message": "Вік не може бути відʼємним"},
    ]


def test_id_and_suggest():
    assert parse_id("khpi-robotics") == "khpi-robotics"
    _, errors = details(parse_id, "bad_id!")
    assert errors == [{"path": "id", "message": "Некоректний ідентифікатор"}]
    assert parse_suggest_query(q("q=%20%20ро%20%20бот%20")) == "ро бот"
    _, errors = details(parse_suggest_query, q(""))
    assert errors == [{"path": "q", "message": "Параметр обовʼязковий"}]
    _, errors = details(parse_suggest_query, q("q=a"))
    assert errors == [{"path": "q", "message": "Мінімум 2 символи"}]


SUBMISSION = {"name": " Школа ", "type": "center", "address": "вул. Сумська, 1", "lat": 50.0, "lng": 36.23,
              "phone": "+380 (57) 700-00-00", "email": "", "declaredDirectionIds": ["robotics", "robotics"]}


def test_submission_ok():
    result = parse_submission(SUBMISSION, BOUNDS, DIRECTIONS)
    assert result["name"] == "Школа"
    assert result["declaredDirectionIds"] == ["robotics"]
    assert "email" not in result


def test_submission_errors():
    message, errors = details(parse_submission, {}, BOUNDS, DIRECTIONS)
    assert message == "Некоректні дані форми"
    assert errors == [
        {"path": "name", "message": "Назва: обовʼязкове поле"},
        {"path": "type", "message": "Оберіть тип закладу"},
        {"path": "address", "message": "Адреса: обовʼязкове поле"},
        {"path": "lat", "message": "lat: обовʼязкове поле"},
        {"path": "lng", "message": "lng: обовʼязкове поле"},
    ]
    _, errors = details(parse_submission, {**SUBMISSION, "lat": "50", "website": "ftp://x", "hasShelter": "так"},
                        BOUNDS, DIRECTIONS)
    assert errors == [
        {"path": "lat", "message": "lat: очікується число"},
        {"path": "website", "message": "Посилання має починатися з http:// або https://"},
        {"path": "hasShelter", "message": "hasShelter: очікується true/false"},
    ]
    _, errors = details(parse_submission, {**SUBMISSION, "lat": 48.5, "phone": None}, BOUNDS, DIRECTIONS)
    assert errors == [{"path": "lat", "message": "Точка має бути в межах міста"}]
    _, errors = details(parse_submission, {**SUBMISSION, "phone": None}, BOUNDS, DIRECTIONS)
    assert errors == [{"path": "phone", "message": "Вкажіть телефон або email"}]
    _, errors = details(parse_submission, {**SUBMISSION, "declaredDirectionIds": ["ballet"]}, BOUNDS, DIRECTIONS)
    assert errors == [{"path": "declaredDirectionIds.0", "message": "Невідомий напрямок"}]


def test_registration():
    assert parse_registration({"name": "Олена", "contact": "olena@example.com", "consent": True, "comment": " "}) == {
        "name": "Олена", "contact": "olena@example.com", "consent": True,
    }
    _, errors = details(parse_registration, {"name": "А", "contact": "x", "participantAge": "11", "consent": "true"})
    assert errors == [
        {"path": "name", "message": "Імʼя: мінімум 2 символи"},
        {"path": "contact", "message": "Вкажіть телефон або email"},
        {"path": "participantAge", "message": "Вік має бути числом"},
        {"path": "consent", "message": "Потрібна згода на обробку персональних даних"},
    ]


def test_recommendations():
    assert parse_recommendations({"age": 11}, DIRECTIONS) == {"age": 11, "interests": [], "format": [], "price": "any"}
    message, errors = details(parse_recommendations, {"age": True, "interests": ["S", "ballet"], "lat": 50}, DIRECTIONS)
    assert message == "Некоректні відповіді квізу"
    assert errors == [
        {"path": "age", "message": "Вік має бути числом"},
        {"path": "interests.1", "message": "Невідомий інтерес"},
    ]
    _, errors = details(parse_recommendations, {"age": 11, "lat": 50}, DIRECTIONS)
    assert errors == [{"path": "lng", "message": "lat і lng передаються разом"}]
```

Run: `docker compose run --rm api pytest tests/test_validation.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'catalog.api.validation'`.

- [ ] **Step 2: Реалізація**

`backend/catalog/api/validation.py`:

```python
# Розбір і валідація вводу з тими самими правилами й повідомленнями, що zod-схеми Node-версії.
# Кожна перевірка поля повертає (значення, [повідомлення]); порядок помилок — порядок полів.
import math
import re
from urllib.parse import urlparse

from catalog.choices import FORMATS, INSTITUTION_TYPES, PRICE_OPTIONS, STEAM_CODES, ids
from catalog.errors import AppError, ErrorCode

MAX_AGE = 120
MISSING = object()  # поле відсутнє (undefined у JS)

_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9-]{0,63}$")
_SLUG = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")
_JS_NUMBER = re.compile(r"^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$")
_PHONE_CHARS = re.compile(r"^\+?[0-9\s()-]+$")
_EMAIL = re.compile(
    r"^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$", re.IGNORECASE
)
_SPACES = re.compile(r"\s+")


class Errors:
    def __init__(self):
        self.items = []

    def add(self, path, messages):
        self.items.extend({"path": path, "message": message} for message in messages)

    def raise_if_any(self, message):
        if self.items:
            raise AppError(ErrorCode.VALIDATION_ERROR, message, self.items)


def _is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def _clean_number(value):
    return int(value) if isinstance(value, float) and value.is_integer() else value


def _trimmed(value):
    return value.strip() if isinstance(value, str) else value


def _js_to_number(text):
    # Number(text) з JS для рядків запиту: '' і пробіли → 0, решта нечисел → NaN
    stripped = text.strip()
    if stripped == "":
        return 0.0
    if _JS_NUMBER.match(stripped):
        return float(stripped)
    if stripped in ("Infinity", "+Infinity"):
        return math.inf
    if stripped == "-Infinity":
        return -math.inf
    return math.nan


def is_phone(value):
    return bool(_PHONE_CHARS.match(value)) and 10 <= len(re.sub(r"\D", "", value)) <= 15


def is_email(value):
    return bool(_EMAIL.match(value))


def _age_checks(number):
    messages = []
    if not float(number).is_integer():
        messages.append("Вік має бути цілим числом")
    if number < 0:
        messages.append("Вік не може бути відʼємним")
    if number > MAX_AGE:
        messages.append(f"Вік не може перевищувати {MAX_AGE}")
    return messages


# ── Параметри шляху ──


def parse_id(value):
    if not _ID.match(value):
        raise AppError(ErrorCode.VALIDATION_ERROR, "Некоректні параметри запиту",
                       [{"path": "id", "message": "Некоректний ідентифікатор"}])
    return value


def parse_direction_params(id, slug):
    errors = Errors()
    if not _ID.match(id):
        errors.add("id", ["Некоректний ідентифікатор"])
    if not _SLUG.match(slug):
        errors.add("slug", ["Некоректний slug напрямку"])
    errors.raise_if_any("Некоректні параметри запиту")
    return id, slug


# ── Query ──


def _query_scalar(query, key):
    values = query.getlist(key)
    if not values:
        return MISSING
    return values[0] if len(values) == 1 else values


def _query_list(query, key):
    values = query.getlist(key) + query.getlist(f"{key}[]")
    return values or MISSING


def _list_param(raw, allowed, message, transform=lambda s: s):
    # "a,b", ?x=a&x=b або ?x[]=a. Порожнє → відсутнє, дублікати прибираються.
    if raw is MISSING:
        return MISSING, []
    items = []
    for value in raw:
        for part in value.split(","):
            item = transform(part.strip())
            if item and item not in items:
                items.append(item)
    if not items:
        return MISSING, []
    errors = [(str(index), message) for index, item in enumerate(items) if item not in allowed]
    return items, errors


def _age_param(raw):
    if raw is MISSING or raw == "":
        return MISSING, []
    number = _js_to_number(raw) if isinstance(raw, str) else math.nan
    if math.isnan(number):
        return MISSING, ["Вік має бути числом"]
    messages = _age_checks(number)
    return (MISSING if messages else int(number)), messages


def _coordinate_param(raw, low, high):
    if raw is MISSING or raw == "":
        return MISSING, []
    number = _js_to_number(raw) if isinstance(raw, str) else math.nan
    if math.isnan(number):
        return MISSING, ["Координата має бути числом"]
    if number < low or number > high:
        return MISSING, [f"Координата має бути в межах {low}…{high}"]
    return _clean_number(number), []


def parse_catalog_filters(query, direction_ids):
    errors = Errors()
    result = {}

    q = _query_scalar(query, "q")
    if isinstance(q, str) and q.strip() == "":
        q = MISSING
    if q is not MISSING:
        if not isinstance(q, str):
            errors.add("q", ["Очікується рядок"])
        else:
            text = _SPACES.sub(" ", q).strip()
            if len(text) > 100:
                errors.add("q", ["Максимум 100 символів"])
            else:
                result["q"] = text

    def add_list(key, allowed, message, transform=lambda s: s):
        items, item_errors = _list_param(_query_list(query, key), allowed, message, transform)
        for index, item_message in item_errors:
            errors.add(f"{key}.{index}", [item_message])
        if items is not MISSING and not item_errors:
            result[key] = items

    add_list("category", STEAM_CODES, "Невідома категорія", transform=str.upper)
    add_list("direction", direction_ids, "Невідомий напрямок")

    for key in ("ageFrom", "ageTo"):
        value, messages = _age_param(_query_scalar(query, key))
        errors.add(key, messages)
        if value is not MISSING:
            result[key] = value

    price = _query_scalar(query, "price")
    if price is not MISSING and price != "":
        if price in ids(PRICE_OPTIONS):
            result["price"] = price
        else:
            errors.add("price", ["Ціна: free або paid"])

    add_list("format", ids(FORMATS), "Невідомий формат")
    add_list("type", ids(INSTITUTION_TYPES), "Невідомий тип закладу")

    for key, low, high in (("lat", -90, 90), ("lng", -180, 180)):
        value, messages = _coordinate_param(_query_scalar(query, key), low, high)
        errors.add(key, messages)
        if value is not MISSING:
            result[key] = value

    if not errors.items:
        if "ageFrom" in result and "ageTo" in result and result["ageFrom"] > result["ageTo"]:
            errors.add("ageTo", ["ageTo має бути ≥ ageFrom"])
        if ("lat" in result) != ("lng" in result):
            errors.add("lat" if "lat" not in result else "lng", ["lat і lng передаються разом"])

    errors.raise_if_any("Некоректні параметри запиту")
    return result


def parse_suggest_query(query):
    errors = Errors()
    q = _query_scalar(query, "q")
    if q is MISSING:
        errors.add("q", ["Параметр обовʼязковий"])
    elif not isinstance(q, str):
        errors.add("q", ["Очікується рядок"])
    else:
        q = _SPACES.sub(" ", q).strip()
        if len(q) < 2:
            errors.add("q", ["Мінімум 2 символи"])
        if len(q) > 100:
            errors.add("q", ["Максимум 100 символів"])
    errors.raise_if_any("Некоректні параметри запиту")
    return q


# ── Тіла POST ──


def _body(data):
    return data if isinstance(data, dict) else {}


def _required_text(data, key, low, high, label):
    value = _trimmed(data.get(key, MISSING))
    if value is MISSING:
        return MISSING, [f"{label}: обовʼязкове поле"]
    if not isinstance(value, str):
        return MISSING, [f"{label}: очікується рядок"]
    messages = []
    if len(value) < low:
        messages.append(f"{label}: мінімум {low} символи")
    if len(value) > high:
        messages.append(f"{label}: максимум {high} символів")
    return value, messages


def _optional(data, key, check):
    # Порожні поля форми ('' або null) → відсутні
    value = _trimmed(data.get(key, MISSING))
    if value is MISSING or value is None or value == "":
        return MISSING, []
    return check(value)


def _max_text(high, message):
    def check(value):
        if not isinstance(value, str):
            return MISSING, ["Очікується рядок"]
        return value, ([message] if len(value) > high else [])

    return check


def _website(value):
    if not isinstance(value, str):
        return MISSING, ["Очікується рядок"]
    messages = []
    if len(value) > 300:
        messages.append("Посилання: максимум 300 символів")
    parsed = urlparse(value)
    if not (parsed.scheme and (parsed.netloc or parsed.path)) or " " in value:
        messages.append("Некоректне посилання")
    if not re.match(r"^https?://", value, re.IGNORECASE):
        messages.append("Посилання має починатися з http:// або https://")
    return value, messages


def _phone(value):
    if not isinstance(value, str):
        return MISSING, ["Очікується рядок"]
    return value, ([] if is_phone(value) else ["Некоректний номер телефону"])


def _email(value):
    if not isinstance(value, str):
        return MISSING, ["Очікується рядок"]
    messages = [] if is_email(value) else ["Некоректний email"]
    if len(value) > 200:
        messages.append("Email: максимум 200 символів")
    return value, messages


def _json_age(value):
    if not _is_number(value):
        return MISSING, ["Вік має бути числом"]
    return _clean_number(value), _age_checks(value)


def _collect(errors, result, key, outcome):
    value, messages = outcome
    errors.add(key, messages)
    if value is not MISSING and not messages:
        result[key] = value


def parse_submission(data, bounds, direction_ids):
    data = _body(data)
    errors = Errors()
    result = {}

    _collect(errors, result, "name", _required_text(data, "name", 2, 150, "Назва"))
    _collect(errors, result, "shortName",
             _optional(data, "shortName", _max_text(60, "Коротка назва: максимум 60 символів")))

    kind = data.get("type", MISSING)
    if kind in ids(INSTITUTION_TYPES):
        result["type"] = kind
    else:
        errors.add("type", ["Оберіть тип закладу"])

    _collect(errors, result, "address", _required_text(data, "address", 5, 200, "Адреса"))

    for key, low, high in (("lat", bounds["south"], bounds["north"]), ("lng", bounds["west"], bounds["east"])):
        value = data.get(key, MISSING)
        if value is MISSING:
            errors.add(key, [f"{key}: обовʼязкове поле"])
        elif not _is_number(value):
            errors.add(key, [f"{key}: очікується число"])
        elif value < low or value > high:
            errors.add(key, ["Точка має бути в межах міста"])
        else:
            result[key] = value

    _collect(errors, result, "shortDescription",
             _optional(data, "shortDescription", _max_text(300, "Опис: максимум 300 символів")))
    _collect(errors, result, "website", _optional(data, "website", _website))
    _collect(errors, result, "phone", _optional(data, "phone", _phone))
    _collect(errors, result, "email", _optional(data, "email", _email))
    _collect(errors, result, "contactPerson",
             _optional(data, "contactPerson", _max_text(100, "Контактна особа: максимум 100 символів")))

    shelter = data.get("hasShelter", MISSING)
    if shelter is MISSING or shelter is None or isinstance(shelter, bool):
        if shelter is not MISSING:
            result["hasShelter"] = shelter
    else:
        errors.add("hasShelter", ["hasShelter: очікується true/false"])

    declared = data.get("declaredDirectionIds", MISSING)
    if declared is MISSING:
        result["declaredDirectionIds"] = []
    elif not isinstance(declared, list):
        errors.add("declaredDirectionIds", ["Очікується список напрямків"])
    else:
        bad = [index for index, item in enumerate(declared) if item not in direction_ids]
        for index in bad:
            errors.add(f"declaredDirectionIds.{index}", ["Невідомий напрямок"])
        if len(declared) > len(direction_ids):
            errors.add("declaredDirectionIds", ["Забагато напрямків"])
        if not bad and len(declared) <= len(direction_ids):
            result["declaredDirectionIds"] = list(dict.fromkeys(declared))

    if not errors.items and "phone" not in result and "email" not in result:
        errors.add("phone", ["Вкажіть телефон або email"])

    errors.raise_if_any("Некоректні дані форми")
    return result


def parse_registration(data):
    data = _body(data)
    errors = Errors()
    result = {}

    _collect(errors, result, "name", _required_text(data, "name", 2, 100, "Імʼя"))

    contact = _trimmed(data.get("contact", MISSING))
    if contact is MISSING:
        errors.add("contact", ["Контакт: обовʼязкове поле"])
    elif not isinstance(contact, str):
        errors.add("contact", ["Контакт: очікується рядок"])
    else:
        messages = []
        if len(contact) > 200:
            messages.append("Контакт: максимум 200 символів")
        if not (is_phone(contact) or is_email(contact)):
            messages.append("Вкажіть телефон або email")
        _collect(errors, result, "contact", (contact, messages))

    _collect(errors, result, "participantAge", _optional(data, "participantAge", _json_age))
    _collect(errors, result, "comment",
             _optional(data, "comment", _max_text(500, "Коментар: максимум 500 символів")))

    if data.get("consent") is True:
        result["consent"] = True
    else:
        errors.add("consent", ["Потрібна згода на обробку персональних даних"])

    errors.raise_if_any("Некоректні дані форми")
    return result


def parse_recommendations(data, direction_ids):
    data = _body(data)
    errors = Errors()
    result = {}
    interest_ids = set(direction_ids) | set(STEAM_CODES)

    age = data.get("age", MISSING)
    if age is MISSING:
        errors.add("age", ["Вік: обовʼязкове поле"])
    else:
        _collect(errors, result, "age", _json_age(age))

    interests = data.get("interests", MISSING)
    if interests is MISSING:
        result["interests"] = []
    elif not isinstance(interests, list):
        errors.add("interests", ["Очікується список інтересів"])
    else:
        bad = [i for i, item in enumerate(interests) if not isinstance(item, str) or item not in interest_ids]
        for index in bad:
            errors.add(f"interests.{index}", ["Невідомий інтерес"])
        if len(interests) > 20:
            errors.add("interests", ["Максимум 20 інтересів"])
        if not bad and len(interests) <= 20:
            result["interests"] = interests

    formats = data.get("format", MISSING)
    if formats is MISSING:
        result["format"] = []
    elif not isinstance(formats, list):
        errors.add("format", ["Очікується список форматів"])
    else:
        bad = [i for i, item in enumerate(formats) if item not in ids(FORMATS)]
        for index in bad:
            errors.add(f"format.{index}", ["Невідомий формат"])
        if not bad:
            result["format"] = formats

    price = data.get("price", MISSING)
    if price is MISSING:
        result["price"] = "any"
    elif price in ("free", "any"):
        result["price"] = price
    else:
        errors.add("price", ["Ціна: free або any"])

    for key, low, high in (("lat", -90, 90), ("lng", -180, 180)):
        value = data.get(key, MISSING)
        if value is MISSING:
            continue
        if not _is_number(value):
            errors.add(key, ["Координата має бути числом"])
        elif value < low or value > high:
            errors.add(key, [f"Координата має бути в межах {low}…{high}"])
        else:
            result[key] = value

    if not errors.items and ("lat" in result) != ("lng" in result):
        errors.add("lat" if "lat" not in result else "lng", ["lat і lng передаються разом"])

    errors.raise_if_any("Некоректні відповіді квізу")
    return result
```

- [ ] **Step 3: Тести проходять**

Run: `docker compose run --rm api pytest tests/test_validation.py -v`
Expected: 8 passed. Якщо `test_filters_errors` падає лише через порядок помилок — порядок має бути
`category` → `direction` → `ageFrom/ageTo` → `price` → `format` → `type` → `lat/lng` (порядок ключів zod-схеми);
виправляйте код, не тест.

- [ ] **Step 4: Commit**

```bash
git add backend/catalog/api/validation.py backend/tests/test_validation.py
git commit -m "feat(backend): валідація query й тіл запитів з повідомленнями як у zod-схемах"
```

---

### Task 7: Читання з БД і GET-ендпоінти

**Files:**
- Create: `backend/catalog/selectors.py`
- Modify: `backend/catalog/api/views.py`, `backend/catalog/api/urls.py`
- Test: `backend/tests/golden_utils.py`, `backend/tests/test_golden.py`, `backend/tests/test_api_read.py`

**Interfaces:**
- Consumes: моделі (Task 3), сервіси (Tasks 4–5), валідація (Task 6), golden (Task 1).
- Produces:
  - `selectors.load_reference() -> {"city", "categories", "directions"}` (словники як у seed JSON)
  - `selectors.load_catalog(near=None) -> {"city", "categories", "directions", "institutions", "courses",
    "distances"}`; `near = {"lat", "lng"}` → `distances[id]` у км з `ST_DistanceSphere`; без `near` — `{}`
  - `selectors.load_quiz() -> dict | None`
  - `selectors.institution_dict(institution) -> dict` (використовує Task 8)
  - `tests.golden_utils.load_cases()`, `strip_ignored(value, paths)`, `run_case(client, case)`

- [ ] **Step 1: Помічники для golden**

`backend/tests/golden_utils.py`:

```python
import copy
import json
from pathlib import Path

CASES_FILE = Path(__file__).resolve().parent / "golden" / "cases.json"


def load_cases():
    return json.loads(CASES_FILE.read_text("utf-8"))


def strip_ignored(value, paths):
    value = copy.deepcopy(value)
    for path in paths:
        *parents, last = path.split(".")
        node = value
        for part in parents:
            node = node[int(part)] if isinstance(node, list) else node.get(part)
            if node is None:
                break
        else:
            if isinstance(node, list):
                node[int(last)] = "<ignored>"
            elif last in node:
                node[last] = "<ignored>"
    return value


def send(client, step):
    method = step.get("method", "GET")
    if method == "GET":
        return client.get(step["path"])
    body = step["raw"] if "raw" in step else json.dumps(step["body"], ensure_ascii=False)
    return client.post(step["path"], data=body, content_type="application/json")


def run_case(client, case):
    for step in case.get("before", []):
        send(client, step)
    return send(client, case)
```

- [ ] **Step 2: Тест golden, що падає**

`backend/tests/test_golden.py`:

```python
import pytest
from django.core.management import call_command

from .golden_utils import load_cases, run_case, strip_ignored

CASES = load_cases()
# Читання — лише GET без підготовчих запитів; решта змінює дані (Task 8)
READ_CASES = [c for c in CASES if c["method"] == "GET" and not c.get("before")]
WRITE_CASES = [c for c in CASES if c not in READ_CASES]


@pytest.fixture
def seeded(db):
    call_command("import_seed")


def check(client, case):
    res = run_case(client, case)
    assert res.status_code == case["status"]
    ignore = case.get("ignore", [])
    assert strip_ignored(res.json(), ignore) == strip_ignored(case["response"], ignore)


@pytest.mark.parametrize("case", READ_CASES, ids=[c["name"] for c in READ_CASES])
def test_golden_read(client, seeded, case):
    check(client, case)


@pytest.mark.parametrize("case", WRITE_CASES, ids=[c["name"] for c in WRITE_CASES])
def test_golden_write(client, seeded, case):
    check(client, case)
```

Run: `docker compose run --rm api pytest tests/test_golden.py -q`
Expected: FAIL — більшість випадків 404 (маршрутів ще немає).

- [ ] **Step 3: Selectors**

`backend/catalog/selectors.py`:

```python
# Читання з БД у прості словники тієї самої форми, що seed JSON і відповіді Node-версії.
import datetime

from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.geos import Point
from django.db.models import Prefetch

from quiz.models import Quiz

from .models import Category, City, Course, Direction, Institution


def iso_datetime(value):
    # Як Date#toISOString(): 2026-09-17T00:00:00.000Z
    utc = value.astimezone(datetime.timezone.utc)
    return utc.strftime("%Y-%m-%dT%H:%M:%S.") + f"{utc.microsecond // 1000:03d}Z"


def city_dict(city):
    west, south, east, north = city.bounds.extent
    return {
        "id": city.id,
        "name": city.name,
        "center": {"lat": city.center.y, "lng": city.center.x},
        "zoom": city.zoom,
        "bounds": {"south": south, "west": west, "north": north, "east": east},
        "dataNotice": city.data_notice,
    }


def category_dict(category):
    return {"code": category.code, "name": category.name, "nameEn": category.name_en, "color": category.color,
            "icon": category.icon}


def direction_dict(direction):
    return {"id": direction.id, "slug": direction.id, "name": direction.name, "categoryCode": direction.category_id,
            "keywords": list(direction.keywords)}


def institution_dict(institution):
    return {
        "id": institution.id,
        "name": institution.name,
        "shortName": institution.short_name,
        "type": institution.type,
        "shortDescription": institution.short_description,
        "description": institution.description,
        "logoUrl": institution.logo_url,
        "address": institution.address,
        "city": institution.city_id,
        "lat": institution.location.y,
        "lng": institution.location.x,
        "website": institution.website,
        "phone": institution.phone,
        "email": institution.email,
        "contactPerson": institution.contact_person,
        "hasShelter": institution.has_shelter,
        "declaredDirectionIds": [d.id for d in institution.declared_directions.all()],
        "status": institution.status,
        "source": institution.source,
        "createdAt": iso_datetime(institution.created_at),
    }


def course_dict(course):
    return {
        "id": course.id,
        "institutionId": course.institution_id,
        "directionId": course.direction_id,
        "title": course.title,
        "shortDescription": course.short_description,
        "description": course.description,
        "audience": course.audience,
        "ageMin": course.age_min,
        "ageMax": course.age_max,
        "level": course.level,
        "format": course.format,
        "price": course.price,
        "priceUnit": course.price_unit,
        "durationText": course.duration_text,
        "scheduleText": course.schedule_text,
        "scheduleDays": list(course.schedule_days),
        "startDate": course.start_date.isoformat(),
        "language": course.language,
        "seatsTotal": course.seats_total,
        "seatsLeft": course.seats_left,
    }


def get_city():
    return City.objects.order_by("id").first()


def load_reference():
    return {
        "city": city_dict(get_city()),
        "categories": [category_dict(c) for c in Category.objects.all()],
        "directions": [direction_dict(d) for d in Direction.objects.all()],
    }


def institutions_queryset():
    return Institution.objects.prefetch_related(
        Prefetch("declared_directions", queryset=Direction.objects.order_by("position", "id"))
    )


def load_catalog(near=None):
    institutions = institutions_queryset()
    distances = {}
    if near is not None:
        point = Point(near["lng"], near["lat"], srid=4326)
        # spheroid=False → ST_DistanceSphere: та сама сфера, що й haversine у Node-версії
        institutions = institutions.annotate(distance=Distance("location", point, spheroid=False))
    institution_list = list(institutions)
    if near is not None:
        distances = {i.id: i.distance.km for i in institution_list}
    return {
        **load_reference(),
        "institutions": [institution_dict(i) for i in institution_list],
        "courses": [course_dict(c) for c in Course.objects.all()],
        "distances": distances,
    }


def load_quiz():
    quiz = Quiz.objects.order_by("id").prefetch_related("questions__options").first()
    if quiz is None:
        return None

    def with_subtitle(body, subtitle):
        # Підзаголовок є лише в частини питань — порожній не віддаємо, як у seed JSON
        if subtitle:
            body["subtitle"] = subtitle
        return body

    questions = []
    for question in quiz.questions.all():
        body = with_subtitle({"id": question.key, "title": question.title}, question.subtitle)
        body.update({
            "type": question.type,
            "required": question.required,
            "options": [
                {"id": o.key, "label": o.label, "emoji": o.emoji, "value": o.value} for o in question.options.all()
            ],
        })
        questions.append(body)
    return {**with_subtitle({"id": quiz.id, "title": quiz.title}, quiz.subtitle), "questions": questions}
```

- [ ] **Step 4: GET-ендпоінти**

У `backend/catalog/api/views.py` додайте імпорти на початок файлу, а функції — перед `api_not_found`:

```python
from catalog import selectors
from catalog.services.catalog import (
    build_course_details,
    build_direction_courses,
    build_institution_card,
    build_institution_markers,
    build_meta,
    build_suggestions,
)

from .validation import parse_catalog_filters, parse_direction_params, parse_id, parse_suggest_query

REFERENCE_CACHE = "public, max-age=300"


def _direction_ids(reference):
    return [d["id"] for d in reference["directions"]]


def _filters(request, reference):
    return parse_catalog_filters(request.query_params, _direction_ids(reference))


def _near(filters):
    return {"lat": filters["lat"], "lng": filters["lng"]} if "lat" in filters else None


@api_view(["GET"])
def meta(request):
    response = Response(build_meta(selectors.load_reference()))
    response["Cache-Control"] = REFERENCE_CACHE
    return response


@api_view(["GET"])
def quiz(request):
    body = selectors.load_quiz()
    if body is None:
        raise AppError(ErrorCode.NOT_FOUND, "Квіз не знайдено")
    response = Response(body)
    response["Cache-Control"] = REFERENCE_CACHE
    return response


def list_institutions(request):
    filters = _filters(request, selectors.load_reference())
    return Response(build_institution_markers(selectors.load_catalog(near=_near(filters)), filters))


@api_view(["GET", "POST"])
def institutions(request):
    if request.method == "POST":
        return create_institution(request)
    return list_institutions(request)


@api_view(["GET"])
def institution_card(request, id):
    parse_id(id)
    filters = _filters(request, selectors.load_reference())
    card = build_institution_card(selectors.load_catalog(), id, filters)
    if card is None:
        raise AppError(ErrorCode.NOT_FOUND, "Заклад не знайдено")
    return Response(card)


@api_view(["GET"])
def direction_courses(request, id, slug):
    parse_direction_params(id, slug)
    filters = _filters(request, selectors.load_reference())
    result = build_direction_courses(selectors.load_catalog(), id, slug, filters)
    if result is None:
        raise AppError(ErrorCode.NOT_FOUND, "Заклад не знайдено")
    if result.get("directionNotFound"):
        raise AppError(ErrorCode.NOT_FOUND, "Напрямок не знайдено")
    return Response(result)


@api_view(["GET"])
def course_details(request, id):
    parse_id(id)
    catalog = selectors.load_catalog()
    course = next((c for c in catalog["courses"] if c["id"] == id), None)
    institution = (
        next((i for i in catalog["institutions"] if i["id"] == course["institutionId"]), None) if course else None
    )
    details = build_course_details(course, institution, catalog["directions"], catalog["categories"])
    if details is None:
        raise AppError(ErrorCode.NOT_FOUND, "Курс не знайдено")
    return Response(details)


@api_view(["GET"])
def suggest(request):
    query = parse_suggest_query(request.query_params)
    return Response(build_suggestions(selectors.load_catalog(), query))


def create_institution(request):
    # Реалізується в Task 8
    raise AppError(ErrorCode.NOT_FOUND, "Маршрут не знайдено")
```

`backend/catalog/api/urls.py`:

```python
from django.urls import path, re_path

from . import views

urlpatterns = [
    path("health", views.health),
    path("meta", views.meta),
    path("quiz", views.quiz),
    path("institutions", views.institutions),
    path("institutions/<str:id>", views.institution_card),
    path("institutions/<str:id>/directions/<str:slug>/courses", views.direction_courses),
    path("courses/<str:id>", views.course_details),
    path("search/suggest", views.suggest),
    # Має лишатися останнім: усе інше під /api/ → 404 у форматі API
    re_path(r"^(?P<rest>.*)$", views.api_not_found),
]
```

- [ ] **Step 5: Додаткові API-тести**

`backend/tests/test_api_read.py`:

```python
import pytest
from django.core.management import call_command

from catalog.models import Institution

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def seeded():
    call_command("import_seed")


def test_meta_cache_header(client):
    res = client.get("/api/meta")
    assert res["Cache-Control"] == "public, max-age=300"
    assert res.json()["city"]["bounds"] == {"south": 49.88, "west": 36.1, "north": 50.1, "east": 36.46}


def test_rejected_institution_hidden_everywhere(client):
    Institution.objects.filter(pk="kh-palace").update(status="rejected")
    assert "kh-palace" not in [i["id"] for i in client.get("/api/institutions").json()["items"]]
    assert client.get("/api/institutions/kh-palace").status_code == 404
    assert client.get("/api/courses/palace-lego").status_code == 404
    suggest = client.get("/api/search/suggest", {"q": "палац"}).json()
    assert suggest["institutions"] == []


def test_cyrillic_query_with_apostrophe(client):
    res = client.get("/api/institutions", {"q": "ПРОГРАМУВАННЯ"})
    assert res.status_code == 200
    assert res.json()["summary"]["institutions"] >= 1


def test_trailing_slash_is_unknown_route(client):
    assert client.get("/api/institutions/").status_code == 404
```

- [ ] **Step 6: Прогнати GET-частину golden і тести читання**

Run: `docker compose run --rm api pytest tests/test_golden.py::test_golden_read tests/test_api_read.py -q`
Expected: усі випадки PASS (`test_golden_write` ще падає — це Task 8). Якщо випадок падає — порівняйте відповідь із golden через
`pytest --tb=long -k "<назва випадку>"`; виправляйте сервіс або selector, а не golden. Найімовірніші місця:
порядок у `uk_sort_key` (suggest, директорії картки), `round1` у `distanceKm`.

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "feat(backend): selectors з PostGIS і GET-ендпоінти, звірка з golden"
```

---

### Task 8: POST-ендпоінти — заявка, запис на курс, рекомендації

**Files:**
- Create: `backend/catalog/actions.py`
- Modify: `backend/catalog/api/views.py`, `backend/catalog/api/urls.py`
- Test: `backend/tests/test_api_write.py`

**Interfaces:**
- Consumes: `selectors.get_city()`, `selectors.institution_dict()`, `selectors.load_catalog(near)`,
  `validation.parse_submission/parse_registration/parse_recommendations`, сервіси Task 5.
- Produces:
  - `actions.create_institution(data: dict) -> Institution`
  - `actions.create_registration(course_id: str, data: dict) -> tuple[Registration, int | None]`
    (кидає `AppError` `NOT_FOUND` «Курс не знайдено» / `NO_SEATS` «Вільних місць немає»)

- [ ] **Step 1: Тести, що падають**

`backend/tests/test_api_write.py`:

```python
import json
import threading

import pytest
from django.core.management import call_command
from django.db import connection

from catalog.models import Course, Institution, Registration

REGISTRATION = {"name": "Олена", "contact": "+380501234567", "consent": True}


def post(client, path, body):
    return client.post(path, data=json.dumps(body, ensure_ascii=False), content_type="application/json")


@pytest.fixture
def seeded(db):
    call_command("import_seed")


def test_submission_is_pending_and_private_fields_hidden(client, seeded):
    res = post(client, "/api/institutions", {
        "name": "Школа", "type": "center", "address": "вул. Сумська, 1", "lat": 50.0, "lng": 36.23,
        "email": "a@example.com", "contactPerson": "Олена", "declaredDirectionIds": ["robotics", "astronomy"],
    })
    assert res.status_code == 201
    body = res.json()["institution"]
    assert body["status"] == "pending" and body["source"] == "submission"
    assert "contactPerson" not in body
    # Порядок довідника напрямів, а не введення (свідоме відхилення від Node)
    assert body["declaredDirectionIds"] == ["astronomy", "robotics"]
    saved = Institution.objects.get(pk=body["id"])
    assert saved.contact_person == "Олена"
    assert body["createdAt"].endswith("Z")


def test_registration_for_hidden_course_is_404(client, seeded):
    Institution.objects.filter(pk="kh-palace").update(status="rejected")
    res = post(client, "/api/courses/palace-lego/registrations", REGISTRATION)
    assert res.status_code == 404
    assert res.json()["error"]["message"] == "Курс не знайдено"


def test_registration_stores_contact(client, seeded):
    res = post(client, "/api/courses/palace-lego/registrations", {**REGISTRATION, "comment": "  "})
    assert res.status_code == 201
    registration = Registration.objects.get(pk=res.json()["id"])
    assert registration.comment is None and registration.consent is True


def test_non_json_content_type_is_400(client, seeded):
    res = client.post("/api/recommendations", data="age=11", content_type="application/x-www-form-urlencoded")
    assert res.status_code == 400
    assert res.json()["error"]["message"] == "Некоректний JSON у тілі запиту"


@pytest.mark.django_db(transaction=True)
def test_last_seat_race(client):
    call_command("import_seed")
    Course.objects.filter(pk="palace-lego").update(seats_left=1)
    statuses = []
    barrier = threading.Barrier(2)

    def register():
        from django.test import Client

        barrier.wait()
        statuses.append(post(Client(), "/api/courses/palace-lego/registrations", REGISTRATION).status_code)
        connection.close()

    threads = [threading.Thread(target=register) for _ in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert sorted(statuses) == [201, 409]
    assert Course.objects.get(pk="palace-lego").seats_left == 0
    assert Registration.objects.count() == 1
```

Run: `docker compose run --rm api pytest tests/test_api_write.py -v`
Expected: FAIL — 404 на POST-маршрутах.

- [ ] **Step 2: `actions.py`**

`backend/catalog/actions.py`:

```python
# Записи в БД для публічного API. Вхідні дані вже провалідовані; службові поля задаємо лише тут.
from django.contrib.gis.geos import Point
from django.db import transaction
from django.db.models import F

from .choices import PUBLIC_STATUSES
from .errors import AppError, ErrorCode
from .models import Course, Institution, Registration
from .selectors import get_city


@transaction.atomic
def create_institution(data):
    institution = Institution.objects.create(
        name=data["name"],
        short_name=data.get("shortName") or data["name"],
        type=data["type"],
        short_description=data.get("shortDescription"),
        description=None,
        logo_url=None,
        address=data["address"],
        city=get_city(),
        location=Point(data["lng"], data["lat"], srid=4326),
        website=data.get("website"),
        phone=data.get("phone"),
        email=data.get("email"),
        contact_person=data.get("contactPerson"),
        has_shelter=data.get("hasShelter"),
        status="pending",
        source="submission",
    )
    institution.declared_directions.set(data["declaredDirectionIds"])
    return institution


@transaction.atomic
def create_registration(course_id, data):
    course = Course.objects.select_related("institution").filter(pk=course_id).first()
    if course is None or course.institution.status not in PUBLIC_STATUSES:
        raise AppError(ErrorCode.NOT_FOUND, "Курс не знайдено")

    if course.seats_left is not None:
        # Умова в UPDATE: паралельний запис чекає на блокування рядка й бачить уже зменшене значення
        updated = Course.objects.filter(pk=course_id, seats_left__gt=0).update(seats_left=F("seats_left") - 1)
        if not updated:
            raise AppError(ErrorCode.NO_SEATS, "Вільних місць немає")
        course.refresh_from_db(fields=["seats_left"])

    registration = Registration.objects.create(
        course=course,
        name=data["name"],
        contact=data["contact"],
        participant_age=data.get("participantAge"),
        comment=data.get("comment") or None,
        consent=True,
    )
    return registration, course.seats_left
```

- [ ] **Step 3: Ендпоінти**

У `backend/catalog/api/views.py` додайте імпорти:

```python
from catalog import actions
from catalog.services.catalog import to_public_institution, to_recommendation_items
from catalog.services.recommend import build_map_filters, recommend

from .validation import parse_recommendations, parse_registration, parse_submission
```

і замініть заглушку `create_institution` та додайте нові функції:

```python
def create_institution(request):
    reference = selectors.load_reference()
    data = parse_submission(request.data, reference["city"]["bounds"], _direction_ids(reference))
    institution = actions.create_institution(data)
    body = to_public_institution(selectors.institution_dict(selectors.institutions_queryset().get(pk=institution.pk)))
    return Response({"institution": body}, status=201)


@api_view(["POST"])
def registrations(request, id):
    parse_id(id)
    data = parse_registration(request.data)
    registration, seats_left = actions.create_registration(id, data)
    return Response(
        {"id": str(registration.id), "courseId": registration.course_id, "status": "received", "seatsLeft": seats_left},
        status=201,
    )


@api_view(["POST"])
def recommendations(request):
    reference = selectors.load_reference()
    data = parse_recommendations(request.data, _direction_ids(reference))
    near = {"lat": data["lat"], "lng": data["lng"]} if "lat" in data else None
    catalog = selectors.load_catalog(near=near)
    return Response({
        "filters": build_map_filters(data, catalog["directions"]),
        "items": to_recommendation_items(recommend(data, catalog)),
    })
```

У `backend/catalog/api/urls.py` перед `re_path` додайте:

```python
    path("courses/<str:id>/registrations", views.registrations),
    path("recommendations", views.recommendations),
```

- [ ] **Step 4: Усі тести, включно з повним golden**

Run: `docker compose run --rm api pytest -q`
Expected: усі тести PASS, у тому числі всі 50 випадків `test_golden_read` і `test_golden_write`. Запишіть кількість passed у звіт.

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "feat(backend): заявки, атомарний запис на курс і рекомендації"
```

---

### Task 9: Django admin

**Files:**
- Create: `backend/catalog/admin.py`, `backend/quiz/admin.py`
- Test: `backend/tests/test_admin.py`

**Interfaces:**
- Consumes: моделі Task 3.
- Produces: адмінка на `/admin/` з діями `approve_selected` і `reject_selected` у `InstitutionAdmin`.

- [ ] **Step 1: Тести, що падають**

`backend/tests/test_admin.py`:

```python
import pytest
from django.contrib.auth import get_user_model
from django.contrib.admin.sites import site
from django.core.management import call_command
from django.forms import modelform_factory

from catalog.models import Course, Institution

pytestmark = pytest.mark.django_db

PAGES = [
    "/admin/",
    "/admin/catalog/institution/",
    "/admin/catalog/institution/khpi/change/",
    "/admin/catalog/course/",
    "/admin/catalog/course/palace-lego/change/",
    "/admin/catalog/registration/",
    "/admin/catalog/city/kharkiv/change/",
    "/admin/catalog/category/",
    "/admin/catalog/direction/",
    "/admin/quiz/quiz/what-to-choose/change/",
    "/admin/quiz/quizquestion/",
]


@pytest.fixture
def admin_client(client):
    call_command("import_seed")
    user = get_user_model().objects.create_superuser("moderator", "m@example.com", "pass")
    client.force_login(user)
    return client


@pytest.mark.parametrize("url", PAGES)
def test_pages_open(admin_client, url):
    assert admin_client.get(url).status_code == 200


def test_pending_filter(admin_client):
    Institution.objects.filter(pk="khpi").update(status="pending")
    res = admin_client.get("/admin/catalog/institution/?status__exact=pending")
    assert b"khpi" in res.content and b"hnpu" not in res.content


@pytest.mark.parametrize("action, status", [("approve_selected", "approved"), ("reject_selected", "rejected")])
def test_moderation_actions(admin_client, action, status):
    Institution.objects.filter(pk__in=["khpi", "hnpu"]).update(status="pending")
    res = admin_client.post(
        "/admin/catalog/institution/",
        {"action": action, "_selected_action": ["khpi", "hnpu"]},
    )
    assert res.status_code == 302
    assert set(Institution.objects.filter(pk__in=["khpi", "hnpu"]).values_list("status", flat=True)) == {status}


def test_registrations_are_read_only(admin_client):
    assert admin_client.get("/admin/catalog/registration/add/").status_code == 403


def test_course_form_rejects_broken_invariant():
    call_command("import_seed")
    course = Course.objects.get(pk="palace-lego")
    form_class = modelform_factory(Course, fields="__all__")
    data = {f.name: getattr(course, f.attname) for f in Course._meta.concrete_fields}
    data.update({"institution": course.institution_id, "direction": course.direction_id,
                 "schedule_days": ",".join(course.schedule_days), "seats_left": 20})
    form = form_class(data=data, instance=course)
    assert not form.is_valid()
    assert form.non_field_errors() or form.errors
    assert site.is_registered(Course)
```

Run: `docker compose run --rm api pytest tests/test_admin.py -v`
Expected: FAIL — 404 на сторінках моделей (адмінку не зареєстровано).

- [ ] **Step 2: Адмінка каталогу**

`backend/catalog/admin.py`:

```python
from django.contrib import admin, messages
from django.contrib.gis.admin import GISModelAdmin

from .models import Category, City, Course, Direction, Institution, Registration

admin.site.site_header = "Academy Locator — модерація"
admin.site.site_title = "Academy Locator"
admin.site.index_title = "Каталог STEAM-освіти"


class CourseInline(admin.StackedInline):
    model = Course
    extra = 0
    show_change_link = True
    fields = (("title", "direction"), ("age_min", "age_max", "level", "format"),
              ("price", "price_unit"), ("start_date", "schedule_days"), ("seats_total", "seats_left"))


@admin.register(Institution)
class InstitutionAdmin(GISModelAdmin):
    list_display = ("short_name", "type", "status", "source", "created_at")
    list_filter = ("status", "type", "source")
    search_fields = ("id", "name", "short_name", "address")
    filter_horizontal = ("declared_directions",)
    readonly_fields = ("created_at",)
    inlines = [CourseInline]
    actions = ["approve_selected", "reject_selected"]

    def get_changeform_initial_data(self, request):
        initial = super().get_changeform_initial_data(request)
        initial.setdefault("status", "approved")
        initial.setdefault("source", "seed")
        return initial

    @admin.action(description="Схвалити вибрані заклади")
    def approve_selected(self, request, queryset):
        count = queryset.update(status="approved")
        self.message_user(request, f"Схвалено: {count}", messages.SUCCESS)

    @admin.action(description="Відхилити вибрані заклади")
    def reject_selected(self, request, queryset):
        count = queryset.update(status="rejected")
        self.message_user(request, f"Відхилено: {count}", messages.WARNING)


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("title", "institution", "direction", "format", "price", "seats_left", "start_date")
    list_filter = ("institution", "direction", "format", "level")
    search_fields = ("id", "title")
    autocomplete_fields = ("institution", "direction")


@admin.register(Registration)
class RegistrationAdmin(admin.ModelAdmin):
    list_display = ("created_at", "name", "contact", "course", "institution", "participant_age")
    list_filter = ("course__institution",)
    search_fields = ("name", "contact")
    readonly_fields = ("course", "name", "contact", "participant_age", "comment", "consent", "created_at")
    list_select_related = ("course__institution",)

    @admin.display(description="Заклад")
    def institution(self, obj):
        return obj.course.institution

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(City)
class CityAdmin(GISModelAdmin):
    list_display = ("name", "id", "zoom")


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "color", "position")
    ordering = ("position",)


@admin.register(Direction)
class DirectionAdmin(admin.ModelAdmin):
    list_display = ("name", "id", "category", "position")
    list_filter = ("category",)
    search_fields = ("id", "name", "keywords")
```

`backend/quiz/admin.py`:

```python
from django.contrib import admin

from .models import Quiz, QuizOption, QuizQuestion


class QuizQuestionInline(admin.TabularInline):
    model = QuizQuestion
    extra = 0
    show_change_link = True
    fields = ("position", "key", "title", "type", "required")


class QuizOptionInline(admin.TabularInline):
    model = QuizOption
    extra = 0
    fields = ("position", "key", "label", "emoji", "value")


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ("title", "id")
    inlines = [QuizQuestionInline]


@admin.register(QuizQuestion)
class QuizQuestionAdmin(admin.ModelAdmin):
    list_display = ("title", "quiz", "position", "type", "required")
    list_filter = ("quiz",)
    inlines = [QuizOptionInline]
```

- [ ] **Step 3: Тести проходять**

Run: `docker compose run --rm api pytest tests/test_admin.py -v`
Expected: 16 passed.

- [ ] **Step 4: Ручна перевірка адмінки**

Run:
```bash
docker compose run --rm api python manage.py createsuperuser
docker compose up -d
```
Відкрийте `http://localhost:8000/admin/`, увійдіть. Перевірте: карта OSM на сторінці закладу показує точку;
список закладів фільтрується за статусом; дія «Схвалити вибрані заклади» змінює статус. Скажіть користувачу,
що з цього перевірено, а що ні.

- [ ] **Step 5: Commit**

```bash
git add backend/catalog/admin.py backend/quiz/admin.py backend/tests/test_admin.py
git commit -m "feat(backend): Django admin — модерація заявок і CRUD каталогу та квізу"
```

---

### Task 10: Фронтенд працює з Django; прибрати React-адмінку

**Files:**
- Modify: `vite.config.js` (проксі на `:8000`)
- Modify: `web/src/App.jsx` (прибрати маршрут `/admin`)
- Delete: `web/src/admin/` (усі файли)

**Interfaces:**
- Consumes: API з Tasks 7–8.

- [ ] **Step 1: Проксі Vite на Django**

У `vite.config.js` замініть блок `server`:

```js
  server: {
    port: 5173,
    // API — Django у Docker: docker compose up (порт 8000)
    proxy: { '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:8000' },
  },
```

- [ ] **Step 2: Прибрати React-адмінку**

У `web/src/App.jsx` видаліть рядок `import { AdminPage } from './admin/AdminPage.jsx';` і рядок
`<Route path="/admin" element={<AdminPage />} />`.

Run: `git rm -r web/src/admin`

Run: `npm run test:web`
Expected: PASS. Запишіть кількість тестів. Якщо `web/src/api/client.spec.js` перевіряє заголовок
`X-Admin-Token` лише як приклад довільного заголовка — залиште тест, він не залежить від адмінки.

- [ ] **Step 3: Перевірка в браузері**

Run (у фоні): `docker compose up` і `npm run dev:web`.
Скіл `frontend`, розділ «Verify in the browser», але адреса — `http://localhost:5173`. Перевірте:
маркери з STEAM-кільцями на карті; фільтр «Технології» зменшує кількість міток; картка закладу → напрям → курс;
запис на курс (`palace-lego`) показує успіх і зменшує місця; квіз дає 3 рекомендації й підсвічує мітки;
«Додати заклад» з точкою на карті створює мітку «на модерації»; у консолі немає помилок
(`read_console_messages` з патерном `rror`). Після перевірки: `docker compose run --rm api python manage.py
import_seed --reset --yes`, щоб повернути seed. Повідомте користувачу, які перевірки не вдалися в прихованому
вікні.

- [ ] **Step 4: Commit**

```bash
git add vite.config.js web/src/App.jsx
git commit -m "feat(web): фронтенд працює з Django API, React-адмінку замінено Django admin"
```

---

### Task 11: Перехід — видалити Node-бекенд, оновити документацію

**Files:**
- Delete: `src/`, `tests/`, `scripts/` (разом із `record-golden.mjs`), `render.yaml`, `.env.example`,
  `.claude/skills/mongo-ops/`, `.claude/skills/deploy-render/`, `.claude/skills/seed-data/check-seed.mjs`
- Modify: `package.json`, `CLAUDE.md`, `README.md`, `.claude/README.md`,
  `.claude/skills/api-architecture/SKILL.md`, `.claude/skills/verify-api/SKILL.md`,
  `.claude/skills/verify-api/smoke.mjs`, `.claude/skills/seed-data/SKILL.md`, `.claude/skills/frontend/SKILL.md`
- Create: `docs/tech/2026-10-15-django-port-parity.md`

- [ ] **Step 1: Переконатися, що все зелене до видалення**

Run: `docker compose run --rm api pytest -q` і `npm run test:web`
Expected: обидва PASS. Без цього не продовжуйте.

- [ ] **Step 2: Видалити Node-бекенд**

```bash
git rm -r src tests scripts render.yaml .env.example .claude/skills/mongo-ops .claude/skills/deploy-render .claude/skills/seed-data/check-seed.mjs
```

- [ ] **Step 3: `package.json`**

Замініть `description`, `main`, `scripts` і залежності:

```json
  "description": "Academy Locator — інтерактивна карта STEAM-освіти Харкова (фронтенд; API — Django у backend/)",
  "scripts": {
    "dev:api": "docker compose up",
    "dev:web": "vite",
    "build": "vite build",
    "test": "npm run test:api && npm run test:web",
    "test:api": "docker compose run --rm api pytest -q",
    "test:web": "vitest run"
  },
  "dependencies": {
    "@fontsource-variable/manrope": "^5.3.0",
    "@fontsource/unbounded": "^5.3.0",
    "leaflet": "^1.9.4",
    "lucide-react": "^1.47.0",
    "react": "^19.3.0",
    "react-dom": "^19.3.0",
    "react-leaflet": "^5.0.0",
    "react-router": "^7.18.4"
  },
```

Видаліть поле `"main"`. У `devDependencies` видаліть `"supertest"`. Run: `npm install` (оновлює
`package-lock.json`), потім `npm test`. Expected: pytest і vitest PASS.

- [ ] **Step 4: `smoke.mjs` без адмін-кроків**

У `.claude/skills/verify-api/smoke.mjs`:
- рядок 2 → `// Usage: node .claude/skills/verify-api/smoke.mjs [baseUrl=http://localhost:8000]`;
- рядок 3 → `// Mutates state: after the run reset the data (docker compose run --rm api python manage.py import_seed --reset --yes).`;
- значення за замовчуванням у рядку 5 → `'http://localhost:8000'`;
- видаліть рядок 6 (`const adminToken = ...`);
- видаліть блок від `await step('GET /admin/submissions without token → 401 or 404'` до кінця `if/else`
  (рядки 136–162 поточної версії), залишивши три фінальні рядки виводу.

Run: `docker compose up -d && node .claude/skills/verify-api/smoke.mjs`
Expected: `All steps passed`. Потім `docker compose run --rm api python manage.py import_seed --reset --yes`.

- [ ] **Step 5: `CLAUDE.md`**

Перепишіть розділи «Hard rules» (правило 3), «Project», «Commands», «Where the knowledge lives»:

```markdown
3. `backend/catalog/services/` stays pure (no django, rest_framework, models, selectors imports; enforced by
   `tests/test_services_purity.py`). Response shapes go in `catalog/services/catalog.py`; enums and labels only in
   `catalog/choices.py`.
```

```markdown
## Project

Academy Locator — MVP demo map of STEAM education in Kharkiv. Backend: Django 5.2 + DRF + PostgreSQL 16/PostGIS
in Docker Compose (`backend/`); moderation and CRUD in Django admin (`/admin/`). Frontend: React + Vite in `web/`,
built into `public/`; target hosting S3 + CloudFront (not set up yet — `npm run dev:web` only).
```

```markdown
## Commands

| Command | What it does |
|---|---|
| `npm run dev:api` | `docker compose up`: PostGIS + Django on :8000 (migrations on start) |
| `npm run dev:web` | Vite on :5173, proxies `/api` to :8000 |
| `npm test` | pytest in Docker + Vitest; report pass/fail counts of both |
| `npm run test:api` / `npm run test:web` | backend / frontend only |
| `docker compose run --rm api pytest -k "<name>"` | one backend test by name |
| `docker compose run --rm api python manage.py import_seed [--reset --yes]` | load `data/seed/` into the DB |
| `docker compose run --rm api python manage.py createsuperuser` | admin login |
| `npm run build` | frontend build into `public/` |
```

У таблиці «Where the knowledge lives» видаліть рядки `mongo-ops` і `deploy-render`; рядок `api-architecture`:
`backend/: layers, endpoints, filters, errors, golden tests`.

- [ ] **Step 6: Скіли й README**

- `.claude/skills/api-architecture/SKILL.md` — перепишіть під нову архітектуру: шари (views → selectors/actions →
  services), `choices.py`, `errors.py`, формат помилок і таблиця кодів, ліміти, правило карти й рекомендації
  (текст розділу «Behavior that spans files» лишається, шляхи замінити на `catalog/services/*.py`), процедура
  «add or change an endpoint»: валідація в `catalog/api/validation.py` → тест у `backend/tests/` → сервіс → view →
  `urls.py` перед `re_path` → README → `npm test`. Додайте: «`tests/golden/cases.json` — знімок контракту з
  Node-версії; змінюйте його лише свідомо, разом зі spec».
- `.claude/skills/verify-api/SKILL.md` — крок 1: `docker compose up -d`, опитування `http://localhost:8000/api/health`
  до `"store":"postgres"`; крок 2: `smoke.mjs` без токена; крок 3: `import_seed --reset --yes` і `docker compose
  down`. Приберіть згадки про `ADMIN_TOKEN`, MemoryStore і порт 3999.
- `.claude/skills/seed-data/SKILL.md` — перевірка: `docker compose run --rm api python manage.py import_seed`
  (інваріанти тепер у моделях і `cross_checks`); розділ «Tests depend on concrete seed values» → файли
  `backend/tests/*` і `backend/tests/golden/cases.json`; після правки seed — переконатися, що golden-випадки
  змінюються свідомо. Додайте: «Після імпорту джерело правди — БД; правки в адмінці не повертаються в JSON».
- `.claude/skills/frontend/SKILL.md` — «Shape»: API — Django на :8000 через проксі Vite; Express більше не віддає
  `public/`, CSP і `Referrer-Policy` для тайлів OSM переїдуть на CloudFront (підпроєкт 2), до того перевірка лише
  через `npm run dev:web`; маршрут `/admin` — Django admin. Розділ «Verify in the browser» — `docker compose up` +
  `npm run dev:web`, адреса :5173.
- `.claude/README.md` — таблиця скілів без `mongo-ops` і `deploy-render`; `seed-data` без `check-seed.mjs`;
  кандидати в hooks: замінити пункти 2–4 на «блокувати `import_seed --reset` без підтвердження користувача» і
  «Stop hook: `npm test` при змінах у `backend/` або `web/`».
- `README.md` — розділ «Запуск»: Docker Desktop, `npm install`, `npm run dev:api`, `import_seed`,
  `createsuperuser`, `npm run dev:web`; таблиця команд як у `CLAUDE.md`; таблиця ендпоінтів без `/api/admin/*`,
  з рядком «Модерація — `/admin/` (Django admin)»; приберіть розділи про Render і MongoDB.

- [ ] **Step 7: Технічна нотатка**

`docs/tech/2026-10-15-django-port-parity.md` (англійською) — що знадобилось для збігу з Node:
`round1` vs `toFixed` (половина вгору, `Decimal`), `uk_sort_key` замість `localeCompare('uk')`,
`ST_DistanceSphere` замість haversine, DRF-тіло повз `DATA_UPLOAD_MAX_MEMORY_SIZE` (middleware), формат
`createdAt`, свідомі відхилення з розділу Global Constraints цього плану, і будь-які розбіжності, знайдені
golden-тестами під час Tasks 7–8 (з причиною й виправленням).

- [ ] **Step 8: Фінальна перевірка й коміт**

Run: `npm test`
Expected: pytest і vitest PASS; запишіть обидві кількості.

```bash
git add -A
git commit -m "chore: видалити Node-бекенд і Mongo, документація під Django + PostGIS"
```

Повідомте користувачу підсумок: кількість тестів, що видалено, проміжний стан (фронтенд лише через Vite до
підпроєкту 2), і наступний крок — spec підпроєкту 2 (S3 + CloudFront).
