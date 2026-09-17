import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { App } from './App.jsx';
import { markersFixture, mockFetch } from './testing/fixtures.jsx';

const renderAt = (route) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  );

describe('App', () => {
  test('після завантаження довідників показує панель з результатами', async () => {
    mockFetch({ '/api/institutions': markersFixture });
    renderAt('/');
    expect(await screen.findByText('3 заклади · 8 курсів')).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Панель' })).toBeInTheDocument();
  });

  test('помилка довідників → екран з повтором', async () => {
    mockFetch({
      '/api/meta': () => ({ status: 500, body: { error: { code: 'INTERNAL', message: 'Внутрішня помилка сервера' } } }),
    });
    renderAt('/');
    expect(await screen.findByText('Внутрішня помилка сервера')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Спробувати ще' })).toBeInTheDocument();
  });

  test('невідомий маршрут', async () => {
    mockFetch({ '/api/institutions': markersFixture });
    renderAt('/nope');
    expect(await screen.findByText('Сторінку не знайдено')).toBeInTheDocument();
  });
});
