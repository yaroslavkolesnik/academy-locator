// Наповнення MongoDB seed-даними з data/seed.
//   npm run seed             — оновити каталог (заявки й реєстрації зберігаються)
//   npm run seed -- --reset  — очистити все й залити seed з нуля (перед демо)
import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { loadConfig } from '../src/config.js';
import { ensureIndexes, getCollections, syncSeedData } from '../src/store/mongoSetup.js';
import { loadSeedData } from '../src/store/seedData.js';

const config = loadConfig();
const reset = process.argv.includes('--reset');

if (!config.mongoUri) {
  console.error('[seed] MONGODB_URI не задано — нічого сідувати (MemoryStore завжди читає JSON напряму).');
  process.exit(1);
}

const client = new MongoClient(config.mongoUri, { serverSelectionTimeoutMS: 10000 });

try {
  await client.connect();
  const col = getCollections(client.db(config.mongoDb));
  await ensureIndexes(col);
  const r = await syncSeedData(col, loadSeedData(), { reset });

  console.info(`[seed] База: ${config.mongoDb}, режим: ${reset ? 'RESET' : 'sync'}`);
  console.info(`[seed] Заклади: ${r.institutions} записано, ${r.removedInstitutions} видалено`);
  console.info(`[seed] Курси: ${r.courses} записано, ${r.removedCourses} видалено`);
  if (reset) console.info(`[seed] Реєстрації: ${r.removedRegistrations} видалено`);
} catch (err) {
  console.error(`[seed] Помилка: ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.close();
}
