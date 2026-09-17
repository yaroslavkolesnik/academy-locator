import { AppError, ErrorCode } from '../errors.js';
import { buildInstitutionDoc, buildRegistrationDoc, byCreatedAtDesc } from './records.js';
import { loadSeedData } from './seedData.js';

// Сховище в пам'яті процесу: дані з data/seed, зміни живуть до перезапуску.
// Методи асинхронні — той самий інтерфейс, що й у MongoStore.
export function createMemoryStore({ data = loadSeedData() } = {}) {
  const { city, categories, directions, quiz } = data;
  const institutions = structuredClone(data.institutions);
  const courses = structuredClone(data.courses);
  const registrations = [];

  const copy = (value) => (value == null ? null : structuredClone(value));
  const findById = (list, id) => list.find((item) => item.id === id);

  return {
    kind: 'memory',

    async getReference() {
      return structuredClone({ city, categories, directions, quiz });
    },

    async listInstitutions() {
      return structuredClone(institutions);
    },

    async getInstitution(id) {
      return copy(findById(institutions, id));
    },

    async listCourses({ institutionId } = {}) {
      const list = institutionId ? courses.filter((c) => c.institutionId === institutionId) : courses;
      return structuredClone(list);
    },

    async getCourse(id) {
      return copy(findById(courses, id));
    },

    async createInstitution(input) {
      const doc = buildInstitutionDoc(input, { cityId: city.id });
      institutions.push(doc);
      return structuredClone(doc);
    },

    async updateInstitutionStatus(id, status) {
      const institution = findById(institutions, id);
      if (!institution) return null;
      institution.status = status;
      return structuredClone(institution);
    },

    async createRegistration(courseId, input) {
      const course = findById(courses, courseId);
      if (!course) throw new AppError(ErrorCode.NOT_FOUND, 'Курс не знайдено');
      // Перевірка й зменшення без await між ними — атомарно в межах event loop
      if (course.seatsLeft !== null) {
        if (course.seatsLeft <= 0) throw new AppError(ErrorCode.NO_SEATS, 'Вільних місць немає');
        course.seatsLeft -= 1;
      }
      const registration = buildRegistrationDoc(input, course);
      registrations.push(registration);
      return { registration: structuredClone(registration), course: structuredClone(course) };
    },

    async listRegistrations() {
      return structuredClone(registrations).sort(byCreatedAtDesc);
    },

    async close() {},
  };
}
