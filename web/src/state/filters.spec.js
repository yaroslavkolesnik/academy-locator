import { describe, expect, test } from 'vitest';
import { metaFixture } from '../testing/fixtures.jsx';
import {
  applyFiltersToSearch,
  countActive,
  EMPTY_FILTERS,
  filtersToSearchString,
  fromApiFilters,
  hasCourseFilters,
  parseFilters,
  toApiQuery,
  toggleValue,
} from './filters.js';
import { buildMetaIndex } from './MetaProvider.jsx';

const meta = buildMetaIndex(metaFixture);

describe('parseFilters', () => {
  test('читає всі фільтри з URL', () => {
    const params = new URLSearchParams(
      'q=arduino&category=t,E,T&direction=robotics&age=10-13&price=free&format=offline,hybrid&type=university&near=1',
    );
    expect(parseFilters(params)).toEqual({
      q: 'arduino',
      category: ['T', 'E'],
      direction: ['robotics'],
      age: '10-13',
      price: 'free',
      format: ['offline', 'hybrid'],
      type: ['university'],
      near: true,
    });
  });

  test('порожній URL і некоректна ціна', () => {
    expect(parseFilters(new URLSearchParams(''))).toEqual(EMPTY_FILTERS);
    expect(parseFilters(new URLSearchParams('price=cheap')).price).toBe('');
  });
});

describe('applyFiltersToSearch', () => {
  test('записує лише непорожні фільтри й зберігає інші параметри', () => {
    const next = applyFiltersToSearch(new URLSearchParams('utm=demo&q=old&near=1'), {
      ...EMPTY_FILTERS,
      category: ['T', 'E'],
      price: 'paid',
    });
    expect(next.get('utm')).toBe('demo');
    expect(next.get('q')).toBeNull();
    expect(next.get('near')).toBeNull();
    expect(next.get('category')).toBe('T,E');
    expect(next.get('price')).toBe('paid');
  });

  test('parse(apply(x)) === x', () => {
    const filters = {
      ...EMPTY_FILTERS,
      q: '3d друк',
      direction: ['robotics', '3d-modeling'],
      age: '18+',
      format: ['online'],
      near: true,
    };
    expect(parseFilters(applyFiltersToSearch(new URLSearchParams(), filters))).toEqual(filters);
  });

  test('filtersToSearchString', () => {
    expect(filtersToSearchString(EMPTY_FILTERS)).toBe('');
    expect(filtersToSearchString({ ...EMPTY_FILTERS, age: '6-9' })).toBe('?age=6-9');
  });
});

describe('toApiQuery', () => {
  test('вікова група → ageFrom/ageTo, списки через кому, координати', () => {
    const filters = { ...EMPTY_FILTERS, category: ['T'], direction: ['robotics'], age: '10-13', near: true };
    expect(toApiQuery(filters, meta, { lat: 50, lng: 36.2 })).toEqual({
      q: undefined,
      category: 'T',
      direction: 'robotics',
      ageFrom: 10,
      ageTo: 13,
      price: undefined,
      format: undefined,
      type: undefined,
      lat: 50,
      lng: 36.2,
    });
  });

  test('невідомі напрямок і вікова група відкидаються', () => {
    const query = toApiQuery({ ...EMPTY_FILTERS, direction: ['cooking'], age: '99' }, meta, null);
    expect(query.direction).toBeUndefined();
    expect(query.ageFrom).toBeUndefined();
    expect(query.lat).toBeUndefined();
  });
});

describe('лічильники та перемикачі', () => {
  test('countActive не враховує near; hasCourseFilters не враховує type', () => {
    expect(countActive({ ...EMPTY_FILTERS, near: true })).toBe(0);
    expect(countActive({ ...EMPTY_FILTERS, q: 'x', category: ['T', 'E'], age: '6-9', type: ['center'] })).toBe(5);
    expect(hasCourseFilters({ ...EMPTY_FILTERS, type: ['center'] })).toBe(false);
    expect(hasCourseFilters({ ...EMPTY_FILTERS, price: 'free' })).toBe(true);
  });

  test('toggleValue', () => {
    expect(toggleValue(['T'], 'E')).toEqual(['T', 'E']);
    expect(toggleValue(['T', 'E'], 'T')).toEqual(['E']);
  });
});

describe('fromApiFilters', () => {
  test('вік з рекомендацій → вікова група, решта як є', () => {
    expect(
      fromApiFilters({ ageFrom: 11, ageTo: 11, direction: ['robotics'], format: ['offline', 'hybrid'] }, meta),
    ).toEqual({
      ...EMPTY_FILTERS,
      age: '10-13',
      direction: ['robotics'],
      format: ['offline', 'hybrid'],
    });
    expect(fromApiFilters({ ageFrom: 25, ageTo: 25, category: ['M'], price: 'free' }, meta)).toMatchObject({
      age: '18+',
      category: ['M'],
      price: 'free',
    });
  });
});
