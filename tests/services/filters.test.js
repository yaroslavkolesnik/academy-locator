import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyFilters,
  courseMatches,
  hasCourseFilters,
  indexById,
  isPubliclyVisible,
  normalizeText,
} from '../../src/services/filters.js';
import { course, institution, seed } from '../helpers/fixtures.js';

const { directions } = seed();
const ctx = {
  directionsById: indexById(directions),
  institutionsById: indexById([institution()]),
};

describe('normalizeText', () => {
  test('нижній регістр, апострофи та пробіли', () => {
    assert.equal(normalizeText('  Комп’ютерна   АКАДЕМІЯ '), "комп'ютерна академія");
    assert.equal(normalizeText('Комп`ютерна'), normalizeText("Комп'ютерна"));
  });
});

describe('hasCourseFilters', () => {
  test('порожні фільтри', () => {
    assert.equal(hasCourseFilters({}), false);
    assert.equal(hasCourseFilters({ category: [], format: [], q: '  ' }), false);
  });
  test('тип закладу та координати не є фільтрами курсів', () => {
    assert.equal(hasCourseFilters({ type: ['university'], lat: 50, lng: 36 }), false);
  });
  test('будь-який фільтр курсу', () => {
    assert.equal(hasCourseFilters({ price: 'free' }), true);
    assert.equal(hasCourseFilters({ ageFrom: 10 }), true);
    assert.equal(hasCourseFilters({ direction: ['robotics'] }), true);
  });
});

describe('courseMatches', () => {
  test('без фільтрів — збіг', () => {
    assert.equal(courseMatches(course(), {}, ctx), true);
  });

  describe('вік — перетин діапазонів', () => {
    const c = course({ ageMin: 12, ageMax: 16 });
    const cases = [
      [{ ageFrom: 10, ageTo: 13 }, true],
      [{ ageFrom: 16, ageTo: 17 }, true],
      [{ ageFrom: 6, ageTo: 9 }, false],
      [{ ageFrom: 17, ageTo: 20 }, false],
      [{ ageFrom: 14 }, true],
      [{ ageTo: 11 }, false],
      [{ ageFrom: 13, ageTo: 13 }, true],
    ];
    for (const [f, expected] of cases) {
      test(`${JSON.stringify(f)} → ${expected}`, () => {
        assert.equal(courseMatches(c, f, ctx), expected);
      });
    }
  });

  test('category — АБО через напрямок курсу', () => {
    assert.equal(courseMatches(course(), { category: ['S', 'T'] }, ctx), true);
    assert.equal(courseMatches(course(), { category: ['A'] }, ctx), false);
  });

  test('direction — АБО', () => {
    assert.equal(courseMatches(course(), { direction: ['3d-modeling', 'robotics'] }, ctx), true);
    assert.equal(courseMatches(course(), { direction: ['animation'] }, ctx), false);
  });

  test('price free/paid', () => {
    assert.equal(courseMatches(course({ price: 0 }), { price: 'free' }, ctx), true);
    assert.equal(courseMatches(course({ price: 0 }), { price: 'paid' }, ctx), false);
    assert.equal(courseMatches(course({ price: 500 }), { price: 'paid' }, ctx), true);
    assert.equal(courseMatches(course({ price: 500 }), { price: 'free' }, ctx), false);
  });

  test('format — АБО', () => {
    assert.equal(courseMatches(course({ format: 'hybrid' }), { format: ['offline', 'hybrid'] }, ctx), true);
    assert.equal(courseMatches(course({ format: 'online' }), { format: ['offline'] }, ctx), false);
  });

  describe('q — пошук', () => {
    test('за частиною назви курсу без регістру', () => {
      assert.equal(courseMatches(course(), { q: 'ARDU' }, ctx), true);
    });
    test('за назвою напрямку', () => {
      assert.equal(courseMatches(course({ title: 'Гурток' }), { q: 'робото' }, ctx), true);
    });
    test('за ключовим словом напрямку', () => {
      assert.equal(courseMatches(course({ title: 'Гурток' }), { q: 'lego' }, ctx), true);
    });
    test('за назвою закладу', () => {
      assert.equal(courseMatches(course(), { q: 'тестовий' }, ctx), true);
    });
    test('усі слова запиту мають знайтися', () => {
      assert.equal(courseMatches(course(), { q: 'arduino тестовий' }, ctx), true);
      assert.equal(courseMatches(course(), { q: 'arduino астрономія' }, ctx), false);
    });
  });

  test('фільтри комбінуються через І', () => {
    const c = course({ price: 0, format: 'offline' });
    assert.equal(courseMatches(c, { price: 'free', format: ['offline'], category: ['T'] }, ctx), true);
    assert.equal(courseMatches(c, { price: 'free', format: ['online'], category: ['T'] }, ctx), false);
  });
});

describe('isPubliclyVisible', () => {
  test('approved і pending видно, rejected — ні', () => {
    assert.equal(isPubliclyVisible({ status: 'approved' }), true);
    assert.equal(isPubliclyVisible({ status: 'pending' }), true);
    assert.equal(isPubliclyVisible({ status: 'rejected' }), false);
  });
});

describe('applyFilters на seed-даних Харкова', () => {
  const data = seed();
  const ids = (entries) => entries.map((e) => e.institution.id).sort();

  test('без фільтрів — усі 4 заклади з усіма курсами', () => {
    const res = applyFilters(data, {});
    assert.equal(res.length, 4);
    assert.equal(res.reduce((n, e) => n + e.matchedCourses.length, 0), 13);
  });

  test('без фільтрів показує pending заклад без курсів, але не rejected', () => {
    const extra = [
      institution({ id: 'p1', status: 'pending' }),
      institution({ id: 'r1', status: 'rejected' }),
    ];
    const res = applyFilters({ ...data, institutions: [...data.institutions, ...extra] }, {});
    assert.ok(ids(res).includes('p1'));
    assert.ok(!ids(res).includes('r1'));
  });

  test('з фільтром курсу заклад без збігів зникає', () => {
    const res = applyFilters(
      { ...data, institutions: [...data.institutions, institution({ id: 'p1', status: 'pending' })] },
      { direction: ['robotics'] },
    );
    assert.deepEqual(ids(res), ['kh-palace', 'khpi']);
  });

  test('робототехніка для 10–13 років', () => {
    const res = applyFilters(data, { direction: ['robotics'], ageFrom: 10, ageTo: 13 });
    assert.deepEqual(ids(res), ['kh-palace', 'khpi']);
  });

  test('безкоштовні онлайн-курси', () => {
    const res = applyFilters(data, { price: 'free', format: ['online'] });
    assert.deepEqual(ids(res), ['khpi']);
    assert.deepEqual(res[0].matchedCourses.map((c) => c.id), ['khpi-python-highschool']);
    assert.equal(res[0].courses.length, 4);
  });

  test('тип закладу', () => {
    assert.deepEqual(ids(applyFilters(data, { type: ['university'] })), ['hnpu', 'khpi']);
  });

  test('пошук за синонімом «scratch»', () => {
    assert.deepEqual(ids(applyFilters(data, { q: 'scratch' })), ['itstep-kharkiv']);
  });

  test('нічого не знайдено', () => {
    assert.deepEqual(applyFilters(data, { category: ['A'], ageFrom: 18 }), []);
  });
});
