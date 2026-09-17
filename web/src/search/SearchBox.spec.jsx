import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router';
import { describe, expect, test } from 'vitest';
import { mockFetch, renderWithProviders } from '../testing/fixtures.jsx';
import { SearchBox } from './SearchBox.jsx';

const suggest = {
  directions: [{ slug: 'robotics', name: 'Робототехніка', categoryCode: 'T' }],
  institutions: [],
  courses: [
    {
      id: 'khpi-robotics-arduino',
      title: 'Робототехніка на Arduino',
      institutionId: 'khpi',
      institutionShortName: 'НТУ «ХПІ»',
      directionSlug: 'robotics',
    },
  ],
};

function Harness() {
  const { pathname, search } = useLocation();
  return (
    <>
      <SearchBox />
      <p data-testid="location">{decodeURIComponent(pathname + search)}</p>
    </>
  );
}

describe('SearchBox', () => {
  test('підказки з’являються після введення й обираються клавіатурою', async () => {
    mockFetch({ '/api/search/suggest': suggest });
    renderWithProviders(<Harness />, { route: '/?age=10-13' });
    const input = screen.getByRole('combobox', { name: 'Пошук' });
    await userEvent.type(input, 'роб');
    expect(await screen.findByRole('option', { name: /Робототехніка на Arduino/ })).toBeInTheDocument();
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(screen.getByTestId('location')).toHaveTextContent('/?direction=robotics&age=10-13');
    expect(input).toHaveValue('');
  });

  test('Enter без вибору шукає за текстом', async () => {
    mockFetch({ '/api/search/suggest': suggest });
    renderWithProviders(<Harness />, { route: '/institutions/khpi' });
    await userEvent.type(screen.getByRole('combobox', { name: 'Пошук' }), 'arduino{Enter}');
    expect(screen.getByTestId('location')).toHaveTextContent('/?q=arduino');
  });

  test('клік по курсу відкриває курс зі збереженням фільтрів', async () => {
    mockFetch({ '/api/search/suggest': suggest });
    renderWithProviders(<Harness />, { route: '/?age=10-13' });
    await userEvent.type(screen.getByRole('combobox', { name: 'Пошук' }), 'роб');
    await userEvent.click(await screen.findByRole('option', { name: /Робототехніка на Arduino/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/courses/khpi-robotics-arduino?age=10-13');
  });

  test('Escape закриває список', async () => {
    mockFetch({ '/api/search/suggest': suggest });
    renderWithProviders(<Harness />);
    await userEvent.type(screen.getByRole('combobox', { name: 'Пошук' }), 'роб');
    await screen.findByRole('listbox');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
