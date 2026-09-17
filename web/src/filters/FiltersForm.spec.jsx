import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router';
import { describe, expect, test } from 'vitest';
import { useFilters } from '../state/useFilters.js';
import { renderWithProviders } from '../testing/fixtures.jsx';
import { FiltersForm } from './FiltersForm.jsx';

function Harness() {
  const { filters, setFilters } = useFilters();
  const { search } = useLocation();
  return (
    <>
      <FiltersForm filters={filters} onChange={setFilters} />
      <p data-testid="search">{decodeURIComponent(search)}</p>
    </>
  );
}

describe('FiltersForm', () => {
  test('категорії перемикаються, вік — одиночний вибір', async () => {
    renderWithProviders(<Harness />, { route: '/?direction=robotics' });
    await userEvent.click(screen.getByRole('button', { name: 'Технології' }));
    await userEvent.click(screen.getByRole('button', { name: 'Інженерія' }));
    await userEvent.click(screen.getByRole('button', { name: '10–13 років' }));
    await userEvent.click(screen.getByRole('button', { name: '14–17 років' }));
    expect(screen.getByTestId('search')).toHaveTextContent('?category=T,E&direction=robotics&age=14-17');
    expect(screen.getByRole('button', { name: 'Технології' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('активний напрямок показується й знімається', async () => {
    renderWithProviders(<Harness />, { route: '/?direction=robotics' });
    await userEvent.click(screen.getByRole('button', { name: 'Робототехніка' }));
    expect(screen.getByTestId('search')).toHaveTextContent('');
    expect(screen.queryByRole('group', { name: 'Напрямки' })).not.toBeInTheDocument();
  });
});
