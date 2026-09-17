import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from '../helpers/app.js';

const valid = {
  name: 'Школа робототехніки «Кібер»',
  type: 'private_school',
  address: 'вул. Пушкінська, 50, Харків',
  lat: 50.0021,
  lng: 36.2445,
  shortDescription: 'Робототехніка та програмування для дітей 7–14 років.',
  website: 'https://kiber.example',
  phone: '+380501112233',
  email: '',
  contactPerson: 'Ірина',
  hasShelter: true,
  declaredDirectionIds: ['robotics', 'programming', 'robotics'],
};

describe('POST /api/institutions', () => {
  test('201: заклад створюється зі статусом pending і з’являється на карті', async () => {
    const { api, store } = makeApp();
    const res = await api.post('/api/institutions').send(valid).expect(201);
    const { institution } = res.body;

    assert.equal(institution.status, 'pending');
    assert.equal(institution.source, 'submission');
    assert.equal(institution.email, null);
    assert.equal(institution.shortName, valid.name);
    assert.deepEqual(institution.declaredDirectionIds, ['robotics', 'programming']);
    assert.ok(!('contactPerson' in institution), 'contactPerson не повертається публічно');
    assert.equal((await store.getInstitution(institution.id)).contactPerson, 'Ірина');

    const markers = await api.get('/api/institutions').expect(200);
    const marker = markers.body.items.find((i) => i.id === institution.id);
    assert.equal(marker.status, 'pending');
    assert.deepEqual(marker.steamProfile, { S: 0, T: 2, E: 0, A: 0, M: 0 });
  });

  test('ігнорує службові поля з тіла', async () => {
    const { api } = makeApp();
    const res = await api
      .post('/api/institutions')
      .send({ ...valid, id: 'hack', status: 'approved', source: 'seed' })
      .expect(201);
    assert.notEqual(res.body.institution.id, 'hack');
    assert.equal(res.body.institution.status, 'pending');
  });

  describe('400 VALIDATION_ERROR', () => {
    const cases = [
      ['точка поза Харковом (Київ)', { ...valid, lat: 50.45, lng: 30.52 }, 'lat'],
      ['координати рядками', { ...valid, lat: '50.0' }, 'lat'],
      ['без координат', { ...valid, lat: undefined, lng: undefined }, 'lat'],
      ['невідомий тип', { ...valid, type: 'kindergarten' }, 'type'],
      ['невідомий напрямок', { ...valid, declaredDirectionIds: ['cooking'] }, 'declaredDirectionIds.0'],
      ['немає ні телефону, ні email', { ...valid, phone: '', email: '' }, 'phone'],
      ['некоректний email', { ...valid, email: 'not-an-email' }, 'email'],
      ['сайт не http(s)', { ...valid, website: 'ftp://kiber.example' }, 'website'],
      ['коротка адреса', { ...valid, address: 'Хар' }, 'address'],
      ['без назви', { ...valid, name: undefined }, 'name'],
      ['hasShelter рядком', { ...valid, hasShelter: 'так' }, 'hasShelter'],
    ];
    for (const [title, body, path] of cases) {
      test(title, async () => {
        const { api, store } = makeApp();
        const res = await api.post('/api/institutions').send(body).expect(400);
        assert.equal(res.body.error.code, 'VALIDATION_ERROR');
        assert.ok(res.body.error.details.some((d) => d.path === path), JSON.stringify(res.body.error.details));
        assert.equal((await store.listInstitutions()).length, 4);
      });
    }
  });
});
