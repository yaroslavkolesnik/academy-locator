import { loadSeedData } from '../../src/store/seedData.js';

// Свіжа копія seed-даних для кожного тесту
export function seed() {
  return loadSeedData();
}

export function course(overrides = {}) {
  return {
    id: 'c1',
    institutionId: 'i1',
    directionId: 'robotics',
    title: 'Робототехніка на Arduino',
    shortDescription: 'Роботи',
    ageMin: 12,
    ageMax: 16,
    format: 'offline',
    price: 1200,
    priceUnit: 'month',
    startDate: '2026-10-03',
    seatsTotal: 10,
    seatsLeft: 3,
    ...overrides,
  };
}

export function institution(overrides = {}) {
  return {
    id: 'i1',
    name: 'Тестовий університет',
    shortName: 'ТУ',
    type: 'university',
    lat: 50.0,
    lng: 36.23,
    status: 'approved',
    declaredDirectionIds: [],
    ...overrides,
  };
}
