import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { MapProvider } from '../state/MapProvider.jsx';
import { institutionCardFixture, markersFixture, mockFetch, renderWithProviders } from '../testing/fixtures.jsx';
import { InstitutionPanel } from './InstitutionPanel.jsx';

const renderCard = (route) =>
  renderWithProviders(
    <MapProvider>
      <InstitutionPanel />
    </MapProvider>,
    { route, path: '/institutions/:id' },
  );

describe('InstitutionPanel', () => {
  test('картка з контактами, профілем і напрямками зі збереженням фільтрів', async () => {
    const fetchMock = mockFetch({ '/api/institutions/khpi': institutionCardFixture, '/api/institutions': markersFixture });
    renderCard('/institutions/khpi?price=free');

    expect(await screen.findByRole('heading', { level: 2, name: /Харківський політехнічний інститут/ })).toBeInTheDocument();
    expect(screen.getByText('Університет')).toBeInTheDocument();
    expect(screen.getByText('Технології · 2')).toBeInTheDocument();

    const site = screen.getByRole('link', { name: 'kpi.kharkov.ua' });
    expect(site).toHaveAttribute('href', 'https://www.kpi.kharkov.ua');
    expect(site).toHaveAttribute('target', '_blank');

    const robotics = screen.getByRole('link', { name: /Робототехніка/ });
    expect(robotics).toHaveAttribute('href', '/institutions/khpi/robotics?price=free');
    expect(robotics).toHaveTextContent('0 з 1 курсів підходять');
    expect(screen.getByRole('link', { name: 'До результатів' })).toHaveAttribute('href', '/?price=free');

    const urls = fetchMock.mock.calls.map(([u]) => String(u));
    expect(urls).toContain('/api/institutions/khpi?price=free');
  });

  test('заклад на модерації з заявленим напрямком без курсів', async () => {
    const pending = {
      institution: {
        ...institutionCardFixture.institution,
        id: 'p1',
        name: 'Школа робототехніки «Кібер»',
        shortName: 'Школа робототехніки «Кібер»',
        type: 'private_school',
        status: 'pending',
        website: null,
        phone: '+380501112233',
        courseCount: 0,
        steamProfile: { S: 0, T: 1, E: 0, A: 0, M: 0 },
      },
      directions: [{ slug: 'robotics', name: 'Робототехніка', categoryCode: 'T', courseCount: 0, matchedCourseCount: 0 }],
    };
    mockFetch({ '/api/institutions/p1': pending, '/api/institutions': markersFixture });
    renderCard('/institutions/p1');

    expect(await screen.findByText('На модерації')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+380501112233' })).toHaveAttribute('href', 'tel:+380501112233');
    expect(screen.getByText(/Курси ще не додані/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Робототехніка/ })).not.toBeInTheDocument();
  });

  test('404 → «Заклад не знайдено»', async () => {
    mockFetch({
      '/api/institutions/missing': () => ({
        status: 404,
        body: { error: { code: 'NOT_FOUND', message: 'Заклад не знайдено' } },
      }),
      '/api/institutions': markersFixture,
    });
    renderCard('/institutions/missing');
    expect(await screen.findByRole('heading', { name: 'Заклад не знайдено' })).toBeInTheDocument();
  });
});
