import { randomUUID } from 'node:crypto';

// Єдине місце, де формуються нові документи — обидва сховища зберігають однакову форму.
// Вхідні дані вже провалідовані (Фаза 3); службові поля завжди задаємо тут.

export function buildInstitutionDoc(input, { cityId, now = new Date() }) {
  return {
    id: randomUUID(),
    name: input.name,
    shortName: input.shortName ?? input.name,
    type: input.type,
    shortDescription: input.shortDescription ?? null,
    description: null,
    logoUrl: null,
    address: input.address,
    city: cityId,
    lat: input.lat,
    lng: input.lng,
    website: input.website ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    contactPerson: input.contactPerson ?? null,
    hasShelter: input.hasShelter ?? null,
    declaredDirectionIds: input.declaredDirectionIds ?? [],
    status: 'pending',
    source: 'submission',
    createdAt: now.toISOString(),
  };
}

export function buildRegistrationDoc(input, course, { now = new Date() } = {}) {
  return {
    id: randomUUID(),
    courseId: course.id,
    institutionId: course.institutionId,
    name: input.name,
    contact: input.contact,
    participantAge: input.participantAge ?? null,
    comment: input.comment || null,
    consent: input.consent === true,
    createdAt: now.toISOString(),
  };
}

export function byCreatedAtDesc(a, b) {
  return b.createdAt.localeCompare(a.createdAt);
}
