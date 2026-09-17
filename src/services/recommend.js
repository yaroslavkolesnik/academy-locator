import { indexById } from './filters.js';
import { hasCoordinates, haversineKm } from './geo.js';
import { FORMATS, labelOf } from '../validation/schemas.js';

// Скоринг квізу «Що обрати дитині?».
// input: { age, interests: (slug напрямку | код категорії)[], format: string[], price: 'free'|'any', lat?, lng? }
//
// Жорсткі умови: вік у межах курсу, «лише безкоштовні», є вільні місця, заклад approved,
// збіг з інтересами (за напрямком або категорією), якщо інтереси вказані.
// М'які (бали): точний напрямок > категорія, бажаний формат, близькість.

const WEIGHTS = { directionMatch: 0.5, categoryMatch: 0.25, format: 0.3, distance: 0.2 };
const DISTANCE_HORIZON_KM = 10;

const round = (value, digits) => Number(value.toFixed(digits));

function resolveInterests(interests = [], directionsById) {
  const directionIds = new Set();
  const categoryCodes = new Set();
  for (const item of interests) {
    if (directionsById.has(item)) {
      directionIds.add(item);
      categoryCodes.add(directionsById.get(item).categoryCode);
    } else if (/^[STEAM]$/.test(item)) {
      categoryCodes.add(item);
    }
  }
  return { directionIds, categoryCodes };
}

export function buildMapFilters(input, directions) {
  const directionsById = indexById(directions);
  const direction = (input.interests ?? []).filter((i) => directionsById.has(i));
  const category = (input.interests ?? []).filter((i) => /^[STEAM]$/.test(i));

  const filters = { ageFrom: input.age, ageTo: input.age };
  if (direction.length) filters.direction = direction;
  if (category.length) filters.category = category;
  if (input.format?.length) filters.format = input.format;
  if (input.price === 'free') filters.price = 'free';
  return filters;
}

function scoreCourse(course, { input, institution, direction, interests }) {
  const hasInterests = interests.directionIds.size > 0 || interests.categoryCodes.size > 0;
  const hasFormatPref = input.format?.length > 0;
  const hasLocation = hasCoordinates(input);

  const reasons = [`Підходить за віком (${course.ageMin}–${course.ageMax} років)`];
  let score = 0;
  let maxScore = 0;

  if (hasInterests) {
    maxScore += WEIGHTS.directionMatch;
    if (interests.directionIds.has(course.directionId)) {
      score += WEIGHTS.directionMatch;
      reasons.push(`Ваш інтерес: ${direction.name}`);
    } else if (interests.categoryCodes.has(direction.categoryCode)) {
      score += WEIGHTS.categoryMatch;
      reasons.push(`Схожий напрям: ${direction.name}`);
    } else {
      return null;
    }
  }

  if (hasFormatPref) {
    maxScore += WEIGHTS.format;
    if (input.format.includes(course.format)) {
      score += WEIGHTS.format;
      reasons.push(`Формат: ${labelOf(FORMATS, course.format).toLowerCase()}`);
    }
  }

  if (course.price === 0) reasons.push('Безкоштовно');

  let distanceKm = null;
  if (hasLocation) {
    distanceKm = round(haversineKm(input, institution), 1);
    maxScore += WEIGHTS.distance;
    score += WEIGHTS.distance * Math.max(0, 1 - distanceKm / DISTANCE_HORIZON_KM);
    reasons.push(`${distanceKm} км від вас`);
  }

  // Без вподобань усі підхожі курси рівноцінні
  const normalized = maxScore > 0 ? score / maxScore : 1;
  return { score: round(normalized, 2), rawScore: normalized, reasons, distanceKm };
}

function compareCandidates(a, b) {
  return (
    b.rawScore - a.rawScore ||
    a.course.startDate.localeCompare(b.course.startDate) ||
    a.course.id.localeCompare(b.course.id)
  );
}

// data: { institutions, courses, directions }
export function recommend(input, data, { limit = 3 } = {}) {
  const directionsById = indexById(data.directions);
  const institutionsById = indexById(data.institutions);
  const interests = resolveInterests(input.interests, directionsById);

  const candidates = [];
  for (const course of data.courses) {
    const institution = institutionsById.get(course.institutionId);
    const direction = directionsById.get(course.directionId);
    if (!institution || institution.status !== 'approved' || !direction) continue;
    if (input.age != null && (input.age < course.ageMin || input.age > course.ageMax)) continue;
    if (input.price === 'free' && course.price !== 0) continue;
    if (course.seatsLeft === 0) continue;

    const scored = scoreCourse(course, { input, institution, direction, interests });
    if (scored) candidates.push({ course, institution, direction, ...scored });
  }
  candidates.sort(compareCandidates);

  // Спершу найкращий курс кожного закладу — на карті підсвічуються різні точки
  const picked = [];
  const seenInstitutions = new Set();
  for (const candidate of candidates) {
    if (picked.length === limit) break;
    if (seenInstitutions.has(candidate.institution.id)) continue;
    seenInstitutions.add(candidate.institution.id);
    picked.push(candidate);
  }
  for (const candidate of candidates) {
    if (picked.length === limit) break;
    if (!picked.includes(candidate)) picked.push(candidate);
  }
  picked.sort(compareCandidates);

  return picked.map(({ rawScore, ...item }) => item);
}
