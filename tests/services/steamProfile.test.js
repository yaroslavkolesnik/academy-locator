import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyProfile, steamProfile, STEAM_CODES } from '../../src/services/steamProfile.js';
import { indexById } from '../../src/services/filters.js';
import { course, seed } from '../helpers/fixtures.js';

const directionsById = indexById(seed().directions);

test('STEAM_CODES у правильному порядку', () => {
  assert.deepEqual(STEAM_CODES, ['S', 'T', 'E', 'A', 'M']);
});

test('emptyProfile', () => {
  assert.deepEqual(emptyProfile(), { S: 0, T: 0, E: 0, A: 0, M: 0 });
});

test('рахує курси за категоріями напрямків', () => {
  const courses = [
    course({ directionId: 'robotics' }),
    course({ directionId: 'programming' }),
    course({ directionId: '3d-modeling' }),
  ];
  assert.deepEqual(steamProfile({ courses, directionsById }), { S: 0, T: 2, E: 1, A: 0, M: 0 });
});

test('без курсів використовує declaredDirectionIds', () => {
  const profile = steamProfile({
    courses: [],
    declaredDirectionIds: ['robotics', 'animation'],
    directionsById,
  });
  assert.deepEqual(profile, { S: 0, T: 1, E: 0, A: 1, M: 0 });
});

test('курси мають пріоритет над declaredDirectionIds', () => {
  const profile = steamProfile({
    courses: [course({ directionId: 'astronomy' })],
    declaredDirectionIds: ['robotics'],
    directionsById,
  });
  assert.deepEqual(profile, { S: 1, T: 0, E: 0, A: 0, M: 0 });
});

test('невідомі напрямки ігноруються', () => {
  const profile = steamProfile({ courses: [course({ directionId: 'nope' })], directionsById });
  assert.deepEqual(profile, emptyProfile());
});
