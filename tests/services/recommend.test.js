import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildMapFilters, recommend } from '../../src/services/recommend.js';
import { course, institution, seed } from '../helpers/fixtures.js';

const data = seed();
const ITSTEP = { lat: 50.0045811, lng: 36.2568894 };

describe('recommend на seed-даних', () => {
  test('повертає не більше 3 результатів з балом від 0 до 1', () => {
    const items = recommend({ age: 12, interests: [], format: [], price: 'any' }, data);
    assert.equal(items.length, 3);
    for (const item of items) {
      assert.ok(item.score >= 0 && item.score <= 1);
      assert.ok(item.course && item.institution && item.direction);
      assert.ok(Array.isArray(item.reasons) && item.reasons.length > 0);
    }
  });

  test('вік — жорстка умова', () => {
    const items = recommend({ age: 8, interests: [], format: [], price: 'any' }, data);
    assert.ok(items.length > 0);
    for (const { course: c } of items) assert.ok(c.ageMin <= 8 && c.ageMax >= 8, c.id);
  });

  test('«лише безкоштовні» — жорстка умова', () => {
    const items = recommend({ age: 15, interests: [], format: [], price: 'free' }, data);
    assert.ok(items.length > 0);
    for (const { course: c } of items) assert.equal(c.price, 0, c.id);
  });

  test('інтереси — лише збіги за напрямком або категорією, точний напрямок вище', () => {
    const items = recommend({ age: 12, interests: ['robotics'], format: [], price: 'any' }, data);
    assert.equal(items[0].course.directionId, 'robotics');
    const categories = items.map((i) => i.direction.categoryCode);
    assert.ok(categories.every((c) => c === 'T'), categories.join());
  });

  test('інтерес як код категорії', () => {
    const items = recommend({ age: 11, interests: ['A'], format: [], price: 'any' }, data);
    assert.ok(items.length > 0);
    assert.ok(items.every((i) => i.direction.categoryCode === 'A'));
  });

  test('формат — м’яка умова: відповідні формати вище', () => {
    const items = recommend({ age: 15, interests: ['T', 'E'], format: ['online'], price: 'any' }, data);
    assert.equal(items[0].course.format, 'online');
  });

  test('сценарій Олени: 11 років, конструювати, офлайн → Arduino в ХПІ першим', () => {
    const items = recommend(
      { age: 11, interests: ['robotics', '3d-modeling', 'electronics'], format: ['offline', 'hybrid'], price: 'any' },
      data,
    );
    // Точний збіг напрямку, потім збіг лише за категорією T
    assert.deepEqual(items.map((i) => i.course.id), ['khpi-robotics-arduino', 'itstep-scratch']);
  });

  test('близькість піднімає ближчий заклад і додає distanceKm', () => {
    const input = { age: 12, interests: ['T'], format: [], price: 'any' };
    // Без геолокації при рівних балах перший — курс з ранішим стартом (ХПІ)
    assert.equal(recommend(input, data)[0].institution.id, 'khpi');

    const items = recommend({ ...input, ...ITSTEP }, data);
    assert.equal(items[0].institution.id, 'itstep-kharkiv');
    assert.equal(typeof items[0].distanceKm, 'number');
    assert.ok(items[0].reasons.some((r) => r.includes('км')));
  });

  test('без координат distanceKm = null', () => {
    const [first] = recommend({ age: 12, interests: [], format: [], price: 'any' }, data);
    assert.equal(first.distanceKm, null);
  });

  test('спершу різні заклади', () => {
    const items = recommend({ age: 14, interests: [], format: [], price: 'any' }, data);
    const inst = items.map((i) => i.institution.id);
    assert.equal(new Set(inst).size, inst.length);
  });

  test('нічого не підходить → порожній масив', () => {
    assert.deepEqual(recommend({ age: 30, interests: ['astronomy'], format: [], price: 'any' }, data), []);
  });

  test('limit', () => {
    assert.equal(recommend({ age: 14, interests: [], format: [], price: 'any' }, data, { limit: 5 }).length, 5);
  });
});

describe('recommend — крайні випадки', () => {
  const base = { ...seed(), institutions: [institution({ id: 'i1' })] };

  test('курси без вільних місць не рекомендуються', () => {
    const data = { ...base, courses: [course({ seatsLeft: 0 }), course({ id: 'c2', seatsLeft: null })] };
    const items = recommend({ age: 13, interests: [], format: [], price: 'any' }, data);
    assert.deepEqual(items.map((i) => i.course.id), ['c2']);
  });

  test('курси закладів rejected/pending не рекомендуються', () => {
    const data = {
      ...base,
      institutions: [institution({ id: 'i1', status: 'rejected' }), institution({ id: 'i2', status: 'pending' })],
      courses: [course({ institutionId: 'i1' }), course({ id: 'c2', institutionId: 'i2' })],
    };
    assert.deepEqual(recommend({ age: 13, interests: [], format: [], price: 'any' }, data), []);
  });

  test('заповнює рештою курсів, якщо різних закладів менше за limit', () => {
    const data = { ...base, courses: [course({ id: 'a' }), course({ id: 'b' })] };
    const items = recommend({ age: 13, interests: [], format: [], price: 'any' }, data);
    assert.equal(items.length, 2);
  });
});

describe('buildMapFilters', () => {
  test('розкладає інтереси на напрямки та категорії', () => {
    const f = buildMapFilters(
      { age: 11, interests: ['robotics', 'A', 'unknown'], format: ['offline'], price: 'free' },
      seed().directions,
    );
    assert.deepEqual(f, {
      ageFrom: 11,
      ageTo: 11,
      direction: ['robotics'],
      category: ['A'],
      format: ['offline'],
      price: 'free',
    });
  });

  test('price any і порожні списки не потрапляють у фільтри', () => {
    assert.deepEqual(buildMapFilters({ age: 9, interests: [], format: [], price: 'any' }, seed().directions), {
      ageFrom: 9,
      ageTo: 9,
    });
  });
});
