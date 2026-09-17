import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { MongoClient } from 'mongodb';
import { createMongoStore } from '../../src/store/mongoStore.js';
import { runStoreContract } from './storeContract.js';

// Запускається лише з MONGODB_URI: npm run test:mongo
// Працює в окремій базі *_test, яку видаляє перед кожним тестом і наприкінці.
const uri = process.env.MONGODB_URI;
const dbName = `${process.env.MONGODB_DB || 'academy_locator'}_test`;
const skip = !uri && 'MONGODB_URI не задано';

async function dropTestDb() {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    await client.db(dbName).dropDatabase();
  } finally {
    await client.close();
  }
}

runStoreContract(
  'MongoStore',
  async () => {
    await dropTestDb();
    return createMongoStore({ uri, dbName });
  },
  { skip },
);

test('MongoStore: автосід не дублює дані при повторному старті', { skip }, async () => {
  await dropTestDb();
  const first = await createMongoStore({ uri, dbName });
  await first.createRegistration('khpi-robotics-arduino', { name: 'X', contact: 'x@x.ua', consent: true });
  await first.close();

  const second = await createMongoStore({ uri, dbName });
  try {
    assert.equal((await second.listInstitutions()).length, 4);
    assert.equal((await second.listCourses()).length, 13);
    // дані, змінені до перезапуску, збереглися
    assert.equal((await second.getCourse('khpi-robotics-arduino')).seatsLeft, 2);
    assert.equal((await second.listRegistrations()).length, 1);
  } finally {
    await second.close();
  }
});

after(async () => {
  if (uri) await dropTestDb();
});
