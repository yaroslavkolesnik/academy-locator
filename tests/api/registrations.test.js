import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeApp } from '../helpers/app.js';

const valid = { name: 'Олена', contact: '+380 50 123-45-67', participantAge: 11, comment: '', consent: true };
const register = (api, courseId, body) => api.post(`/api/courses/${courseId}/registrations`).send(body);

describe('POST /api/courses/:id/registrations', () => {
  test('201: реєстрація приймається, seatsLeft зменшується', async () => {
    const { api, store } = makeApp();
    const res = await register(api, 'khpi-robotics-arduino', valid).expect(201);
    assert.match(res.body.id, /^[0-9a-f-]{36}$/);
    assert.deepEqual(
      { ...res.body, id: undefined },
      { id: undefined, courseId: 'khpi-robotics-arduino', status: 'received', seatsLeft: 2 },
    );

    const [saved] = await store.listRegistrations();
    assert.equal(saved.contact, '+380 50 123-45-67');
    assert.equal(saved.comment, null);
    assert.equal((await api.get('/api/courses/khpi-robotics-arduino')).body.course.seatsLeft, 2);
  });

  test('email як контакт; необовʼязкові поля можна не передавати', async () => {
    const { api } = makeApp();
    await register(api, 'khpi-python-highschool', { name: 'Андрій', contact: 'andrii@example.com', consent: true }).expect(
      201,
    );
  });

  test('409 NO_SEATS, коли місця закінчились', async () => {
    const { api } = makeApp();
    await register(api, 'palace-lego', valid).expect(201);
    await register(api, 'palace-lego', valid).expect(201);
    const res = await register(api, 'palace-lego', valid).expect(409);
    assert.equal(res.body.error.code, 'NO_SEATS');
  });

  test('404 для неіснуючого курсу або курсу відхиленого закладу', async () => {
    const { api, store } = makeApp();
    assert.equal((await register(api, 'missing', valid).expect(404)).body.error.code, 'NOT_FOUND');
    await store.updateInstitutionStatus('khpi', 'rejected');
    await register(api, 'khpi-robotics-arduino', valid).expect(404);
    assert.equal((await store.getCourse('khpi-robotics-arduino')).seatsLeft, 3);
  });

  describe('400 VALIDATION_ERROR', () => {
    const cases = [
      ['без згоди', { ...valid, consent: false }, 'consent'],
      ['згода рядком', { ...valid, consent: 'true' }, 'consent'],
      ['коротке імʼя', { ...valid, name: ' О ' }, 'name'],
      ['контакт не телефон і не email', { ...valid, contact: '12345' }, 'contact'],
      ['вік рядком', { ...valid, participantAge: '11' }, 'participantAge'],
      ['довгий коментар', { ...valid, comment: 'x'.repeat(501) }, 'comment'],
      ['порожнє тіло', {}, 'name'],
    ];
    for (const [title, body, path] of cases) {
      test(title, async () => {
        const { api, store } = makeApp();
        const res = await register(api, 'khpi-robotics-arduino', body).expect(400);
        assert.equal(res.body.error.code, 'VALIDATION_ERROR');
        assert.ok(res.body.error.details.some((d) => d.path === path), JSON.stringify(res.body.error.details));
        assert.equal((await store.getCourse('khpi-robotics-arduino')).seatsLeft, 3);
      });
    }

    test('битий JSON', async () => {
      const { api } = makeApp();
      const res = await api
        .post('/api/courses/khpi-robotics-arduino/registrations')
        .set('Content-Type', 'application/json')
        .send('{"name":')
        .expect(400);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    });
  });

  test('429 після ліміту записів', async () => {
    const { api } = makeApp({ env: { WRITE_RATE_LIMIT_MAX: '1' } });
    await register(api, 'khpi-python-highschool', valid).expect(201);
    const res = await register(api, 'khpi-python-highschool', valid).expect(429);
    assert.equal(res.body.error.code, 'RATE_LIMITED');
    // читання не обмежується лімітом записів
    await api.get('/api/courses/khpi-python-highschool').expect(200);
  });
});
