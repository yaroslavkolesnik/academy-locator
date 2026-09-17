import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { mockFetch, renderWithProviders } from '../testing/fixtures.jsx';
import { InstitutionForm } from './InstitutionForm.jsx';

const point = { lat: 50.0021, lng: 36.2445 };

describe('InstitutionForm', () => {
  test('надсилає заявку і повертає створений заклад', async () => {
    const created = { id: 'new-1', status: 'pending', name: 'Школа «Кібер»' };
    const fetchMock = mockFetch({ '/api/institutions': () => ({ status: 201, body: { institution: created } }) });
    const onCreated = vi.fn();
    renderWithProviders(<InstitutionForm point={point} onBack={vi.fn()} onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText(/Назва закладу/), 'Школа «Кібер»');
    await userEvent.selectOptions(screen.getByLabelText(/Тип закладу/), 'private_school');
    await userEvent.type(screen.getByLabelText(/Адреса/), 'вул. Пушкінська, 50');
    await userEvent.type(screen.getByLabelText('Телефон'), '+380501112233');
    await userEvent.click(screen.getByRole('radio', { name: 'Так' }));
    await userEvent.click(screen.getByRole('button', { name: 'Робототехніка' }));
    await userEvent.click(screen.getByRole('button', { name: 'Надіслати на модерацію' }));

    await vi.waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    const [, init] = fetchMock.mock.calls.find(([u, i]) => u === '/api/institutions' && i.method === 'POST');
    expect(JSON.parse(init.body)).toEqual({
      name: 'Школа «Кібер»',
      type: 'private_school',
      address: 'вул. Пушкінська, 50',
      lat: 50.0021,
      lng: 36.2445,
      phone: '+380501112233',
      hasShelter: true,
      declaredDirectionIds: ['robotics'],
    });
  });

  test('помилки полів і координат', async () => {
    mockFetch({
      '/api/institutions': () => ({
        status: 400,
        body: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Некоректні дані форми',
            details: [
              { path: 'phone', message: 'Вкажіть телефон або email' },
              { path: 'lat', message: 'Точка має бути в межах міста' },
            ],
          },
        },
      }),
    });
    renderWithProviders(<InstitutionForm point={point} onBack={vi.fn()} onCreated={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Надіслати на модерацію' }));
    expect(await screen.findByText('Вкажіть телефон або email')).toBeInTheDocument();
    expect(
      screen.getByText('Точка на карті поза межами міста. Поверніться до кроку 1 і оберіть іншу.'),
    ).toBeInTheDocument();
  });
});
