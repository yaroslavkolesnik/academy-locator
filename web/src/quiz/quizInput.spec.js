import { describe, expect, test } from 'vitest';
import { buildMetaIndex } from '../state/MetaProvider.jsx';
import { metaFixture, quizFixture, recommendationsFixture } from '../testing/fixtures.jsx';
import { buildRecommendationInput, isAnswered, isSelected, resultMapFilters, toggleAnswer } from './quizInput.js';

const [age, interests, , , distance] = quizFixture.questions;

describe('відповіді квізу', () => {
  test('single замінює, multi перемикає', () => {
    let answers = toggleAnswer(age, {}, 'age-6-9');
    answers = toggleAnswer(age, answers, 'age-10-13');
    expect(answers.age).toBe('age-10-13');
    answers = toggleAnswer(interests, answers, 'build');
    answers = toggleAnswer(interests, answers, 'code');
    answers = toggleAnswer(interests, answers, 'build');
    expect(answers.interests).toEqual(['code']);
    expect(isSelected(interests, answers, 'code')).toBe(true);
    expect(isSelected(age, answers, 'age-6-9')).toBe(false);
  });

  test('isAnswered: обовʼязкові потребують відповіді, необовʼязкові — ні', () => {
    expect(isAnswered(age, {})).toBe(false);
    expect(isAnswered(interests, { interests: [] })).toBe(false);
    expect(isAnswered(interests, { interests: ['draw'] })).toBe(true);
    expect(isAnswered(distance, {})).toBe(true);
  });
});

describe('buildRecommendationInput', () => {
  const answers = {
    age: 'age-10-13',
    interests: ['build', 'code'],
    format: 'format-offline',
    price: 'price-any',
    distance: 'distance-near',
  };

  test('збирає тіло POST /api/recommendations', () => {
    expect(buildRecommendationInput(quizFixture, answers, { lat: 50, lng: 36.2 })).toEqual({
      wantsLocation: true,
      input: {
        age: 11,
        interests: ['robotics', '3d-modeling', 'electronics', 'programming', 'game-dev'],
        format: ['offline', 'hybrid'],
        price: 'any',
        lat: 50,
        lng: 36.2,
      },
    });
  });

  test('без координат або без бажання шукати поруч — без lat/lng', () => {
    expect(buildRecommendationInput(quizFixture, answers, null).input).not.toHaveProperty('lat');
    const noNear = buildRecommendationInput(quizFixture, { ...answers, distance: 'distance-any' }, { lat: 50, lng: 36 });
    expect(noNear.wantsLocation).toBe(false);
    expect(noNear.input).not.toHaveProperty('lat');
  });
});

describe('resultMapFilters', () => {
  const meta = buildMetaIndex(metaFixture);

  test('додає напрямки всіх рекомендованих курсів, щоб кожен був на карті', () => {
    expect(resultMapFilters(recommendationsFixture, meta, null)).toEqual({
      q: '',
      category: [],
      direction: ['robotics', '3d-modeling', 'electronics', 'game-dev'],
      age: '10-13',
      price: '',
      format: ['offline', 'hybrid'],
      type: [],
      near: false,
    });
  });

  test('координати вмикають near; без рекомендацій напрямки лишаються з відповіді', () => {
    const filters = resultMapFilters({ filters: { ageFrom: 25, ageTo: 25, category: ['A'] }, items: [] }, meta, { lat: 50, lng: 36 });
    expect(filters).toMatchObject({ age: '18+', category: ['A'], direction: [], near: true });
  });
});
