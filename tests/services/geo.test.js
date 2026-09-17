import { test } from 'node:test';
import assert from 'node:assert/strict';
import { haversineKm, isWithinBounds } from '../../src/services/geo.js';

test('haversineKm: 0 для однакових точок', () => {
  assert.equal(haversineKm({ lat: 50, lng: 36 }, { lat: 50, lng: 36 }), 0);
});

test('haversineKm: ХНПУ → ITSTEP приблизно 1 км', () => {
  const d = haversineKm({ lat: 50.0050526, lng: 36.2422603 }, { lat: 50.0045811, lng: 36.2568894 });
  assert.ok(d > 0.9 && d < 1.2, `got ${d}`);
});

test('haversineKm: 1° широти ≈ 111 км', () => {
  const d = haversineKm({ lat: 49, lng: 36 }, { lat: 50, lng: 36 });
  assert.ok(Math.abs(d - 111.2) < 0.5, `got ${d}`);
});

test('isWithinBounds', () => {
  const bounds = { south: 49.88, west: 36.1, north: 50.1, east: 36.46 };
  assert.equal(isWithinBounds({ lat: 50.0, lng: 36.23 }, bounds), true);
  assert.equal(isWithinBounds({ lat: 50.45, lng: 30.52 }, bounds), false);
});
