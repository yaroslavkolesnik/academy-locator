import request from 'supertest';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';
import { createMemoryStore } from '../../src/store/memoryStore.js';

// Express-додаток на свіжому MemoryStore. env — перевизначення змінних оточення.
export function makeApp({ env = {}, store = createMemoryStore() } = {}) {
  const config = loadConfig(env);
  const app = createApp({ store, config, logger: { error() {}, info() {}, warn() {} } });
  return { app, store, api: request(app) };
}
