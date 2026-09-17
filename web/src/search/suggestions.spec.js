import { describe, expect, test } from 'vitest';
import { EMPTY_FILTERS } from '../state/filters.js';
import { flattenSuggestions, suggestionTarget } from './suggestions.js';

const data = {
  directions: [{ slug: 'robotics', name: 'Робототехніка', categoryCode: 'T' }],
  institutions: [{ id: 'khpi', shortName: 'НТУ «ХПІ»', type: 'university' }],
  courses: [
    {
      id: 'khpi-robotics-arduino',
      title: 'Робототехніка на Arduino',
      institutionId: 'khpi',
      institutionShortName: 'НТУ «ХПІ»',
      directionSlug: 'robotics',
    },
  ],
};

describe('suggestions', () => {
  test('плаский список у порядку груп', () => {
    expect(flattenSuggestions(data)).toEqual([
      { kind: 'direction', id: 'robotics', label: 'Робототехніка', categoryCode: 'T' },
      { kind: 'institution', id: 'khpi', label: 'НТУ «ХПІ»' },
      { kind: 'course', id: 'khpi-robotics-arduino', label: 'Робототехніка на Arduino', sublabel: 'НТУ «ХПІ»' },
    ]);
    expect(flattenSuggestions(null)).toEqual([]);
  });

  test('напрямок → фільтр на головній, текст пошуку очищується', () => {
    const filters = { ...EMPTY_FILTERS, q: 'роб', age: '10-13', direction: ['astronomy'] };
    expect(suggestionTarget({ kind: 'direction', id: 'robotics' }, filters)).toEqual({
      pathname: '/',
      filters: { ...filters, q: '', direction: ['astronomy', 'robotics'] },
    });
  });

  test('заклад і курс → відповідна сторінка без зміни фільтрів', () => {
    expect(suggestionTarget({ kind: 'institution', id: 'khpi' }, EMPTY_FILTERS)).toEqual({
      pathname: '/institutions/khpi',
      filters: EMPTY_FILTERS,
    });
    expect(suggestionTarget({ kind: 'course', id: 'c1' }, EMPTY_FILTERS).pathname).toBe('/courses/c1');
  });
});
