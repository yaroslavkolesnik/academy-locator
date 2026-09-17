const MONTHS_GENITIVE = [
  'січня',
  'лютого',
  'березня',
  'квітня',
  'травня',
  'червня',
  'липня',
  'серпня',
  'вересня',
  'жовтня',
  'листопада',
  'грудня',
];

export const FORMS = {
  institution: ['заклад', 'заклади', 'закладів'],
  course: ['курс', 'курси', 'курсів'],
  seat: ['місце', 'місця', 'місць'],
};

export function pluralForm(n, [one, few, many]) {
  const mod100 = Math.abs(n) % 100;
  const mod10 = mod100 % 10;
  if (mod100 > 10 && mod100 < 20) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

export function pluralize(n, forms) {
  return `${n} ${pluralForm(n, forms)}`;
}

export function formatPrice(price, priceUnit) {
  if (price === 0) return 'Безкоштовно';
  const amount = new Intl.NumberFormat('uk-UA').format(price);
  return priceUnit === 'month' ? `${amount} грн/міс` : `${amount} грн за курс`;
}

export function formatAge(ageMin, ageMax) {
  return ageMax >= 99 ? `${ageMin}+ років` : `${ageMin}–${ageMax} років`;
}

export function formatDate(isoDate) {
  const [, month, day] = isoDate.split('-').map(Number);
  return `${day} ${MONTHS_GENITIVE[month - 1]}`;
}

export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} м`;
  return `${km.toFixed(1).replace('.', ',')} км`;
}

export function seatsLabel(seatsLeft) {
  if (seatsLeft === null || seatsLeft === undefined) return null;
  if (seatsLeft === 0) return 'Місць немає';
  return `Лишилось ${pluralize(seatsLeft, FORMS.seat)}`;
}

export function formatDateTime(iso) {
  return new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Kyiv',
  }).format(new Date(iso));
}

export function displayHost(url) {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function contactHref(contact) {
  return contact.includes('@') ? `mailto:${contact}` : `tel:${contact.replace(/[^\d+]/g, '')}`;
}
