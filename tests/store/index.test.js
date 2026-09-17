import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../src/store/index.js';

const silent = { info() {}, warn() {} };

test('без MONGODB_URI → MemoryStore', async () => {
  const store = await createStore({ mongoUri: '', logger: silent });
  assert.equal(store.kind, 'memory');
  await store.close();
});

test('недоступна MongoDB → фолбек на MemoryStore з попередженням', async () => {
  const warnings = [];
  const store = await createStore({
    mongoUri: 'mongodb://127.0.0.1:1/unreachable',
    serverSelectionTimeoutMS: 300,
    logger: { info() {}, warn: (msg) => warnings.push(msg) },
  });
  assert.equal(store.kind, 'memory');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /MemoryStore/);
  await store.close();
});
