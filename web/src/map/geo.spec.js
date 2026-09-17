import { describe, expect, test } from 'vitest';
import { focusOffset, isWithinBounds, roundCoord } from './geo.js';

const bounds = { south: 49.88, west: 36.1, north: 50.1, east: 36.46 };

describe('geo', () => {
  test('isWithinBounds', () => {
    expect(isWithinBounds({ lat: 50.0021, lng: 36.2445 }, bounds)).toBe(true);
    expect(isWithinBounds({ lat: 50.45, lng: 30.52 }, bounds)).toBe(false);
  });

  test('roundCoord — 5 знаків після коми', () => {
    expect(roundCoord(50.002123456)).toBe(50.00212);
  });

  test('focusOffset зсуває центр так, щоб точка не ховалась під панеллю', () => {
    expect(focusOffset({ isDesktop: true, height: 900 })).toEqual([-216, 0]);
    expect(focusOffset({ isDesktop: false, height: 800 })).toEqual([0, 200]);
  });
});
