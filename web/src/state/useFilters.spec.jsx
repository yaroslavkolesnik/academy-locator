import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, test } from 'vitest';
import { useFilters, useLinkTo } from './useFilters.js';

function Probe() {
  const { filters, setFilters, resetFilters } = useFilters();
  const linkTo = useLinkTo();
  const location = useLocation();
  return (
    <div>
      <p data-testid="search">{location.search}</p>
      <p data-testid="link">{JSON.stringify(linkTo('/institutions/khpi'))}</p>
      <p data-testid="category">{filters.category.join(',')}</p>
      <button onClick={() => setFilters((f) => ({ ...f, category: [...f.category, 'E'] }))}>add</button>
      <button onClick={() => setFilters({ price: 'free' })}>free</button>
      <button onClick={resetFilters}>reset</button>
    </div>
  );
}

const renderAt = (route) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <Probe />
    </MemoryRouter>,
  );

describe('useFilters', () => {
  test('оновлює URL функцією та об’єктом', async () => {
    renderAt('/?category=T');
    await userEvent.click(screen.getByRole('button', { name: 'add' }));
    expect(screen.getByTestId('category')).toHaveTextContent('T,E');
    await userEvent.click(screen.getByRole('button', { name: 'free' }));
    expect(screen.getByTestId('search')).toHaveTextContent('?category=T%2CE&price=free');
  });

  test('reset очищає фільтри, але зберігає near', async () => {
    renderAt('/?category=T&age=6-9&near=1');
    await userEvent.click(screen.getByRole('button', { name: 'reset' }));
    expect(screen.getByTestId('search')).toHaveTextContent('?near=1');
  });

  test('useLinkTo зберігає поточні фільтри', () => {
    renderAt('/?age=6-9');
    expect(screen.getByTestId('link')).toHaveTextContent('{"pathname":"/institutions/khpi","search":"?age=6-9"}');
  });
});
