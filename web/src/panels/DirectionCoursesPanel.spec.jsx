import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { MapProvider } from '../state/MapProvider.jsx';
import { directionCoursesFixture, markersFixture, mockFetch, renderWithProviders } from '../testing/fixtures.jsx';
import { DirectionCoursesPanel } from './DirectionCoursesPanel.jsx';

const renderPanel = (route) =>
  renderWithProviders(
    <MapProvider>
      <DirectionCoursesPanel />
    </MapProvider>,
    { route, path: '/institutions/:id/:slug' },
  );

describe('DirectionCoursesPanel', () => {
  test('картки курсів; невідповідні фільтрам приглушені; мало місць — бейдж', async () => {
    const fetchMock = mockFetch({
      '/api/institutions/itstep-kharkiv/directions/game-dev/courses': directionCoursesFixture,
      '/api/institutions': markersFixture,
    });
    renderPanel('/institutions/itstep-kharkiv/game-dev?format=online');

    expect(await screen.findByRole('heading', { level: 2, name: 'Розробка ігор' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ITSTEP Академія' })).toHaveAttribute(
      'href',
      '/institutions/itstep-kharkiv?format=online',
    );

    const unity = screen.getByRole('link', { name: /Unity: створення 3D-ігор/ });
    expect(unity).toHaveAttribute('href', '/courses/itstep-unity-3d?format=online');
    expect(unity).toHaveTextContent('12–16 років');
    expect(unity).toHaveTextContent(/1\s900 грн\/міс/);
    expect(unity).toHaveTextContent('Старт 6 жовтня');

    const scratch = screen.getByRole('link', { name: /Scratch: перші ігри/ });
    expect(scratch).toHaveTextContent('Не відповідає обраним фільтрам');
    expect(scratch).toHaveTextContent('Лишилось 4 місця');

    expect(fetchMock.mock.calls.map(([u]) => String(u))).toContain(
      '/api/institutions/itstep-kharkiv/directions/game-dev/courses?format=online',
    );
  });

  test('невідомий напрямок → 404', async () => {
    mockFetch({
      '/api/institutions/khpi/directions/unknown/courses': () => ({
        status: 404,
        body: { error: { code: 'NOT_FOUND', message: 'Напрямок не знайдено' } },
      }),
      '/api/institutions': markersFixture,
    });
    renderPanel('/institutions/khpi/unknown');
    expect(await screen.findByRole('heading', { name: 'Напрямок не знайдено' })).toBeInTheDocument();
  });
});
