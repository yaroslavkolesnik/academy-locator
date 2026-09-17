import { describe, test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../../src/errors.js';

// Спільний набір перевірок: MemoryStore і MongoStore мають поводитися однаково.
// makeStore() повертає ініціалізоване сховище зі свіжими seed-даними.
export function runStoreContract(name, makeStore, { skip = false } = {}) {
  describe(`${name}: контракт сховища`, { skip }, () => {
    let store;

    beforeEach(async () => {
      if (store) await store.close();
      store = await makeStore();
    });

    after(async () => {
      if (store) await store.close();
    });

    test('kind', () => {
      assert.ok(['memory', 'mongo'].includes(store.kind));
    });

    test('getReference: місто, категорії, напрямки, квіз', async () => {
      const ref = await store.getReference();
      assert.equal(ref.city.id, 'kharkiv');
      assert.equal(ref.categories.length, 5);
      assert.equal(ref.directions.length, 11);
      assert.equal(ref.quiz.questions.length, 5);
    });

    test('listInstitutions: 4 seed-заклади без _id', async () => {
      const list = await store.listInstitutions();
      assert.deepEqual(list.map((i) => i.id), ['hnpu', 'khpi', 'kh-palace', 'itstep-kharkiv']);
      assert.ok(list.every((i) => !('_id' in i)));
    });

    test('getInstitution', async () => {
      assert.equal((await store.getInstitution('khpi')).shortName, 'НТУ «ХПІ»');
      assert.equal(await store.getInstitution('missing'), null);
    });

    test('listCourses: усі та за закладом', async () => {
      assert.equal((await store.listCourses()).length, 13);
      const khpi = await store.listCourses({ institutionId: 'khpi' });
      assert.equal(khpi.length, 4);
      assert.ok(khpi.every((c) => c.institutionId === 'khpi' && !('_id' in c)));
    });

    test('getCourse', async () => {
      assert.equal((await store.getCourse('khpi-robotics-arduino')).seatsLeft, 3);
      assert.equal(await store.getCourse('missing'), null);
    });

    test('зміна повернутого об’єкта не змінює сховище', async () => {
      const c = await store.getCourse('khpi-robotics-arduino');
      c.seatsLeft = 999;
      assert.equal((await store.getCourse('khpi-robotics-arduino')).seatsLeft, 3);
    });

    describe('createInstitution', () => {
      const input = {
        name: 'Школа роботів',
        type: 'private_school',
        address: 'вул. Сумська, 1, Харків',
        lat: 49.99,
        lng: 36.23,
        shortDescription: 'Робототехніка для дітей',
        website: 'https://example.com',
        phone: '+380501112233',
        email: 'hello@example.com',
        contactPerson: 'Ірина',
        hasShelter: true,
        declaredDirectionIds: ['robotics'],
      };

      test('створює pending-заклад із заповненими службовими полями', async () => {
        const created = await store.createInstitution(input);
        assert.match(created.id, /^[0-9a-f-]{36}$/);
        assert.equal(created.status, 'pending');
        assert.equal(created.source, 'submission');
        assert.equal(created.city, 'kharkiv');
        assert.equal(created.logoUrl, null);
        assert.equal(created.description, null);
        assert.ok(!Number.isNaN(Date.parse(created.createdAt)));
        assert.equal(created.contactPerson, 'Ірина');
        assert.ok(!('_id' in created));

        assert.deepEqual(await store.getInstitution(created.id), created);
        assert.equal((await store.listInstitutions()).length, 5);
      });

      test('ігнорує спробу передати службові поля', async () => {
        const created = await store.createInstitution({ ...input, id: 'hack', status: 'approved', source: 'seed' });
        assert.notEqual(created.id, 'hack');
        assert.equal(created.status, 'pending');
        assert.equal(created.source, 'submission');
      });

      test('необов’язкові поля отримують значення за замовчуванням', async () => {
        const created = await store.createInstitution({
          name: 'Мінімум',
          type: 'center',
          address: 'Харків',
          lat: 50,
          lng: 36.2,
        });
        assert.equal(created.website, null);
        assert.equal(created.hasShelter, null);
        assert.deepEqual(created.declaredDirectionIds, []);
      });
    });

    describe('updateInstitutionStatus', () => {
      test('змінює статус і повертає оновлений заклад', async () => {
        const created = await store.createInstitution({ name: 'X', type: 'center', address: 'Харків', lat: 50, lng: 36.2 });
        const updated = await store.updateInstitutionStatus(created.id, 'approved');
        assert.equal(updated.status, 'approved');
        assert.equal((await store.getInstitution(created.id)).status, 'approved');
      });

      test('null для неіснуючого закладу', async () => {
        assert.equal(await store.updateInstitutionStatus('missing', 'approved'), null);
      });
    });

    describe('createRegistration', () => {
      const input = { name: 'Олена', contact: '+380501234567', participantAge: 11, comment: '', consent: true };

      test('зменшує seatsLeft і зберігає реєстрацію', async () => {
        const { registration, course } = await store.createRegistration('khpi-robotics-arduino', input);
        assert.equal(course.seatsLeft, 2);
        assert.equal((await store.getCourse('khpi-robotics-arduino')).seatsLeft, 2);
        assert.match(registration.id, /^[0-9a-f-]{36}$/);
        assert.equal(registration.courseId, 'khpi-robotics-arduino');
        assert.equal(registration.institutionId, 'khpi');
        assert.equal(registration.name, 'Олена');
        assert.equal(registration.comment, null);
        assert.ok(!('_id' in registration));

        const all = await store.listRegistrations();
        assert.deepEqual(all.map((r) => r.id), [registration.id]);
      });

      test('курс без ліміту місць: seatsLeft лишається null', async () => {
        const { course } = await store.createRegistration('khpi-python-highschool', input);
        assert.equal(course.seatsLeft, null);
      });

      test('NOT_FOUND для неіснуючого курсу', async () => {
        await assert.rejects(store.createRegistration('missing', input), (err) => {
          assert.ok(err instanceof AppError);
          assert.equal(err.code, 'NOT_FOUND');
          return true;
        });
      });

      test('NO_SEATS, коли місця закінчились; паралельні запити не йдуть у мінус', async () => {
        // palace-lego має 2 вільних місця
        const results = await Promise.allSettled(
          Array.from({ length: 5 }, () => store.createRegistration('palace-lego', input)),
        );
        const ok = results.filter((r) => r.status === 'fulfilled');
        const failed = results.filter((r) => r.status === 'rejected');
        assert.equal(ok.length, 2);
        assert.ok(failed.every((r) => r.reason.code === 'NO_SEATS'));
        assert.equal((await store.getCourse('palace-lego')).seatsLeft, 0);
        assert.equal((await store.listRegistrations()).length, 2);
      });

      test('listRegistrations: нові першими', async () => {
        const a = await store.createRegistration('palace-astronomy', { ...input, name: 'A' });
        await new Promise((r) => setTimeout(r, 5));
        const b = await store.createRegistration('palace-astronomy', { ...input, name: 'B' });
        const list = await store.listRegistrations();
        assert.deepEqual(list.map((r) => r.id), [b.registration.id, a.registration.id]);
      });
    });
  });
}
