import { MongoClient } from 'mongodb';
import { AppError, ErrorCode } from '../errors.js';
import { autoSeed, ensureIndexes, getCollections } from './mongoSetup.js';
import { buildInstitutionDoc, buildRegistrationDoc } from './records.js';
import { loadSeedData } from './seedData.js';

const NO_ID = { projection: { _id: 0 } };

// Довідники (місто, категорії, напрямки, квіз) читаються з data/seed — вони змінюються
// лише разом із кодом. У MongoDB живуть заклади, курси та реєстрації.
export async function createMongoStore({
  uri,
  dbName = 'academy_locator',
  data = loadSeedData(),
  serverSelectionTimeoutMS = 5000,
} = {}) {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS });
  await client.connect();

  try {
    const db = client.db(dbName);
    const col = getCollections(db);

    await ensureIndexes(col);
    const seeded = await autoSeed(col, data);

    const { city, categories, directions, quiz } = data;

    return {
      kind: 'mongo',
      seeded,

      async getReference() {
        return structuredClone({ city, categories, directions, quiz });
      },

      async listInstitutions() {
        return col.institutions.find({}, NO_ID).sort({ _id: 1 }).toArray();
      },

      async getInstitution(id) {
        return col.institutions.findOne({ id }, NO_ID);
      },

      async listCourses({ institutionId } = {}) {
        const query = institutionId ? { institutionId } : {};
        return col.courses.find(query, NO_ID).sort({ _id: 1 }).toArray();
      },

      async getCourse(id) {
        return col.courses.findOne({ id }, NO_ID);
      },

      async createInstitution(input) {
        const doc = buildInstitutionDoc(input, { cityId: city.id });
        await col.institutions.insertOne({ ...doc });
        return doc;
      },

      async updateInstitutionStatus(id, status) {
        return col.institutions.findOneAndUpdate(
          { id },
          { $set: { status } },
          { ...NO_ID, returnDocument: 'after' },
        );
      },

      async createRegistration(courseId, input) {
        const existing = await col.courses.findOne({ id: courseId }, NO_ID);
        if (!existing) throw new AppError(ErrorCode.NOT_FOUND, 'Курс не знайдено');

        let course = existing;
        const limited = existing.seatsLeft !== null;
        if (limited) {
          // Атомарне зменшення лише за наявності місць — паралельні запити не підуть у мінус
          course = await col.courses.findOneAndUpdate(
            { id: courseId, seatsLeft: { $gt: 0 } },
            { $inc: { seatsLeft: -1 } },
            { ...NO_ID, returnDocument: 'after' },
          );
          if (!course) throw new AppError(ErrorCode.NO_SEATS, 'Вільних місць немає');
        }

        const registration = buildRegistrationDoc(input, course);
        try {
          await col.registrations.insertOne({ ...registration });
        } catch (err) {
          if (limited) await col.courses.updateOne({ id: courseId }, { $inc: { seatsLeft: 1 } });
          throw err;
        }
        return { registration, course };
      },

      async listRegistrations() {
        return col.registrations.find({}, NO_ID).sort({ createdAt: -1 }).toArray();
      },

      async close() {
        await client.close();
      },
    };
  } catch (err) {
    await client.close();
    throw err;
  }
}
