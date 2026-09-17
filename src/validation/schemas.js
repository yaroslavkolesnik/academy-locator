import { z } from 'zod';
import { AppError, ErrorCode } from '../errors.js';
import { STEAM_CODES } from '../services/steamProfile.js';

// ── Довідники-константи: єдине джерело для валідації, /api/meta та сервісів ──

export const INSTITUTION_TYPES = Object.freeze([
  { id: 'university', name: 'Університет' },
  { id: 'academy', name: 'Академія' },
  { id: 'private_school', name: 'Приватна школа' },
  { id: 'center', name: 'Освітній центр' },
]);

export const FORMATS = Object.freeze([
  { id: 'offline', name: 'Офлайн' },
  { id: 'online', name: 'Онлайн' },
  { id: 'hybrid', name: 'Гібрид' },
]);

export const AGE_GROUPS = Object.freeze([
  { id: '6-9', ageFrom: 6, ageTo: 9, name: '6–9 років' },
  { id: '10-13', ageFrom: 10, ageTo: 13, name: '10–13 років' },
  { id: '14-17', ageFrom: 14, ageTo: 17, name: '14–17 років' },
  { id: '18+', ageFrom: 18, ageTo: 99, name: '18+ років' },
]);

export const LEVELS = Object.freeze([
  { id: 'beginner', name: 'Початковий' },
  { id: 'intermediate', name: 'Середній' },
  { id: 'advanced', name: 'Просунутий' },
]);

export const PRICE_OPTIONS = Object.freeze([
  { id: 'free', name: 'Безкоштовно' },
  { id: 'paid', name: 'Платно' },
]);

export const INSTITUTION_STATUSES = Object.freeze(['approved', 'pending', 'rejected']);

const ids = (list) => list.map((item) => item.id);
export const labelOf = (list, id) => list.find((item) => item.id === id)?.name ?? id;

// ── Будівельні блоки ──

const MAX_AGE = 120;
const emptyToUndefined = (value) => (value === '' || value === undefined ? undefined : value);
const blankToUndefined = (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value);

// Список з query: "a,b", ?x=a&x=b або ?x[]=a. Порожнє → undefined, дублікати прибираються.
function listParam(itemSchema, { transform = (s) => s } = {}) {
  return z.preprocess(
    (value) => {
      if (value === undefined || value === '') return undefined;
      const raw = Array.isArray(value) ? value : [value];
      if (raw.some((v) => typeof v !== 'string')) return value;
      const items = raw.flatMap((v) => v.split(',')).map((v) => transform(v.trim())).filter(Boolean);
      return items.length ? [...new Set(items)] : undefined;
    },
    z.array(itemSchema, { invalid_type_error: 'Очікується список значень' }).optional(),
  );
}

const ageParam = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number({ invalid_type_error: 'Вік має бути числом' })
    .int('Вік має бути цілим числом')
    .min(0, 'Вік не може бути відʼємним')
    .max(MAX_AGE, `Вік не може перевищувати ${MAX_AGE}`)
    .optional(),
);

const coordinateParam = (min, max) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ invalid_type_error: 'Координата має бути числом' })
      .min(min, `Координата має бути в межах ${min}…${max}`)
      .max(max, `Координата має бути в межах ${min}…${max}`)
      .optional(),
  );

const searchText = (min, max) =>
  z.preprocess(
    (value) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : value),
    z
      .string({ invalid_type_error: 'Очікується рядок', required_error: 'Параметр обовʼязковий' })
      .min(min, `Мінімум ${min} символи`)
      .max(max, `Максимум ${max} символів`),
  );

// ── Параметри шляху ──

export const idParamSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/, 'Некоректний ідентифікатор'),
});

export const directionCoursesParamsSchema = idParamSchema.extend({
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/, 'Некоректний slug напрямку'),
});

// ── Query ──

// Фільтри каталогу. Допустимі напрямки залежать від довідника, тому схема створюється фабрикою.
export function createCatalogFiltersSchema({ directionIds }) {
  return z
    .object({
      q: z.preprocess(blankToUndefined, searchText(1, 100).optional()),
      category: listParam(z.enum(STEAM_CODES), { transform: (s) => s.toUpperCase() }),
      direction: listParam(z.enum(directionIds)),
      ageFrom: ageParam,
      ageTo: ageParam,
      price: z.preprocess(emptyToUndefined, z.enum(ids(PRICE_OPTIONS)).optional()),
      format: listParam(z.enum(ids(FORMATS))),
      type: listParam(z.enum(ids(INSTITUTION_TYPES))),
      lat: coordinateParam(-90, 90),
      lng: coordinateParam(-180, 180),
    })
    .superRefine((f, ctx) => {
      if (f.ageFrom != null && f.ageTo != null && f.ageFrom > f.ageTo) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['ageTo'], message: 'ageTo має бути ≥ ageFrom' });
      }
      if ((f.lat == null) !== (f.lng == null)) {
        const path = f.lat == null ? 'lat' : 'lng';
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message: 'lat і lng передаються разом' });
      }
    });
}

export const suggestQuerySchema = z.object({
  q: searchText(2, 100),
});

// ── Виконання ──

export function parseOrThrow(schema, data, message = 'Некоректні параметри запиту') {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const details = result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
  throw new AppError(ErrorCode.VALIDATION_ERROR, message, details);
}

// ── Тіла POST/PATCH ──

const PHONE_CHARS = /^\+?[0-9\s()-]+$/;
const isPhone = (value) => PHONE_CHARS.test(value) && /^\d{10,15}$/.test(value.replace(/\D/g, ''));
const isEmail = (value) => z.string().email().safeParse(value).success;

const trimmed = (value) => (typeof value === 'string' ? value.trim() : value);
// Порожні поля форми ('' або null) → відсутні
const optionalField = (schema) =>
  z.preprocess((v) => {
    const t = trimmed(v);
    return t === '' || t === null ? undefined : t;
  }, schema.optional());

const requiredText = (min, max, label) =>
  z.preprocess(
    trimmed,
    z
      .string({ required_error: `${label}: обовʼязкове поле`, invalid_type_error: `${label}: очікується рядок` })
      .min(min, `${label}: мінімум ${min} символи`)
      .max(max, `${label}: максимум ${max} символів`),
  );

const phoneSchema = z.string().refine(isPhone, 'Некоректний номер телефону');
const emailSchema = z.string().email('Некоректний email').max(200);

const jsonAge = z
  .number({ invalid_type_error: 'Вік має бути числом' })
  .int('Вік має бути цілим числом')
  .min(0, 'Вік не може бути відʼємним')
  .max(MAX_AGE, `Вік не може перевищувати ${MAX_AGE}`);

export const registrationBodySchema = z.object({
  name: requiredText(2, 100, 'Імʼя'),
  contact: z.preprocess(
    trimmed,
    z
      .string({ required_error: 'Контакт: обовʼязкове поле', invalid_type_error: 'Контакт: очікується рядок' })
      .max(200)
      .refine((v) => isPhone(v) || isEmail(v), 'Вкажіть телефон або email'),
  ),
  participantAge: optionalField(jsonAge),
  comment: optionalField(z.string().max(500, 'Коментар: максимум 500 символів')),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Потрібна згода на обробку персональних даних' }),
  }),
});

// Заявка «Додати заклад». Координати — в межах міста, напрямки — з довідника.
export function createInstitutionSubmissionSchema({ bounds, directionIds }) {
  const inBounds = (min, max, label) =>
    z
      .number({ required_error: `${label}: обовʼязкове поле`, invalid_type_error: `${label}: очікується число` })
      .min(min, 'Точка має бути в межах міста')
      .max(max, 'Точка має бути в межах міста');

  return z
    .object({
      name: requiredText(2, 150, 'Назва'),
      shortName: optionalField(z.string().max(60, 'Коротка назва: максимум 60 символів')),
      type: z.enum(ids(INSTITUTION_TYPES), { errorMap: () => ({ message: 'Оберіть тип закладу' }) }),
      address: requiredText(5, 200, 'Адреса'),
      lat: inBounds(bounds.south, bounds.north, 'lat'),
      lng: inBounds(bounds.west, bounds.east, 'lng'),
      shortDescription: optionalField(z.string().max(300, 'Опис: максимум 300 символів')),
      website: optionalField(
        z
          .string()
          .max(300)
          .url('Некоректне посилання')
          .refine((v) => /^https?:\/\//i.test(v), 'Посилання має починатися з http:// або https://'),
      ),
      phone: optionalField(phoneSchema),
      email: optionalField(emailSchema),
      contactPerson: optionalField(z.string().max(100, 'Контактна особа: максимум 100 символів')),
      hasShelter: z.boolean({ invalid_type_error: 'hasShelter: очікується true/false' }).nullable().optional(),
      declaredDirectionIds: z
        .array(z.enum(directionIds), { invalid_type_error: 'Очікується список напрямків' })
        .max(directionIds.length)
        .default([])
        .transform((list) => [...new Set(list)]),
    })
    .superRefine((body, ctx) => {
      if (!body.phone && !body.email) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['phone'], message: 'Вкажіть телефон або email' });
      }
    });
}

export function createRecommendationsBodySchema({ directionIds }) {
  const interestIds = new Set([...directionIds, ...STEAM_CODES]);
  return z
    .object({
      age: jsonAge,
      interests: z
        .array(z.string().refine((v) => interestIds.has(v), 'Невідомий інтерес'))
        .max(20)
        .default([]),
      format: z.array(z.enum(ids(FORMATS))).default([]),
      price: z.enum(['free', 'any']).default('any'),
      lat: z.number().min(-90).max(90).optional(),
      lng: z.number().min(-180).max(180).optional(),
    })
    .superRefine((body, ctx) => {
      if ((body.lat == null) !== (body.lng == null)) {
        const path = body.lat == null ? 'lat' : 'lng';
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message: 'lat і lng передаються разом' });
      }
    });
}

export const institutionStatusBodySchema = z.object({
  status: z.enum(INSTITUTION_STATUSES, { errorMap: () => ({ message: 'Статус: approved, pending або rejected' }) }),
});
