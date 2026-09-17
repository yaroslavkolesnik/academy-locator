import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MongoClient } from 'mongodb';
import { createMongoStore } from '../../src/store/mongoStore.js';
import { ensureIndexes, getCollections, syncSeedData } from '../../src/store/mongoSetup.js';
import { loadSeedData } from '../../src/store/seedData.js';

// Запускається лише з MONGODB_URI (npm run test:mongo), в окремій базі *_seedtest
const uri = process.env.MONGODB_URI;
const dbName = `${process.env.MONGODB_DB || 'academy_locator'}_seedtest`;
const skip = !uri && 'MONGODB_URI не задано';

let client;
let col;
let store;

before(async () => {
  if (skip) return;
  client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
});

beforeEach(async () => {
  if (skip) return;
  if (store) await store.close();
  await client.db(dbName).dropDatabase();
  store = await createMongoStore({ uri, dbName });
  col = getCollections(client.db(dbName));
  await ensureIndexes(col);
});

after(async () => {
  if (skip) return;
  if (store) await store.close();
  await client.db(dbName).dropDatabase();
  await client.close();
});

const registration = { name: 'Олена', contact: 'olena@example.com', consent: true };

test('sync: повертає каталог до JSON, зберігає заявки й реєстрації', { skip }, async () => {
  await store.createRegistration('khpi-robotics-arduino', registration);
  const submission = await store.createInstitution({ name: 'Школа', type: 'center', address: 'Харків', lat: 50, lng: 36.2 });
  await col.courses.updateOne({ id: 'palace-lego' }, { $set: { title: 'Змінено вручну' } });
  await col.courses.insertOne({ id: 'stale-course', institutionId: 'khpi', directionId: 'robotics' });
  await col.institutions.insertOne({ id: 'stale-seed', source: 'seed', status: 'approved' });

  const result = await syncSeedData(col, loadSeedData());

  assert.equal(result.removedCourses, 1);
  assert.equal(result.removedInstitutions, 1);
  assert.equal((await store.getCourse('palace-lego')).title, 'LEGO-конструювання та перші роботи');
  assert.equal((await store.getCourse('khpi-robotics-arduino')).seatsLeft, 3);
  assert.equal(await store.getCourse('stale-course'), null);
  assert.equal(await store.getInstitution('stale-seed'), null);
  assert.equal((await store.getInstitution(submission.id)).status, 'pending');
  assert.equal((await store.listRegistrations()).length, 1);
  assert.equal((await store.listCourses()).length, 13);
});

test('reset: очищає заявки й реєстрації та заливає seed з нуля', { skip }, async () => {
  await store.createRegistration('khpi-robotics-arduino', registration);
  await store.createInstitution({ name: 'Школа', type: 'center', address: 'Харків', lat: 50, lng: 36.2 });

  const result = await syncSeedData(col, loadSeedData(), { reset: true });

  assert.deepEqual(
    { ...result },
    { reset: true, institutions: 4, courses: 13, removedInstitutions: 5, removedCourses: 13, removedRegistrations: 1 },
  );
  assert.equal((await store.listInstitutions()).length, 4);
  assert.equal((await store.listRegistrations()).length, 0);
  assert.equal((await store.getCourse('khpi-robotics-arduino')).seatsLeft, 3);
});

test('sync двічі поспіль не створює дублів', { skip }, async () => {
  await syncSeedData(col, loadSeedData());
  await syncSeedData(col, loadSeedData());
  assert.equal(await col.institutions.countDocuments(), 4);
  assert.equal(await col.courses.countDocuments(), 13);
});
