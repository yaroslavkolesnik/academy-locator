import { describe, expect, test } from 'vitest';
import {
  contactHref,
  FORMS,
  displayHost,
  formatAge,
  formatDate,
  formatDateTime,
  formatDistance,
  formatPrice,
  pluralize,
  seatsLabel,
} from './format.js';

describe('pluralize (українські форми)', () => {
  test.each([
    [1, '1 курс'],
    [2, '2 курси'],
    [4, '4 курси'],
    [5, '5 курсів'],
    [11, '11 курсів'],
    [12, '12 курсів'],
    [21, '21 курс'],
    [22, '22 курси'],
    [0, '0 курсів'],
  ])('%i', (n, expected) => {
    expect(pluralize(n, FORMS.course)).toBe(expected);
  });

  test('заклади та місця', () => {
    expect(pluralize(3, FORMS.institution)).toBe('3 заклади');
    expect(pluralize(1, FORMS.seat)).toBe('1 місце');
  });
});

describe('форматери курсу', () => {
  test('ціна', () => {
    expect(formatPrice(0, 'course')).toBe('Безкоштовно');
    expect(formatPrice(1200, 'month')).toMatch(/^1\s200 грн\/міс$/);
    expect(formatPrice(900, 'course')).toBe('900 грн за курс');
  });

  test('вік', () => {
    expect(formatAge(11, 16)).toBe('11–16 років');
    expect(formatAge(18, 99)).toBe('18+ років');
  });

  test('дата старту', () => {
    expect(formatDate('2026-10-03')).toBe('3 жовтня');
    expect(formatDate('2026-12-15')).toBe('15 грудня');
  });

  test('відстань', () => {
    expect(formatDistance(0)).toBe('0 м');
    expect(formatDistance(0.4)).toBe('400 м');
    expect(formatDistance(1.8)).toBe('1,8 км');
  });

  test('місця', () => {
    expect(seatsLabel(null)).toBeNull();
    expect(seatsLabel(0)).toBe('Місць немає');
    expect(seatsLabel(1)).toBe('Лишилось 1 місце');
    expect(seatsLabel(3)).toBe('Лишилось 3 місця');
    expect(seatsLabel(5)).toBe('Лишилось 5 місць');
  });

  test('дата й час реєстрації (Київ)', () => {
    expect(formatDateTime('2026-09-17T11:05:00.000Z')).toMatch(/17 вересня.*14:05/);
  });
});

describe('displayHost', () => {
  test('домен без www і протоколу', () => {
    expect(displayHost('https://www.kpi.kharkov.ua')).toBe('kpi.kharkov.ua');
    expect(displayHost('https://itstep.kh.ua/contacts')).toBe('itstep.kh.ua');
    expect(displayHost('not a url')).toBe('not a url');
  });
});

describe('contactHref', () => {
  test('email → mailto, телефон → tel без пробілів', () => {
    expect(contactHref('olena@example.com')).toBe('mailto:olena@example.com');
    expect(contactHref('+380 50 123-45-67')).toBe('tel:+380501234567');
  });
});
