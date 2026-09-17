// Спільні для MongoStore і scripts/seed.js: колекції, індекси, наповнення seed-даними.

const DUPLICATE_KEY = 11000;

export function getCollections(db) {
  return {
    institutions: db.collection('institutions'),
    courses: db.collection('courses'),
    registrations: db.collection('registrations'),
  };
}

export async function ensureIndexes(col) {
  await Promise.all([
    col.institutions.createIndex({ id: 1 }, { unique: true }),
    col.institutions.createIndex({ status: 1 }),
    col.courses.createIndex({ id: 1 }, { unique: true }),
    col.courses.createIndex({ institutionId: 1 }),
    col.registrations.createIndex({ id: 1 }, { unique: true }),
    col.registrations.createIndex({ createdAt: -1 }),
  ]);
}

// Під час старту сервера: заливає seed лише в порожні колекції. Унікальний індекс по id
// захищає від дублів, якщо два екземпляри стартують одночасно.
export async function autoSeed(col, data) {
  const seeded = { institutions: 0, courses: 0 };
  for (const name of ['institutions', 'courses']) {
    if ((await col[name].estimatedDocumentCount()) > 0) continue;
    try {
      const res = await col[name].insertMany(structuredClone(data[name]), { ordered: true });
      seeded[name] = res.insertedCount;
    } catch (err) {
      if (err.code !== DUPLICATE_KEY) throw err;
    }
  }
  return seeded;
}

// npm run seed
//   reset: false — оновлює seed-заклади та курси з JSON (включно з кількістю місць),
//                  видаляє seed-записи, яких більше немає в JSON; заявки й реєстрації не чіпає.
//   reset: true  — очищає заклади, курси та реєстрації і заливає seed з нуля (перед показом).
export async function syncSeedData(col, data, { reset = false } = {}) {
  const result = { reset, institutions: 0, courses: 0, removedInstitutions: 0, removedCourses: 0, removedRegistrations: 0 };

  if (reset) {
    result.removedInstitutions = (await col.institutions.deleteMany({})).deletedCount;
    result.removedCourses = (await col.courses.deleteMany({})).deletedCount;
    result.removedRegistrations = (await col.registrations.deleteMany({})).deletedCount;
    result.institutions = (await col.institutions.insertMany(structuredClone(data.institutions))).insertedCount;
    result.courses = (await col.courses.insertMany(structuredClone(data.courses))).insertedCount;
    return result;
  }

  const replaceAll = async (collection, docs) => {
    if (docs.length === 0) return 0;
    const res = await collection.bulkWrite(
      docs.map((doc) => ({ replaceOne: { filter: { id: doc.id }, replacement: structuredClone(doc), upsert: true } })),
    );
    return res.upsertedCount + res.matchedCount;
  };

  const institutionIds = data.institutions.map((i) => i.id);
  const courseIds = data.courses.map((c) => c.id);

  result.institutions = await replaceAll(col.institutions, data.institutions);
  result.courses = await replaceAll(col.courses, data.courses);
  result.removedInstitutions = (
    await col.institutions.deleteMany({ source: 'seed', id: { $nin: institutionIds } })
  ).deletedCount;
  // Курси створюються лише через seed, тож усе, чого немає в JSON, — застаріле
  result.removedCourses = (await col.courses.deleteMany({ id: { $nin: courseIds } })).deletedCount;
  return result;
}
