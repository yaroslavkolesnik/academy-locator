import 'dotenv/config';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createStore } from './store/index.js';

const config = loadConfig();
const store = await createStore({ mongoUri: config.mongoUri, dbName: config.mongoDb });
const app = createApp({ store, config });

const server = app.listen(config.port, () => {
  console.info(`[server] Academy Locator API: http://localhost:${config.port}/api (store: ${store.kind})`);
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`[server] ${signal}: зупинка…`);
  server.close(async () => {
    await store.close();
    process.exit(0);
  });
  // Якщо з'єднання не закрились вчасно — виходимо примусово
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
