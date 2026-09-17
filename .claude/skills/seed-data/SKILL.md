---
name: seed-data
description: Rules and checks for data/seed/*.json (Kharkiv institutions, STEAM directions, courses, quiz). Use before adding or editing an institution, course, direction or quiz question, when verifying a real address or contact, or when a test fails after a seed change.
---

# Seed data

## What is real and what is not

- **Institutions are real** Kharkiv organizations. **Courses, schedules, prices and seats are fictional**;
  `city.json#dataNotice` states this and `/api/meta` serves it to the UI.
- Descriptions of real institutions contain only publicly verifiable facts (founding year, faculty count,
  location). Anything about programs for children belongs in fictional courses, not in institution text.
- Unverified `phone`, `email`, `logoUrl`, `hasShelter` → `null`. Never guess shelter data: this is wartime Kharkiv
  and parents rely on it. Do not use real logos.

## Verifying a real institution

1. Address and contacts: the institution's official site (contacts page); cross-check with one directory
   (osvita.ua, education.ua, 2gis). Cite the sources to the user.
2. Coordinates: OpenStreetMap Nominatim through Node `fetch` (curl from Git Bash mangles Cyrillic):
   ```js
   const u = new URL('https://nominatim.openstreetmap.org/search');
   u.search = new URLSearchParams({ street: '2 вулиця Кирпичова', city: 'Харків', country: 'Україна', format: 'json', limit: '2' });
   const r = await fetch(u, { headers: { 'User-Agent': 'academy-locator-demo/0.1' } });
   ```
   Keep ≥1 s between requests. Prefer the result whose `display_name` names the institution or its building.
3. Coordinates must fall inside `city.json#bounds` (also enforced for submissions).

## Invariants

- IDs are readable kebab-case strings; course IDs are prefixed with the institution (`khpi-robotics-arduino`).
- `course.institutionId` and `course.directionId` reference existing records; `direction.id === direction.slug`;
  `direction.categoryCode` ∈ S/T/E/A/M.
- `startDate` (ISO) falls on a weekday listed in `scheduleDays`.
- `ageMin <= ageMax` (adults: `ageMax: 99`); `price` in UAH, `0` = free.
- `seatsTotal` and `seatsLeft` are both `null` (unlimited) or both numbers with `seatsLeft <= seatsTotal`.
- Every quiz `interests` value is an existing direction id. Every direction has at least one course.

Run the check after any edit:

```bash
node .claude/skills/seed-data/check-seed.mjs
```

## Tests depend on concrete seed values

`tests/api/*`, `tests/services/*` and `tests/store/storeContract.js` assert real values: 4 institutions,
13 courses, 11 directions, institution order, `khpi-robotics-arduino` = ages 11–16 with 3 seats, `palace-lego` =
2 seats, the "Olena" scenario (age 11, build interests, offline) returning `khpi-robotics-arduino` then
`itstep-scratch`. A seed change usually requires updating those tests in the same change — run `npm test` and
fix expectations deliberately, never by loosening assertions.

Seed changes are a behavior change: spec and plan first (CLAUDE.md hard rule 1). After deploy, the Mongo copy
is updated with `npm run seed` (skill `mongo-ops`).
