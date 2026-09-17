// Формування відповідей API з «сирих» даних сховища. Чисті функції без I/O.
// catalog: { institutions, courses, directions, categories }

import { applyFilters, courseMatches, indexById, isPubliclyVisible, normalizeText, textMatches } from './filters.js';
import { hasCoordinates, haversineKm } from './geo.js';
import { STEAM_CODES, steamProfile } from './steamProfile.js';

const SUGGEST_LIMIT = 5;
const PRIVATE_INSTITUTION_FIELDS = ['contactPerson'];

const round1 = (n) => Math.round(n * 10) / 10;

export function toPublicInstitution(institution) {
  const copy = { ...institution };
  for (const field of PRIVATE_INSTITUTION_FIELDS) delete copy[field];
  return copy;
}

const directionSummary = (d) => ({ slug: d.slug, name: d.name, categoryCode: d.categoryCode });

// Короткі дані курсу для списків (без опису та розкладу по днях)
const courseSummary = (c) => ({
  id: c.id,
  title: c.title,
  shortDescription: c.shortDescription,
  ageMin: c.ageMin,
  ageMax: c.ageMax,
  level: c.level,
  format: c.format,
  price: c.price,
  priceUnit: c.priceUnit,
  durationText: c.durationText,
  scheduleText: c.scheduleText,
  startDate: c.startDate,
  seatsTotal: c.seatsTotal,
  seatsLeft: c.seatsLeft,
});

function compareDirections(a, b) {
  return (
    STEAM_CODES.indexOf(a.categoryCode) - STEAM_CODES.indexOf(b.categoryCode) || a.name.localeCompare(b.name, 'uk')
  );
}

function coursesOf(catalog, institutionId) {
  return catalog.courses.filter((c) => c.institutionId === institutionId);
}

function filterContext(catalog) {
  return { directionsById: indexById(catalog.directions), institutionsById: indexById(catalog.institutions) };
}

function findVisibleInstitution(catalog, id) {
  const institution = catalog.institutions.find((i) => i.id === id);
  return institution && isPubliclyVisible(institution) ? institution : null;
}

// GET /api/institutions
export function buildInstitutionMarkers(catalog, filters = {}) {
  const directionsById = indexById(catalog.directions);
  const withLocation = hasCoordinates(filters);

  const items = applyFilters(catalog, filters).map(({ institution, courses, matchedCourses }) => ({
    id: institution.id,
    name: institution.name,
    shortName: institution.shortName,
    type: institution.type,
    lat: institution.lat,
    lng: institution.lng,
    address: institution.address,
    status: institution.status,
    courseCount: courses.length,
    matchedCourseCount: matchedCourses.length,
    steamProfile: steamProfile({
      courses,
      declaredDirectionIds: institution.declaredDirectionIds,
      directionsById,
    }),
    distanceKm: withLocation ? round1(haversineKm(filters, institution)) : null,
  }));

  if (withLocation) items.sort((a, b) => a.distanceKm - b.distanceKm);

  return {
    summary: {
      institutions: items.length,
      courses: items.reduce((sum, item) => sum + item.matchedCourseCount, 0),
    },
    items,
  };
}

// GET /api/institutions/:id — null, якщо заклад не існує або відхилений
export function buildInstitutionCard(catalog, id, filters = {}) {
  const institution = findVisibleInstitution(catalog, id);
  if (!institution) return null;

  const ctx = filterContext(catalog);
  const courses = coursesOf(catalog, id);

  const stats = new Map();
  const statFor = (directionId) => {
    if (!stats.has(directionId)) stats.set(directionId, { courseCount: 0, matchedCourseCount: 0 });
    return stats.get(directionId);
  };
  for (const course of courses) {
    const stat = statFor(course.directionId);
    stat.courseCount += 1;
    if (courseMatches(course, filters, ctx)) stat.matchedCourseCount += 1;
  }
  for (const directionId of institution.declaredDirectionIds ?? []) statFor(directionId);

  const directions = [...stats]
    .filter(([directionId]) => ctx.directionsById.has(directionId))
    .map(([directionId, stat]) => ({ ...directionSummary(ctx.directionsById.get(directionId)), ...stat }))
    .sort(compareDirections);

  return {
    institution: {
      ...toPublicInstitution(institution),
      courseCount: courses.length,
      steamProfile: steamProfile({
        courses,
        declaredDirectionIds: institution.declaredDirectionIds,
        directionsById: ctx.directionsById,
      }),
    },
    directions,
  };
}

// GET /api/institutions/:id/directions/:slug/courses
// null — заклад не знайдено; { directionNotFound: true } — невідомий напрямок
export function buildDirectionCourses(catalog, id, slug, filters = {}) {
  const institution = findVisibleInstitution(catalog, id);
  if (!institution) return null;

  const direction = catalog.directions.find((d) => d.slug === slug);
  if (!direction) return { directionNotFound: true };

  const ctx = filterContext(catalog);
  const items = coursesOf(catalog, id)
    .filter((c) => c.directionId === direction.id)
    .map((c) => ({ ...courseSummary(c), matchesFilters: courseMatches(c, filters, ctx) }))
    .sort((a, b) => Number(b.matchesFilters) - Number(a.matchesFilters) || a.startDate.localeCompare(b.startDate));

  return {
    institution: { id: institution.id, name: institution.name, shortName: institution.shortName },
    direction: directionSummary(direction),
    items,
  };
}

// GET /api/courses/:id — null, якщо курс не існує або його заклад прихований
export function buildCourseDetails({ course, institution, directions, categories }) {
  if (!course || !institution || !isPubliclyVisible(institution)) return null;

  const direction = directions.find((d) => d.id === course.directionId);
  const category = categories.find((c) => c.code === direction?.categoryCode);

  return {
    course,
    institution: {
      id: institution.id,
      name: institution.name,
      shortName: institution.shortName,
      type: institution.type,
      address: institution.address,
      lat: institution.lat,
      lng: institution.lng,
      website: institution.website,
      phone: institution.phone,
      email: institution.email,
      status: institution.status,
    },
    direction: direction ? directionSummary(direction) : null,
    category: category ? { code: category.code, name: category.name, color: category.color } : null,
  };
}

// Збіги з початку назви — першими, далі за алфавітом
function rankByPrefix(items, query, labelOf) {
  const q = normalizeText(query);
  return items
    .map((item) => ({ item, prefix: normalizeText(labelOf(item)).startsWith(q) }))
    .sort((a, b) => Number(b.prefix) - Number(a.prefix) || labelOf(a.item).localeCompare(labelOf(b.item), 'uk'))
    .slice(0, SUGGEST_LIMIT)
    .map(({ item }) => item);
}

// GET /api/search/suggest
export function buildSuggestions(catalog, query) {
  const visibleInstitutions = catalog.institutions.filter(isPubliclyVisible);
  const institutionsById = indexById(visibleInstitutions);
  const visibleCourses = catalog.courses.filter((c) => institutionsById.has(c.institutionId));
  const offeredDirectionIds = new Set(visibleCourses.map((c) => c.directionId));

  const directions = catalog.directions.filter(
    (d) => offeredDirectionIds.has(d.id) && textMatches(query, [d.name, ...(d.keywords ?? [])]),
  );
  const institutions = visibleInstitutions.filter((i) => textMatches(query, [i.name, i.shortName]));
  const courses = visibleCourses.filter((c) => textMatches(query, [c.title]));

  return {
    directions: rankByPrefix(directions, query, (d) => d.name).map(directionSummary),
    institutions: rankByPrefix(institutions, query, (i) => i.shortName).map((i) => ({
      id: i.id,
      shortName: i.shortName,
      type: i.type,
    })),
    courses: rankByPrefix(courses, query, (c) => c.title).map((c) => ({
      id: c.id,
      title: c.title,
      institutionId: c.institutionId,
      institutionShortName: institutionsById.get(c.institutionId).shortName,
      directionSlug: catalog.directions.find((d) => d.id === c.directionId)?.slug ?? null,
    })),
  };
}

// POST /api/recommendations — елементи з recommend() у формат API
export function toRecommendationItems(items) {
  return items.map(({ course, institution, direction, score, reasons, distanceKm }) => ({
    course: courseSummary(course),
    institution: {
      id: institution.id,
      name: institution.name,
      shortName: institution.shortName,
      lat: institution.lat,
      lng: institution.lng,
    },
    direction: directionSummary(direction),
    score,
    reasons,
    distanceKm,
  }));
}

// GET /api/admin/registrations — додає назви курсу та закладу
export function buildAdminRegistrations(registrations, { institutions, courses }) {
  const coursesById = indexById(courses);
  const institutionsById = indexById(institutions);
  return registrations.map((r) => ({
    ...r,
    courseTitle: coursesById.get(r.courseId)?.title ?? null,
    institutionShortName: institutionsById.get(r.institutionId)?.shortName ?? null,
  }));
}
