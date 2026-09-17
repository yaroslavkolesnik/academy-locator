import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from '../helpers/app.js';

const ids = (res) => res.body.items.map((i) => i.id);
const PALACE = { lat: 50.003594, lng: 36.2346559 };

describe('GET /api/institutions', () => {
  test('без фільтрів — 4 маркери та лічильник', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/institutions').expect(200);
    assert.deepEqual(res.body.summary, { institutions: 4, courses: 13 });
    assert.deepEqual(ids(res), ['hnpu', 'khpi', 'kh-palace', 'itstep-kharkiv']);

    const khpi = res.body.items.find((i) => i.id === 'khpi');
    assert.deepEqual(khpi, {
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
    });
  });

  test('фільтри: напрямок + вік', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/institutions?direction=robotics&ageFrom=10&ageTo=13').expect(200);
    assert.deepEqual(ids(res), ['khpi', 'kh-palace']);
    assert.deepEqual(res.body.summary, { institutions: 2, courses: 2 });
    assert.equal(res.body.items[0].courseCount, 4);
    assert.equal(res.body.items[0].matchedCourseCount, 1);
  });

  test('списки: через кому, повтором параметра, у нижньому регістрі для категорій', async () => {
    const { api } = makeApp();
    const a = await api.get('/api/institutions?category=a,m').expect(200);
    const b = await api.get('/api/institutions?category=A&category=M').expect(200);
    assert.deepEqual(ids(a), ['hnpu', 'kh-palace', 'itstep-kharkiv']);
    assert.deepEqual(ids(a), ids(b));
  });

  test('price, format, type, q', async () => {
    const { api } = makeApp();
    assert.deepEqual(ids(await api.get('/api/institutions?price=free&format=online')), ['khpi']);
    assert.deepEqual(ids(await api.get('/api/institutions?type=academy,center')), ['kh-palace', 'itstep-kharkiv']);
    assert.deepEqual(ids(await api.get('/api/institutions').query({ q: 'Fusion' })), ['khpi']);
  });

  test('порожні параметри ігноруються', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/institutions?q=&price=&category=&ageFrom=').expect(200);
    assert.equal(res.body.items.length, 4);
  });

  test('координати: distanceKm і сортування за відстанню', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/institutions').query(PALACE).expect(200);
    assert.equal(res.body.items[0].id, 'kh-palace');
    assert.equal(res.body.items[0].distanceKm, 0);
    const distances = res.body.items.map((i) => i.distanceKm);
    assert.deepEqual(distances, [...distances].sort((x, y) => x - y));
    assert.ok(distances.every((d) => typeof d === 'number'));
  });

  test('нічого не знайдено → 200 з порожнім списком', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/institutions?category=A&ageFrom=18').expect(200);
    assert.deepEqual(res.body, { summary: { institutions: 0, courses: 0 }, items: [] });
  });

  test('pending видно, rejected — ні', async () => {
    const { api, store } = makeApp();
    const base = { type: 'center', address: 'Харків', lat: 50, lng: 36.2 };
    const pending = await store.createInstitution({ ...base, name: 'Pending', declaredDirectionIds: ['animation'] });
    const rejected = await store.createInstitution({ ...base, name: 'Rejected' });
    await store.updateInstitutionStatus(rejected.id, 'rejected');

    const res = await api.get('/api/institutions').expect(200);
    const p = res.body.items.find((i) => i.id === pending.id);
    assert.equal(p.status, 'pending');
    assert.equal(p.courseCount, 0);
    assert.deepEqual(p.steamProfile, { S: 0, T: 0, E: 0, A: 1, M: 0 });
    assert.ok(!ids(res).includes(rejected.id));
  });

  describe('валідація → 400 VALIDATION_ERROR', () => {
    const cases = [
      ['category=X', 'category'],
      ['direction=unknown-direction', 'direction'],
      ['format=space', 'format'],
      ['type=school', 'type'],
      ['price=cheap', 'price'],
      ['ageFrom=abc', 'ageFrom'],
      ['ageFrom=-1', 'ageFrom'],
      ['ageFrom=10.5', 'ageFrom'],
      ['ageFrom=14&ageTo=10', 'ageTo'],
      ['lat=50', 'lng'],
      ['lat=200&lng=36', 'lat'],
      ['q[a]=1', 'q'],
      [`q=${'x'.repeat(101)}`, 'q'],
    ];
    for (const [query, path] of cases) {
      test(query.slice(0, 40), async () => {
        const { api } = makeApp();
        const res = await api.get(`/api/institutions?${query}`).expect(400);
        assert.equal(res.body.error.code, 'VALIDATION_ERROR');
        assert.ok(
          res.body.error.details.some((d) => d.path === path || d.path.startsWith(`${path}.`)),
          JSON.stringify(res.body.error.details),
        );
      });
    }
  });
});

describe('GET /api/institutions/:id', () => {
  test('картка закладу з напрямками у порядку STEAM', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/institutions/khpi').expect(200);
    const { institution, directions } = res.body;
    assert.equal(institution.id, 'khpi');
    assert.equal(institution.website, 'https://www.kpi.kharkov.ua');
    assert.equal(institution.courseCount, 4);
    assert.deepEqual(institution.steamProfile, { S: 0, T: 2, E: 2, A: 0, M: 0 });
    assert.deepEqual(directions.map((d) => d.slug), ['programming', 'robotics', '3d-modeling', 'electronics']);
    assert.deepEqual(directions.find((d) => d.slug === 'robotics'), {
      slug: 'robotics',
      name: 'Робототехніка',
      categoryCode: 'T',
      courseCount: 1,
      matchedCourseCount: 1,
    });
  });

  test('фільтри рахують matchedCourseCount, але не ховають напрямки', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/institutions/khpi?price=free').expect(200);
    const counts = Object.fromEntries(res.body.directions.map((d) => [d.slug, d.matchedCourseCount]));
    assert.deepEqual(counts, { programming: 1, robotics: 0, '3d-modeling': 0, electronics: 1 });
  });

  test('pending-заклад: заявлені напрямки з нулем курсів; contactPerson не публікується', async () => {
    const { api, store } = makeApp();
    const created = await store.createInstitution({
      name: 'Школа',
      type: 'private_school',
      address: 'Харків',
      lat: 50,
      lng: 36.2,
      contactPerson: 'Ірина',
      declaredDirectionIds: ['robotics'],
    });
    const res = await api.get(`/api/institutions/${created.id}`).expect(200);
    assert.equal(res.body.institution.status, 'pending');
    assert.ok(!('contactPerson' in res.body.institution));
    assert.deepEqual(res.body.directions, [
      { slug: 'robotics', name: 'Робототехніка', categoryCode: 'T', courseCount: 0, matchedCourseCount: 0 },
    ]);
  });

  test('404 для неіснуючого та rejected', async () => {
    const { api, store } = makeApp();
    const missing = await api.get('/api/institutions/missing').expect(404);
    assert.equal(missing.body.error.code, 'NOT_FOUND');

    const created = await store.createInstitution({ name: 'R', type: 'center', address: 'Харків', lat: 50, lng: 36.2 });
    await store.updateInstitutionStatus(created.id, 'rejected');
    await api.get(`/api/institutions/${created.id}`).expect(404);
  });

  test('400 для некоректного id', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/institutions/bad%20id!').expect(400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });
});

describe('GET /api/institutions/:id/directions/:slug/courses', () => {
  test('курси напрямку з інформацією про заклад і напрямок', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/institutions/itstep-kharkiv/directions/game-dev/courses').expect(200);
    assert.deepEqual(res.body.institution, { id: 'itstep-kharkiv', name: 'Комп\'ютерна Академія ITSTEP, Харків', shortName: 'ITSTEP Академія' });
    assert.deepEqual(res.body.direction, { slug: 'game-dev', name: 'Розробка ігор', categoryCode: 'T' });
    assert.deepEqual(res.body.items.map((c) => c.id), ['itstep-scratch', 'itstep-unity-3d']);

    const scratch = res.body.items[0];
    assert.deepEqual(Object.keys(scratch).sort(), [
      'ageMax', 'ageMin', 'durationText', 'format', 'id', 'level', 'matchesFilters', 'price', 'priceUnit',
      'scheduleText', 'seatsLeft', 'seatsTotal', 'shortDescription', 'startDate', 'title',
    ]);
    assert.equal(scratch.matchesFilters, true);
  });

  test('відповідні фільтрам курси першими', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/institutions/itstep-kharkiv/directions/game-dev/courses?format=online').expect(200);
    assert.deepEqual(
      res.body.items.map((c) => [c.id, c.matchesFilters]),
      [['itstep-unity-3d', true], ['itstep-scratch', false]],
    );
  });

  test('напрямок, якого немає в закладі → 200 з порожнім списком', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/institutions/itstep-kharkiv/directions/astronomy/courses').expect(200);
    assert.deepEqual(res.body.items, []);
  });

  test('404 для невідомого напрямку або закладу', async () => {
    const { api } = makeApp();
    const a = await api.get('/api/institutions/khpi/directions/unknown/courses').expect(404);
    assert.equal(a.body.error.code, 'NOT_FOUND');
    await api.get('/api/institutions/missing/directions/robotics/courses').expect(404);
  });

  test('400 для некоректного slug або фільтра', async () => {
    const { api } = makeApp();
    await api.get('/api/institutions/khpi/directions/Bad_Slug/courses').expect(400);
    await api.get('/api/institutions/khpi/directions/robotics/courses?price=cheap').expect(400);
  });
});
