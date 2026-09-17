import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { MapProvider } from '../state/MapProvider.jsx';
import { courseDetailsFixture, markersFixture, mockFetch, renderWithProviders } from '../testing/fixtures.jsx';
import { CourseDetailsPanel } from './CourseDetailsPanel.jsx';

const renderPanel = (route) =>
  renderWithProviders(
    <MapProvider>
      <CourseDetailsPanel />
    </MapProvider>,
    { route, path: '/courses/:courseId' },
  );

describe('CourseDetailsPanel', () => {
  test('деталі курсу та відкриття реєстрації', async () => {
    mockFetch({ '/api/courses/khpi-robotics-arduino': courseDetailsFixture, '/api/institutions': markersFixture });
    renderPanel('/courses/khpi-robotics-arduino?age=10-13');

    expect(await screen.findByRole('heading', { level: 2, name: 'Робототехніка на Arduino' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'НТУ «ХПІ»' })).toHaveAttribute('href', '/institutions/khpi?age=10-13');
    expect(screen.getByRole('link', { name: 'Робототехніка' })).toHaveAttribute('href', '/institutions/khpi/robotics?age=10-13');
    expect(screen.getByText('11–16 років')).toBeInTheDocument();
    expect(screen.getByText('Початковий')).toBeInTheDocument();
    expect(screen.getByText('Субота, 12:00–14:00')).toBeInTheDocument();
    expect(screen.getByText('Лишилось 3 місця')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Зареєструватися' }));
    expect(screen.getByRole('dialog', { name: 'Реєстрація на курс' })).toBeInTheDocument();
  });

  test('без місць кнопка недоступна', async () => {
    const full = { ...courseDetailsFixture, course: { ...courseDetailsFixture.course, seatsLeft: 0 } };
    mockFetch({ '/api/courses/khpi-robotics-arduino': full, '/api/institutions': markersFixture });
    renderPanel('/courses/khpi-robotics-arduino');
    expect(await screen.findByRole('button', { name: 'Місць немає' })).toBeDisabled();
  });

  test('404 → «Курс не знайдено»', async () => {
    mockFetch({
      '/api/courses/nope': () => ({ status: 404, body: { error: { code: 'NOT_FOUND', message: 'Курс не знайдено' } } }),
      '/api/institutions': markersFixture,
    });
    renderPanel('/courses/nope');
    expect(await screen.findByRole('heading', { name: 'Курс не знайдено' })).toBeInTheDocument();
  });
});
