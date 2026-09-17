export const LIST_KEYS = ['category', 'direction', 'format', 'type'];
export const FILTER_KEYS = ['q', ...LIST_KEYS, 'age', 'price', 'near'];

export const EMPTY_FILTERS = Object.freeze({
  q: '',
  category: [],
  direction: [],
  age: '',
  price: '',
  format: [],
  type: [],
  near: false,
});

const splitList = (value) => [
  ...new Set(
    (value ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  ),
];

export function parseFilters(searchParams) {
  const get = (key) => searchParams.get(key) ?? '';
  const price = get('price');
  return {
    q: get('q').trim(),
    category: [...new Set(splitList(get('category')).map((code) => code.toUpperCase()))],
    direction: splitList(get('direction')),
    age: get('age'),
    price: price === 'free' || price === 'paid' ? price : '',
    format: splitList(get('format')),
    type: splitList(get('type')),
    near: get('near') === '1',
  };
}

export function applyFiltersToSearch(searchParams, filters) {
  const next = new URLSearchParams(searchParams);
  for (const key of FILTER_KEYS) next.delete(key);
  if (filters.q) next.set('q', filters.q);
  for (const key of LIST_KEYS) {
    if (filters[key]?.length) next.set(key, filters[key].join(','));
  }
  if (filters.age) next.set('age', filters.age);
  if (filters.price) next.set('price', filters.price);
  if (filters.near) next.set('near', '1');
  return next;
}

export function filtersToSearchString(filters) {
  const search = applyFiltersToSearch(new URLSearchParams(), filters).toString();
  return search ? `?${search}` : '';
}

// Параметри для GET /api/institutions (та картки/курсів напрямку). Невідомі значення з URL відкидаються,
// щоб підроблене посилання не давало 400 від API.
export function toApiQuery(filters, meta, coords) {
  const group = meta.ageGroups.find((g) => g.id === filters.age);
  const directions = filters.direction.filter((slug) => meta.directionBySlug[slug]);
  const categories = filters.category.filter((code) => meta.categoryByCode[code]);
  const join = (list) => (list.length ? list.join(',') : undefined);
  return {
    q: filters.q || undefined,
    category: join(categories),
    direction: join(directions),
    ageFrom: group?.ageFrom,
    ageTo: group?.ageTo,
    price: filters.price || undefined,
    format: join(filters.format),
    type: join(filters.type),
    lat: coords?.lat,
    lng: coords?.lng,
  };
}

export function countActive(filters) {
  return (
    (filters.q ? 1 : 0) +
    filters.category.length +
    filters.direction.length +
    (filters.age ? 1 : 0) +
    (filters.price ? 1 : 0) +
    filters.format.length +
    filters.type.length
  );
}

export function hasCourseFilters(filters) {
  return countActive(filters) - filters.type.length > 0;
}

export function toggleValue(list, value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function fromApiFilters(apiFilters, meta) {
  const age = apiFilters.ageFrom;
  const group = age == null ? undefined : meta.ageGroups.find((g) => age >= g.ageFrom && age <= g.ageTo);
  return {
    ...EMPTY_FILTERS,
    category: apiFilters.category ?? [],
    direction: apiFilters.direction ?? [],
    age: group?.id ?? '',
    price: apiFilters.price ?? '',
    format: apiFilters.format ?? [],
  };
}
