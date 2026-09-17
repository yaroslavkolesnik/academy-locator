import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { courseDetailsFixture, mockFetch, renderWithProviders } from '../testing/fixtures.jsx';
import { RegistrationDialog } from './RegistrationDialog.jsx';

const { course, institution } = courseDetailsFixture;
const REG_URL = '/api/courses/khpi-robotics-arduino/registrations';

const renderDialog = (onRegistered = vi.fn()) => {
  renderWithProviders(
    <RegistrationDialog course={course} institution={institution} open onClose={vi.fn()} onRegistered={onRegistered} />,
  );
  return onRegistered;
};

describe('RegistrationDialog', () => {
  test('успішна реєстрація', async () => {
    const fetchMock = mockFetch({
      [REG_URL]: () => ({ status: 201, body: { id: 'r1', courseId: course.id, status: 'received', seatsLeft: 2 } }),
    });
    const onRegistered = renderDialog();

    await userEvent.type(screen.getByLabelText(/Ім’я/), 'Олена');
    await userEvent.type(screen.getByLabelText(/Телефон або email/), '+380501234567');
    await userEvent.type(screen.getByLabelText('Вік учасника'), '11');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: 'Надіслати заявку' }));

    expect(await screen.findByRole('heading', { name: 'Заявку прийнято' })).toBeInTheDocument();
    expect(screen.getByText('Лишилось 2 місця')).toBeInTheDocument();
    expect(onRegistered).toHaveBeenCalledWith(2);
    const [, init] = fetchMock.mock.calls.find(([u]) => u === REG_URL);
    expect(JSON.parse(init.body)).toEqual({ name: 'Олена', contact: '+380501234567', participantAge: 11, consent: true });
  });

  test('помилки валідації під полями, фокус на першому', async () => {
    mockFetch({
      [REG_URL]: () => ({
        status: 400,
        body: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Некоректні дані форми',
            details: [
              { path: 'name', message: 'Імʼя: мінімум 2 символи' },
              { path: 'consent', message: 'Потрібна згода на обробку персональних даних' },
            ],
          },
        },
      }),
    });
    renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Надіслати заявку' }));

    expect(await screen.findByText('Імʼя: мінімум 2 символи')).toBeInTheDocument();
    expect(screen.getByText('Потрібна згода на обробку персональних даних')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(/Ім’я/)).toHaveFocus());
  });

  test('409 — місця закінчились', async () => {
    mockFetch({ [REG_URL]: () => ({ status: 409, body: { error: { code: 'NO_SEATS', message: 'Вільних місць немає' } } }) });
    const onRegistered = renderDialog();
    await userEvent.click(screen.getByRole('button', { name: 'Надіслати заявку' }));
    expect(await screen.findByText('На жаль, місця на цей курс щойно закінчились.')).toBeInTheDocument();
    expect(onRegistered).toHaveBeenCalledWith(0);
  });
});
