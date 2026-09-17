import { describe, expect, test } from 'vitest';
import { escapeHtml, initials, NEUTRAL_COLOR, ringGeometry, ringSegments, ringSvg } from './steamRing.js';

const colors = { S: '#16A34A', T: '#2563EB', E: '#EA580C', A: '#DB2777', M: '#7C3AED' };

describe('ringSegments', () => {
  test('сегменти в порядку S T E A M, пропорційні кількості курсів', () => {
    const segments = ringSegments({ S: 0, T: 2, E: 2, A: 0, M: 0 }, colors, 100, 2);
    expect(segments.map((s) => s.code)).toEqual(['T', 'E']);
    expect(segments[0]).toEqual({ code: 'T', color: '#2563EB', length: 48, offset: 0 });
    expect(segments[1]).toEqual({ code: 'E', color: '#EA580C', length: 48, offset: 50 });
  });

  test('одна категорія — суцільне кільце без проміжку', () => {
    expect(ringSegments({ S: 3, T: 0, E: 0, A: 0, M: 0 }, colors, 100)).toEqual([
      { code: 'S', color: '#16A34A', length: 100, offset: 0 },
    ]);
  });

  test('порожній профіль — нейтральне кільце', () => {
    expect(ringSegments({ S: 0, T: 0, E: 0, A: 0, M: 0 }, colors, 100)).toEqual([
      { code: null, color: NEUTRAL_COLOR, length: 100, offset: 0 },
    ]);
    expect(ringSegments(undefined, colors, 100)).toHaveLength(1);
  });
});

describe('ringGeometry', () => {
  test('радіус вписаний у розмір з урахуванням товщини', () => {
    const { radius, center, circumference } = ringGeometry(46, 6);
    expect(center).toBe(23);
    expect(radius).toBe(19);
    expect(circumference).toBeCloseTo(2 * Math.PI * 19);
  });
});

describe('ringSvg', () => {
  test('екранує підпис (назва з публічної заявки)', () => {
    const svg = ringSvg({ profile: {}, colorByCode: colors, size: 46, stroke: 6, label: '<img onerror=x>' });
    expect(svg).not.toContain('<img');
    expect(svg).toContain('&lt;img onerror=x&gt;');
  });

  test('pending — пунктирне нейтральне кільце', () => {
    const svg = ringSvg({ profile: { T: 1 }, colorByCode: colors, size: 46, stroke: 6, dashed: true, label: 'Ш' });
    expect(svg).toContain('stroke-dasharray="4 3"');
    expect(svg).toContain(NEUTRAL_COLOR);
    expect(svg).not.toContain('#2563EB');
  });
});

describe('escapeHtml / initials', () => {
  test('escapeHtml', () => {
    expect(escapeHtml(`"<a href='x'>&</a>"`)).toBe('&quot;&lt;a href=&#39;x&#39;&gt;&amp;&lt;/a&gt;&quot;');
  });

  test.each([
    ['НТУ «ХПІ»', 'НТУ'],
    ['ХНПУ ім. Г. С. Сковороди', 'ХНПУ'],
    ['ITSTEP Академія', 'IT'],
    ['Палац дитячої та юнацької творчості', 'ПД'],
    ['Школа', 'Ш'],
    ['', '?'],
  ])('initials(%s) = %s', (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});
