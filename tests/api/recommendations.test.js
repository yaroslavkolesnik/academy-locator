import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from '../helpers/app.js';

const olena = { age: 11, interests: ['robotics', '3d-modeling', 'electronics'], format: ['offline', 'hybrid'], price: 'any' };

describe('POST /api/recommendations', () => {
  test('сценарій Олени: фільтри для карти й топ курсів з поясненнями', async () => {
    const { api } = makeApp();
    const res = await api.post('/api/recommendations').send(olena).expect(200);

    assert.deepEqual(res.body.filters, {
      ageFrom: 11,
      ageTo: 11,
      direction: ['robotics', '3d-modeling', 'electronics'],
      format: ['offline', 'hybrid'],
    });
    assert.deepEqual(res.body.items.map((i) => i.course.id), ['khpi-robotics-arduino', 'itstep-scratch']);

    const [top] = res.body.items;
    assert.deepEqual(top.institution, {
      id: 'khpi',
      name: 'Національний технічний університет «Харківський політехнічний інститут»',
      shortName: 'НТУ «ХПІ»',
      lat: 49.9989798,
      lng: 36.2483061,
    });
    assert.deepEqual(top.direction, { slug: 'robotics', name: 'Робототехніка', categoryCode: 'T' });
    assert.equal(top.course.title, 'Робототехніка на Arduino');
    assert.ok(!('description' in top.course));
    assert.equal(top.score, 1);
    assert.deepEqual(top.reasons, ['Підходить за віком (11–16 років)', 'Ваш інтерес: Робототехніка', 'Формат: офлайн']);
    assert.equal(top.distanceKm, null);
  });

  test('значення за замовчуванням і координати', async () => {
    const { api } = makeApp();
    const res = await api.post('/api/recommendations').send({ age: 12, lat: 50.0045811, lng: 36.2568894 }).expect(200);
    assert.equal(res.body.items.length, 3);
    assert.equal(res.body.items[0].distanceKm, 0);
    assert.deepEqual(res.body.filters, { ageFrom: 12, ageTo: 12 });
  });

  test('нічого не підходить → порожній список', async () => {
    const { api } = makeApp();
    const res = await api.post('/api/recommendations').send({ age: 30, interests: ['astronomy'] }).expect(200);
    assert.deepEqual(res.body.items, []);
  });

  describe('400 VALIDATION_ERROR', () => {
    const cases = [
      ['без віку', { interests: ['T'] }, 'age'],
      ['невідомий інтерес', { age: 10, interests: ['cooking'] }, 'interests.0'],
      ['невідомий формат', { age: 10, format: ['space'] }, 'format.0'],
      ['price paid не підтримується', { age: 10, price: 'paid' }, 'price'],
      ['лише lat', { age: 10, lat: 50 }, 'lng'],
    ];
    for (const [title, body, path] of cases) {
      test(title, async () => {
        const { api } = makeApp();
        const res = await api.post('/api/recommendations').send(body).expect(400);
        assert.ok(res.body.error.details.some((d) => d.path === path), JSON.stringify(res.body.error.details));
      });
    }
  });
});
