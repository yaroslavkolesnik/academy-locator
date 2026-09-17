export const GROUP_LABELS = { direction: 'Напрямки', institution: 'Заклади', course: 'Курси' };

export function flattenSuggestions(data) {
  if (!data) return [];
  return [
    ...data.directions.map((d) => ({ kind: 'direction', id: d.slug, label: d.name, categoryCode: d.categoryCode })),
    ...data.institutions.map((i) => ({ kind: 'institution', id: i.id, label: i.shortName })),
    ...data.courses.map((c) => ({ kind: 'course', id: c.id, label: c.title, sublabel: c.institutionShortName })),
  ];
}

export function suggestionTarget(option, filters) {
  if (option.kind === 'direction') {
    const direction = filters.direction.includes(option.id) ? filters.direction : [...filters.direction, option.id];
    return { pathname: '/', filters: { ...filters, q: '', direction } };
  }
  const pathname = option.kind === 'institution' ? `/institutions/${option.id}` : `/courses/${option.id}`;
  return { pathname, filters };
}
