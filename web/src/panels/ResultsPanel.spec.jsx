import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { MapProvider } from '../state/MapProvider.jsx';
import { markersFixture, mockFetch, renderWithProviders } from '../testing/fixtures.jsx';
import { ResultsPanel } from './ResultsPanel.jsx';

const renderPanel = (route = '/') =>
  renderWithProviders(
    <MapProvider>
      <ResultsPanel />
    </MapProvider>,
    { route },
  );

describe('ResultsPanel', () => {
  test('лічильник і список закладів зі статусом модерації', async () => {
    mockFetch({ '/api/institutions': markersFixture });
    renderPanel('/?age=10-13');
    expect(await screen.findByText('3 заклади · 8 курсів')).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/institutions/khpi?age=10-13',
      '/institutions/kh-palace?age=10-13',
      '/institutions/5c0f6a1e-1111-4222-8333-944455556666?age=10-13',
    ]);
    expect(screen.getByText('На модерації')).toBeInTheDocument();
    expect(screen.getByText('4 з 4 курсів підходять')).toBeInTheDocument();
  });

  test('порожній результат → скидання фільтрів', async () => {
    const fetchMock = mockFetch({
      '/api/institutions': (url) =>
        url.includes('category')
          ? { body: { summary: { institutions: 0, courses: 0 }, items: [] } }
          : { body: markersFixture },
    });
    renderPanel('/?category=A');
    await userEvent.click(await screen.findByRole('button', { name: 'Скинути фільтри' }));
    await waitFor(() => expect(screen.getByText('3 заклади · 8 курсів')).toBeInTheDocument());
    expect(fetchMock.mock.calls.at(-1)[0]).toBe('/api/institutions');
  });

  test('помилка мережі → повтор', async () => {
    mockFetch({
      '/api/institutions': () => ({
        status: 500,
        body: { error: { code: 'INTERNAL', message: 'Внутрішня помилка сервера' } },
      }),
    });
    renderPanel();
    expect(await screen.findByRole('button', { name: 'Спробувати ще' })).toBeInTheDocument();
  });
});
