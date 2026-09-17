import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from '../helpers/app.js';

describe('GET /api/courses/:id', () => {
  test('повні деталі курсу, заклад, напрямок і категорія', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/courses/khpi-robotics-arduino').expect(200);
    const { course, institution, direction, category } = res.body;

    assert.equal(course.title, 'Робототехніка на Arduino');
    assert.equal(course.ageMin, 11);
    assert.equal(course.seatsLeft, 3);
    assert.deepEqual(course.scheduleDays, ['sat']);
    assert.ok(course.description.length > 50);

    assert.deepEqual(institution, {
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
    });
    assert.deepEqual(direction, { slug: 'robotics', name: 'Робототехніка', categoryCode: 'T' });
    assert.deepEqual(category, { code: 'T', name: 'Технології', color: '#2563EB' });
  });

  test('реєстрація одразу відображається в seatsLeft', async () => {
    const { api, store } = makeApp();
    await store.createRegistration('palace-lego', { name: 'X', contact: 'x@x.ua', consent: true });
    const res = await api.get('/api/courses/palace-lego').expect(200);
    assert.equal(res.body.course.seatsLeft, 1);
  });

  test('404 для неіснуючого курсу', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/courses/missing').expect(404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  test('404, якщо заклад курсу відхилено', async () => {
    const { api, store } = makeApp();
    await store.updateInstitutionStatus('khpi', 'rejected');
    await api.get('/api/courses/khpi-robotics-arduino').expect(404);
  });

  test('400 для некоректного id', async () => {
    const { api } = makeApp();
    await api.get(`/api/courses/${'a'.repeat(70)}`).expect(400);
  });
});
