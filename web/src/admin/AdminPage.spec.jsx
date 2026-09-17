import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import { mockFetch, renderWithProviders } from '../testing/fixtures.jsx';
import { AdminPage } from './AdminPage.jsx';

const TOKEN = 'smoke-token';
const submission = {
  id: 'p1',
  name: 'Школа робототехніки «Кібер»',
  shortName: 'Школа робототехніки «Кібер»',
  type: 'private_school',
  shortDescription: 'Робототехніка для дітей 7–14 років.',
  address: 'вул. Пушкінська, 50, Харків',
  website: null,
  phone: '+380501112233',
  email: null,
  contactPerson: 'Ірина',
  hasShelter: true,
  declaredDirectionIds: ['robotics'],
  status: 'pending',
  createdAt: '2026-09-17T11:05:00.000Z',
};
const registration = {
  id: 'r1',
  courseId: 'khpi-robotics-arduino',
  institutionId: 'khpi',
  name: 'Олена',
  contact: '+380501234567',
  participantAge: 11,
  comment: null,
  consent: true,
  createdAt: '2026-09-17T12:00:00.000Z',
  courseTitle: 'Робототехніка на Arduino',
  institutionShortName: 'НТУ «ХПІ»',
};

const unauthorized = () => ({
  status: 401,
  body: { error: { code: 'UNAUTHORIZED', message: 'Потрібен коректний X-Admin-Token' } },
});

function adminApi({ pendingItems = [submission] } = {}) {
  let items = pendingItems;
  const guard = (init, respond) => (init.headers?.['X-Admin-Token'] === TOKEN ? respond() : unauthorized());
  return mockFetch({
    '/api/admin/submissions': (url, init) => guard(init, () => ({ body: { items } })),
    '/api/admin/registrations': (url, init) => guard(init, () => ({ body: { items: [registration] } })),
    '/api/admin/institutions/': (url, init) =>
      guard(init, () => {
        items = [];
        return { body: { institution: { ...submission, status: JSON.parse(init.body).status } } };
      }),
  });
}

const login = async (token = TOKEN) => {
  await userEvent.type(screen.getByLabelText(/Адмін-токен/), token);
  await userEvent.click(screen.getByRole('button', { name: 'Увійти' }));
};

beforeEach(() => sessionStorage.clear());

describe('AdminPage', () => {
  test('неправильний токен', async () => {
    adminApi();
    renderWithProviders(<AdminPage />, { route: '/admin' });
    await login('wrong');
    expect(await screen.findByText('Невірний токен.')).toBeInTheDocument();
    expect(sessionStorage.getItem('academy-locator-admin-token')).toBeNull();
  });

  test('модерацію вимкнено на сервері (404)', async () => {
    mockFetch({
      '/api/admin/submissions': () => ({ status: 404, body: { error: { code: 'NOT_FOUND', message: 'Маршрут не знайдено' } } }),
    });
    renderWithProviders(<AdminPage />, { route: '/admin' });
    await login();
    expect(await screen.findByText('Модерацію вимкнено на сервері: не задано ADMIN_TOKEN.')).toBeInTheDocument();
  });

  test('вхід, схвалення заявки з підтвердженням, реєстрації', async () => {
    const fetchMock = adminApi();
    renderWithProviders(<AdminPage />, { route: '/admin' });
    await login();

    expect(await screen.findByRole('tab', { name: 'Заявки (1)' })).toHaveAttribute('aria-selected', 'true');
    expect(sessionStorage.getItem('academy-locator-admin-token')).toBe(TOKEN);
    const card = screen.getByRole('listitem');
    expect(within(card).getByText('Ірина · +380501112233')).toBeInTheDocument();
    expect(within(card).getByText('Робототехніка')).toBeInTheDocument();

    await userEvent.click(within(card).getByRole('button', { name: 'Схвалити' }));
    expect(within(card).getByText('Схвалити заклад?')).toBeInTheDocument();
    await userEvent.click(within(card).getByRole('button', { name: 'Так' }));

    expect(await screen.findByText('Нових заявок немає')).toBeInTheDocument();
    const [, patch] = fetchMock.mock.calls.find(([u]) => u === '/api/admin/institutions/p1');
    expect(patch.method).toBe('PATCH');
    expect(JSON.parse(patch.body)).toEqual({ status: 'approved' });
    expect(screen.getByRole('status')).toHaveTextContent('«Школа робототехніки «Кібер»» схвалено');

    await userEvent.click(screen.getByRole('tab', { name: 'Реєстрації (1)' }));
    const row = screen.getByRole('row', { name: /Олена/ });
    expect(within(row).getByText('Робототехніка на Arduino')).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: '+380501234567' })).toHaveAttribute('href', 'tel:+380501234567');
  });

  test('токен став недійсним → повернення до входу', async () => {
    sessionStorage.setItem('academy-locator-admin-token', 'expired');
    adminApi();
    renderWithProviders(<AdminPage />, { route: '/admin' });
    expect(await screen.findByText('Сесію завершено: токен більше не дійсний.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Адмін-токен/)).toBeInTheDocument();
  });
});
