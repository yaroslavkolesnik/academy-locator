import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from '../helpers/app.js';

describe('GET /api/health', () => {
  test('200 зі статусом сховища', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/health').expect(200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.store, 'memory');
    assert.equal(typeof res.body.uptimeSec, 'number');
  });
});

describe('GET /api/meta', () => {
  test('усі довідники для старту фронтенду', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/meta').expect(200);
    const b = res.body;

    assert.equal(b.city.id, 'kharkiv');
    assert.deepEqual(Object.keys(b.city.bounds).sort(), ['east', 'north', 'south', 'west']);
    assert.ok(!('dataNotice' in b.city));
    assert.match(b.dataNotice, /демонстраційними/);

    assert.deepEqual(b.categories.map((c) => c.code), ['S', 'T', 'E', 'A', 'M']);
    assert.equal(b.directions.length, 11);
    assert.deepEqual(Object.keys(b.directions[0]).sort(), ['categoryCode', 'id', 'keywords', 'name', 'slug']);

    assert.deepEqual(b.institutionTypes.map((t) => t.id), ['university', 'academy', 'private_school', 'center']);
    assert.deepEqual(b.formats.map((f) => f.id), ['offline', 'online', 'hybrid']);
    assert.deepEqual(b.ageGroups.map((g) => g.id), ['6-9', '10-13', '14-17', '18+']);
    assert.deepEqual(b.ageGroups[0], { id: '6-9', ageFrom: 6, ageTo: 9, name: '6–9 років' });
    assert.deepEqual(b.levels.map((l) => l.id), ['beginner', 'intermediate', 'advanced']);
    assert.deepEqual(b.priceOptions.map((p) => p.id), ['free', 'paid']);
  });

  test('кешується на 5 хвилин', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/meta').expect(200);
    assert.match(res.headers['cache-control'], /max-age=300/);
  });
});

describe('GET /api/quiz', () => {
  test('5 питань квізу', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/quiz').expect(200);
    assert.equal(res.body.id, 'what-to-choose');
    assert.deepEqual(res.body.questions.map((q) => q.id), ['age', 'interests', 'format', 'price', 'distance']);
  });
});

describe('загальна поведінка', () => {
  test('невідомий /api маршрут → 404 JSON', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/nope').expect(404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  test('helmet-заголовки', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/health');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['x-powered-by'], undefined);
  });

  test('CORS вимкнено без CORS_ORIGIN', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/health').set('Origin', 'https://evil.example');
    assert.equal(res.headers['access-control-allow-origin'], undefined);
  });

  test('CORS дозволяє лише домени з CORS_ORIGIN', async () => {
    const { api } = makeApp({ env: { CORS_ORIGIN: 'http://localhost:5173, https://demo.example' } });
    const ok = await api.get('/api/health').set('Origin', 'http://localhost:5173');
    assert.equal(ok.headers['access-control-allow-origin'], 'http://localhost:5173');
    const denied = await api.get('/api/health').set('Origin', 'https://evil.example');
    assert.equal(denied.headers['access-control-allow-origin'], undefined);
  });

  test('rate limit → 429 RATE_LIMITED', async () => {
    const { api } = makeApp({ env: { RATE_LIMIT_MAX: '2' } });
    await api.get('/api/health').expect(200);
    await api.get('/api/health').expect(200);
    const res = await api.get('/api/health').expect(429);
    assert.equal(res.body.error.code, 'RATE_LIMITED');
  });

  test('непередбачена помилка → 500 INTERNAL без деталей', async () => {
    const { createMemoryStore } = await import('../../src/store/memoryStore.js');
    const store = createMemoryStore();
    store.listInstitutions = async () => {
      throw new Error('db exploded: secret connection string');
    };
    const { api } = makeApp({ store });
    const res = await api.get('/api/institutions').expect(500);
    assert.equal(res.body.error.code, 'INTERNAL');
    assert.ok(!JSON.stringify(res.body).includes('secret'));
  });
});
