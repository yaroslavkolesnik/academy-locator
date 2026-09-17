// Integrity check for data/seed/*.json. Usage: node .claude/skills/seed-data/check-seed.mjs
// Exits 1 and lists problems when an invariant from SKILL.md is broken.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const seedDir = fileURLToPath(new URL('../../../data/seed/', import.meta.url));
const load = (name) => JSON.parse(readFileSync(`${seedDir}${name}.json`, 'utf8'));

const city = load('city');
const categories = load('categories');
const directions = load('directions');
const institutions = load('institutions');
const courses = load('courses');
const quiz = load('quiz');

const errors = [];
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const catCodes = new Set(categories.map((c) => c.code));
const dirIds = new Set(directions.map((d) => d.id));
const instIds = new Set(institutions.map((i) => i.id));

const dupes = (list, label) => {
  const seen = new Set();
  for (const { id } of list) {
    if (seen.has(id)) errors.push(`${label}: duplicate id ${id}`);
    seen.add(id);
  }
};
dupes(directions, 'direction');
dupes(institutions, 'institution');
dupes(courses, 'course');

for (const d of directions) {
  if (d.id !== d.slug) errors.push(`direction ${d.id}: id !== slug`);
  if (!catCodes.has(d.categoryCode)) errors.push(`direction ${d.id}: unknown category ${d.categoryCode}`);
}

const b = city.bounds;
for (const i of institutions) {
  if (!(i.lat >= b.south && i.lat <= b.north && i.lng >= b.west && i.lng <= b.east)) {
    errors.push(`institution ${i.id}: coordinates outside city bounds`);
  }
  for (const id of i.declaredDirectionIds ?? []) {
    if (!dirIds.has(id)) errors.push(`institution ${i.id}: unknown declared direction ${id}`);
  }
}

for (const c of courses) {
  if (!instIds.has(c.institutionId)) errors.push(`course ${c.id}: unknown institution ${c.institutionId}`);
  if (!dirIds.has(c.directionId)) errors.push(`course ${c.id}: unknown direction ${c.directionId}`);
  if (!(c.ageMin <= c.ageMax)) errors.push(`course ${c.id}: ageMin > ageMax`);
  if (!(c.price >= 0)) errors.push(`course ${c.id}: invalid price`);
  const weekday = DAYS[new Date(`${c.startDate}T12:00:00Z`).getUTCDay()];
  if (!c.scheduleDays?.includes(weekday)) {
    errors.push(`course ${c.id}: startDate ${c.startDate} is ${weekday}, not in scheduleDays [${c.scheduleDays}]`);
  }
  const bothNull = c.seatsTotal === null && c.seatsLeft === null;
  const bothNumbers = Number.isInteger(c.seatsTotal) && Number.isInteger(c.seatsLeft) && c.seatsLeft <= c.seatsTotal;
  if (!bothNull && !bothNumbers) errors.push(`course ${c.id}: inconsistent seatsTotal/seatsLeft`);
}

const usedDirections = new Set(courses.map((c) => c.directionId));
for (const d of directions) {
  if (!usedDirections.has(d.id)) errors.push(`direction ${d.id}: has no courses`);
}

for (const option of quiz.questions.flatMap((q) => q.options)) {
  for (const id of option.value?.interests ?? []) {
    if (!dirIds.has(id)) errors.push(`quiz option ${option.id}: unknown interest ${id}`);
  }
}

console.log(
  `institutions ${institutions.length}, courses ${courses.length}, directions ${directions.length}, ` +
    `free ${courses.filter((c) => c.price === 0).length}`,
);
if (errors.length) {
  console.error(errors.map((e) => `  ✖ ${e}`).join('\n'));
  process.exit(1);
}
console.log('OK: no integrity errors');
