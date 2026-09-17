import { createMemoryStore } from './memoryStore.js';
import { createMongoStore } from './mongoStore.js';

// Є MONGODB_URI і база доступна → MongoStore; інакше → MemoryStore.
// Параметри передаються явно (config.js у Фазі 3), process.env — лише значення за замовчуванням.
export async function createStore({
  mongoUri = process.env.MONGODB_URI,
  dbName = process.env.MONGODB_DB || 'academy_locator',
  serverSelectionTimeoutMS = 5000,
  logger = console,
} = {}) {
  if (!mongoUri) {
    logger.info('[store] MONGODB_URI не задано — використовується MemoryStore');
    return createMemoryStore();
  }

  try {
    const store = await createMongoStore({ uri: mongoUri, dbName, serverSelectionTimeoutMS });
    const { institutions, courses } = store.seeded;
    const seedNote = institutions || courses ? `, автосід: ${institutions} закладів, ${courses} курсів` : '';
    logger.info(`[store] MongoStore підключено (база ${dbName}${seedNote})`);
    return store;
  } catch (err) {
    logger.warn(
      `[store] Не вдалося підключитися до MongoDB (${err.message}) — фолбек на MemoryStore, зміни не зберігатимуться`,
    );
    return createMemoryStore();
  }
}
