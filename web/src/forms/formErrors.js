// details з VALIDATION_ERROR → помилки під полями форми
export function mapFieldErrors(details) {
  const errors = {};
  for (const { path, message } of details ?? []) {
    const field = String(path ?? '').split('.')[0] || '_form';
    if (!errors[field]) errors[field] = message;
  }
  return errors;
}

export function toRegistrationPayload(values) {
  const payload = {
    name: values.name.trim(),
    contact: values.contact.trim(),
    consent: values.consent === true,
  };
  const age = String(values.participantAge ?? '').trim();
  if (age !== '') payload.participantAge = Number(age);
  const comment = (values.comment ?? '').trim();
  if (comment) payload.comment = comment;
  return payload;
}

const optionalText = (value) => {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? undefined : trimmed;
};

const SHELTER_VALUES = { yes: true, no: false };

export function toSubmissionPayload(values, point) {
  return {
    name: values.name.trim(),
    type: values.type,
    address: values.address.trim(),
    lat: point?.lat,
    lng: point?.lng,
    shortDescription: optionalText(values.shortDescription),
    website: optionalText(values.website),
    phone: optionalText(values.phone),
    email: optionalText(values.email),
    contactPerson: optionalText(values.contactPerson),
    hasShelter: SHELTER_VALUES[values.hasShelter] ?? null,
    declaredDirectionIds: values.declaredDirectionIds,
  };
}
