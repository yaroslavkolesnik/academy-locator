// Чисті функції фільтрації каталогу. Отримують уже провалідовані фільтри:
// { q?, category?[], direction?[], ageFrom?, ageTo?, price?: 'free'|'paid', format?[], type?[] }
// Списки — АБО всередині, різні фільтри — І між собою.

const PUBLIC_STATUSES = new Set(['approved', 'pending']);

export function indexById(list) {
  return new Map(list.map((item) => [item.id, item]));
}

export function normalizeText(value) {
  return String(value ?? '')
    .toLocaleLowerCase('uk')
    .replace(/[’ʼ`‘]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

const nonEmpty = (list) => Array.isArray(list) && list.length > 0;

export function hasCourseFilters(filters) {
  return Boolean(
    normalizeText(filters.q) ||
      nonEmpty(filters.category) ||
      nonEmpty(filters.direction) ||
      filters.ageFrom != null ||
      filters.ageTo != null ||
      filters.price ||
      nonEmpty(filters.format),
  );
}

export function isPubliclyVisible(institution) {
  return PUBLIC_STATUSES.has(institution.status);
}

// Усі слова запиту мають зустрітися серед полів (підрядком, без регістру)
export function textMatches(query, fields) {
  const tokens = normalizeText(query).split(' ').filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = normalizeText(fields.filter(Boolean).join(' '));
  return tokens.every((token) => haystack.includes(token));
}

// ctx: { directionsById: Map, institutionsById: Map }
export function courseMatches(course, filters, ctx) {
  const direction = ctx.directionsById.get(course.directionId);

  if (nonEmpty(filters.category) && !filters.category.includes(direction?.categoryCode)) return false;
  if (nonEmpty(filters.direction) && !filters.direction.includes(course.directionId)) return false;

  const ageFrom = filters.ageFrom ?? -Infinity;
  const ageTo = filters.ageTo ?? Infinity;
  if (course.ageMin > ageTo || course.ageMax < ageFrom) return false;

  if (filters.price === 'free' && course.price !== 0) return false;
  if (filters.price === 'paid' && !(course.price > 0)) return false;

  if (nonEmpty(filters.format) && !filters.format.includes(course.format)) return false;

  if (filters.q) {
    const institution = ctx.institutionsById.get(course.institutionId);
    const fields = [
      course.title,
      direction?.name,
      ...(direction?.keywords ?? []),
      institution?.name,
      institution?.shortName,
    ];
    if (!textMatches(filters.q, fields)) return false;
  }

  return true;
}

// Правило карти: публічний заклад показуємо, якщо він проходить фільтр типу і
// (фільтрів курсів немає АБО в нього є хоча б один відповідний курс).
// Повертає [{ institution, courses, matchedCourses }] у порядку institutions.
export function applyFilters({ institutions, courses, directions }, filters = {}) {
  const ctx = { directionsById: indexById(directions), institutionsById: indexById(institutions) };
  const courseFilterActive = hasCourseFilters(filters);

  const coursesByInstitution = new Map();
  for (const course of courses) {
    if (!coursesByInstitution.has(course.institutionId)) coursesByInstitution.set(course.institutionId, []);
    coursesByInstitution.get(course.institutionId).push(course);
  }

  const result = [];
  for (const institution of institutions) {
    if (!isPubliclyVisible(institution)) continue;
    if (nonEmpty(filters.type) && !filters.type.includes(institution.type)) continue;

    const own = coursesByInstitution.get(institution.id) ?? [];
    const matchedCourses = courseFilterActive ? own.filter((c) => courseMatches(c, filters, ctx)) : own;
    if (courseFilterActive && matchedCourses.length === 0) continue;

    result.push({ institution, courses: own, matchedCourses });
  }
  return result;
}
