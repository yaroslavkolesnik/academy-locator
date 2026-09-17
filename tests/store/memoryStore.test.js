import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStore } from '../../src/store/memoryStore.js';
import { runStoreContract } from './storeContract.js';

runStoreContract('MemoryStore', async () => createMemoryStore());

test('MemoryStore: окремі екземпляри не ділять стан', async () => {
  const a = createMemoryStore();
  const b = createMemoryStore();
  await a.createRegistration('khpi-robotics-arduino', { name: 'X', contact: 'x@x.ua', consent: true });
  assert.equal((await a.getCourse('khpi-robotics-arduino')).seatsLeft, 2);
  assert.equal((await b.getCourse('khpi-robotics-arduino')).seatsLeft, 3);
});
