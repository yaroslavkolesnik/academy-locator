import { describe, expect, test } from 'vitest';
import { cycleSnap, initialSnap, nextSnap } from './sheet.js';

describe('sheet', () => {
  test('свайп угору відкриває на крок, униз — закриває', () => {
    expect(nextSnap('peek', -60)).toBe('half');
    expect(nextSnap('half', -60)).toBe('full');
    expect(nextSnap('full', -60)).toBe('full');
    expect(nextSnap('full', 60)).toBe('half');
    expect(nextSnap('peek', 60)).toBe('peek');
  });

  test('малий рух не змінює стан', () => {
    expect(nextSnap('half', 20)).toBe('half');
    expect(nextSnap('half', -39)).toBe('half');
  });

  test('натискання ручки циклічно перемикає стани', () => {
    expect(cycleSnap('peek')).toBe('half');
    expect(cycleSnap('half')).toBe('full');
    expect(cycleSnap('full')).toBe('peek');
  });

  test('на /add шторка згорнута, щоб було видно карту', () => {
    expect(initialSnap('/add')).toBe('peek');
    expect(initialSnap('/')).toBe('half');
    expect(initialSnap('/courses/x')).toBe('half');
  });
});
