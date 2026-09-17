import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from '../helpers/app.js';

const suggest = (api, q) => api.get('/api/search/suggest').query({ q });

describe('GET /api/search/suggest', () => {
  test('«робот» → напрямок робототехніка та курси, збіги з початку назви першими', async () => {
    const { api } = makeApp();
    const res = await suggest(api, 'робот').expect(200);
    assert.deepEqual(res.body.directions, [{ slug: 'robotics', name: 'Робототехніка', categoryCode: 'T' }]);
    assert.deepEqual(res.body.institutions, []);
    assert.deepEqual(res.body.courses, [
      {
        id: 'khpi-robotics-arduino',
        title: 'Робототехніка на Arduino',
        institutionId: 'khpi',
        institutionShortName: 'НТУ «ХПІ»',
        directionSlug: 'robotics',
      },
      {
        id: 'palace-lego',
        title: 'LEGO-конструювання та перші роботи',
        institutionId: 'kh-palace',
        institutionShortName: 'Палац дитячої та юнацької творчості',
        directionSlug: 'robotics',
      },
    ]);
  });

  test('напрямок за синонімом', async () => {
    const { api } = makeApp();
    const res = await suggest(api, 'lego').expect(200);
    assert.deepEqual(res.body.directions.map((d) => d.slug), ['robotics']);
    assert.deepEqual(res.body.courses.map((c) => c.id), ['palace-lego']);
  });

  test('заклад за скороченою назвою, без регістру та з різними апострофами', async () => {
    const { api } = makeApp();
    assert.deepEqual((await suggest(api, 'хпі').expect(200)).body.institutions, [{ id: 'khpi', shortName: 'НТУ «ХПІ»', type: 'university' }]);
    assert.deepEqual((await suggest(api, 'комп’ютерна').expect(200)).body.institutions.map((i) => i.id), ['itstep-kharkiv']);
  });

  test('напрямки: збіги з початку назви першими', async () => {
    const { api } = makeApp();
    const res = await suggest(api, 'ро').expect(200);
    const starts = res.body.directions.map((d) => d.name.toLowerCase().startsWith('ро'));
    assert.deepEqual(starts, [true, true, false, false, false]);
  });

  test('не більше 5 у групі', async () => {
    const { api } = makeApp();
    const res = await suggest(api, 'ха').expect(200);
    for (const group of ['directions', 'institutions', 'courses']) assert.ok(res.body[group].length <= 5);
  });

  test('напрямки без курсів не підказуються', async () => {
    const { api, store } = makeApp();
    // робимо всі курси недоступними, відхиливши заклади
    for (const id of ['hnpu', 'khpi', 'kh-palace', 'itstep-kharkiv']) await store.updateInstitutionStatus(id, 'rejected');
    const res = await suggest(api, 'роб').expect(200);
    assert.deepEqual(res.body, { directions: [], institutions: [], courses: [] });
  });

  test('400: q коротший за 2 символи або відсутній', async () => {
    const { api } = makeApp();
    const short = await suggest(api, ' р ').expect(400);
    assert.equal(short.body.error.code, 'VALIDATION_ERROR');
    await api.get('/api/search/suggest').expect(400);
  });
});
