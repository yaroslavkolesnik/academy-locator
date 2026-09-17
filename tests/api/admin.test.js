import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from '../helpers/app.js';

const TOKEN = 'test-admin-token-123';
const withAdmin = () => makeApp({ env: { ADMIN_TOKEN: TOKEN } });
const submission = {
  name: 'Школа «Кібер»',
  type: 'private_school',
  address: 'вул. Пушкінська, 50, Харків',
  lat: 50.0021,
  lng: 36.2445,
  phone: '+380501112233',
  contactPerson: 'Ірина',
};

describe('адмінка', () => {
  test('без ADMIN_TOKEN адмін-роути вимкнені (404)', async () => {
    const { api } = makeApp();
    await api.get('/api/admin/submissions').set('X-Admin-Token', '').expect(404);
    await api.get('/api/admin/registrations').expect(404);
  });

  test('401 без токена або з неправильним токеном', async () => {
    const { api } = withAdmin();
    const missing = await api.get('/api/admin/submissions').expect(401);
    assert.equal(missing.body.error.code, 'UNAUTHORIZED');
    await api.get('/api/admin/submissions').set('X-Admin-Token', 'wrong').expect(401);
    await api.patch('/api/admin/institutions/khpi').set('X-Admin-Token', `${TOKEN}x`).send({ status: 'rejected' }).expect(401);
  });

  test('повний цикл модерації: заявка → список → approve → на карті approved', async () => {
    const { api } = withAdmin();
    const { body } = await api.post('/api/institutions').send(submission).expect(201);
    const id = body.institution.id;

    const list = await api.get('/api/admin/submissions').set('X-Admin-Token', TOKEN).expect(200);
    assert.equal(list.headers['cache-control'], 'no-store');
    assert.deepEqual(list.body.items.map((i) => i.id), [id]);
    assert.equal(list.body.items[0].contactPerson, 'Ірина');

    const patched = await api
      .patch(`/api/admin/institutions/${id}`)
      .set('X-Admin-Token', TOKEN)
      .send({ status: 'approved' })
      .expect(200);
    assert.equal(patched.body.institution.status, 'approved');

    assert.deepEqual((await api.get('/api/admin/submissions').set('X-Admin-Token', TOKEN)).body.items, []);
    const marker = (await api.get('/api/institutions')).body.items.find((i) => i.id === id);
    assert.equal(marker.status, 'approved');
  });

  test('reject ховає заклад з карти', async () => {
    const { api } = withAdmin();
    const { body } = await api.post('/api/institutions').send(submission).expect(201);
    await api
      .patch(`/api/admin/institutions/${body.institution.id}`)
      .set('X-Admin-Token', TOKEN)
      .send({ status: 'rejected' })
      .expect(200);
    await api.get(`/api/institutions/${body.institution.id}`).expect(404);
  });

  test('PATCH: 404 для неіснуючого закладу, 400 для некоректного статусу', async () => {
    const { api } = withAdmin();
    await api.patch('/api/admin/institutions/missing').set('X-Admin-Token', TOKEN).send({ status: 'approved' }).expect(404);
    const bad = await api
      .patch('/api/admin/institutions/khpi')
      .set('X-Admin-Token', TOKEN)
      .send({ status: 'deleted' })
      .expect(400);
    assert.equal(bad.body.error.details[0].path, 'status');
  });

  test('реєстрації з назвою курсу та закладу, нові першими', async () => {
    const { api } = withAdmin();
    const reg = { name: 'Олена', contact: 'olena@example.com', consent: true };
    await api.post('/api/courses/palace-astronomy/registrations').send(reg).expect(201);
    await new Promise((r) => setTimeout(r, 5));
    await api.post('/api/courses/khpi-robotics-arduino/registrations').send({ ...reg, name: 'Андрій' }).expect(201);

    const res = await api.get('/api/admin/registrations').set('X-Admin-Token', TOKEN).expect(200);
    assert.deepEqual(
      res.body.items.map((r) => [r.name, r.courseTitle, r.institutionShortName]),
      [
        ['Андрій', 'Робототехніка на Arduino', 'НТУ «ХПІ»'],
        ['Олена', 'Астрономічний гурток «Зоряний шлях»', 'Палац дитячої та юнацької творчості'],
      ],
    );
  });
});
