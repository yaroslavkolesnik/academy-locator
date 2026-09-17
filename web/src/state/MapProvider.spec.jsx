import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test } from 'vitest';
import { markersFixture, mockFetch, renderWithProviders } from '../testing/fixtures.jsx';
import { MapProvider, useMapState } from './MapProvider.jsx';

function Probe() {
  const { markers, filters, highlightedIds, showHighlight } = useMapState();
  return (
    <div>
      <p data-testid="count">{markers.data?.items.length ?? 'loading'}</p>
      <p data-testid="near">{String(filters.near)}</p>
      <p data-testid="highlight">{highlightedIds.join(',')}</p>
      <button onClick={() => showHighlight(['khpi'], filters)}>highlight</button>
    </div>
  );
}

afterEach(() => Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true }));

describe('MapProvider', () => {
  test('запитує маркери з фільтрами з URL', async () => {
    const fetchMock = mockFetch({ '/api/institutions': markersFixture });
    renderWithProviders(
      <MapProvider>
        <Probe />
      </MapProvider>,
      { route: '/?age=10-13&category=T' },
    );
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('3'));
    const url = fetchMock.mock.calls.map(([u]) => String(u)).find((u) => u.startsWith('/api/institutions'));
    expect(url).toBe('/api/institutions?category=T&ageFrom=10&ageTo=13');
  });

  test('near=1 без доступу до геолокації → фільтр знімається і показується повідомлення', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition: (ok, fail) => fail({ code: 1 }) },
      configurable: true,
    });
    mockFetch({ '/api/institutions': markersFixture });
    renderWithProviders(
      <MapProvider>
        <Probe />
      </MapProvider>,
      { route: '/?near=1' },
    );
    await waitFor(() => expect(screen.getByTestId('near')).toHaveTextContent('false'));
    expect(screen.getByRole('status')).toHaveTextContent('Не вдалося визначити ваше місцезнаходження');
  });

  test('підсвітка діє, доки не змінились фільтри', async () => {
    mockFetch({ '/api/institutions': markersFixture });
    renderWithProviders(
      <MapProvider>
        <Probe />
      </MapProvider>,
      { route: '/?age=10-13' },
    );
    await userEvent.click(screen.getByRole('button', { name: 'highlight' }));
    expect(screen.getByTestId('highlight')).toHaveTextContent('khpi');
  });
});
