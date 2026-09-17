import { describe, expect, test } from 'vitest';
import { mapFieldErrors, toRegistrationPayload, toSubmissionPayload } from './formErrors.js';

describe('mapFieldErrors', () => {
  test('поле з першого сегмента шляху; перше повідомлення перемагає', () => {
    expect(
      mapFieldErrors([
        { path: 'name', message: 'Імʼя: мінімум 2 символи' },
        { path: 'name', message: 'друге' },
        { path: 'declaredDirectionIds.0', message: 'Invalid enum value' },
        { path: '', message: 'Загальна помилка' },
      ]),
    ).toEqual({ name: 'Імʼя: мінімум 2 символи', declaredDirectionIds: 'Invalid enum value', _form: 'Загальна помилка' });
    expect(mapFieldErrors(undefined)).toEqual({});
  });
});

describe('toRegistrationPayload', () => {
  test('обрізає пробіли, пропускає порожні необовʼязкові поля, вік — число', () => {
    expect(
      toRegistrationPayload({ name: ' Олена ', contact: ' +380501234567 ', participantAge: '11', comment: '  ', consent: true }),
    ).toEqual({
      name: 'Олена',
      contact: '+380501234567',
      participantAge: 11,
      consent: true,
    });
    expect(toRegistrationPayload({ name: 'А', contact: '', participantAge: '', comment: 'Після 16:00', consent: false })).toEqual({
      name: 'А',
      contact: '',
      comment: 'Після 16:00',
      consent: false,
    });
  });
});

describe('toSubmissionPayload', () => {
  const values = {
    name: ' Школа «Кібер» ',
    type: 'private_school',
    address: ' вул. Пушкінська, 50 ',
    shortDescription: '',
    website: ' https://kiber.example ',
    phone: '+380501112233',
    email: '',
    contactPerson: 'Ірина',
    hasShelter: 'yes',
    declaredDirectionIds: ['robotics'],
  };

  test('обрізає, пропускає порожні, додає координати', () => {
    expect(toSubmissionPayload(values, { lat: 50.0021, lng: 36.2445 })).toEqual({
      name: 'Школа «Кібер»',
      type: 'private_school',
      address: 'вул. Пушкінська, 50',
      lat: 50.0021,
      lng: 36.2445,
      shortDescription: undefined,
      website: 'https://kiber.example',
      phone: '+380501112233',
      email: undefined,
      contactPerson: 'Ірина',
      hasShelter: true,
      declaredDirectionIds: ['robotics'],
    });
  });

  test('укриття: ні / не вказано', () => {
    expect(toSubmissionPayload({ ...values, hasShelter: 'no' }, null).hasShelter).toBe(false);
    expect(toSubmissionPayload({ ...values, hasShelter: '' }, null).hasShelter).toBeNull();
  });
});
