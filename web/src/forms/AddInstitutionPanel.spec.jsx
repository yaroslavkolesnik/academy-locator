import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { MapProvider, useMapState } from '../state/MapProvider.jsx';
import { markersFixture, mockFetch, renderWithProviders } from '../testing/fixtures.jsx';
import { AddInstitutionPanel } from './AddInstitutionPanel.jsx';

function PickButtons() {
  const { setPickPoint, pickMode } = useMapState();
  return (
    <>
      <p data-testid="mode">{String(pickMode)}</p>
      <button onClick={() => setPickPoint({ lat: 50.45, lng: 30.52 })}>kyiv</button>
      <button onClick={() => setPickPoint({ lat: 50.0021, lng: 36.2445 })}>kharkiv</button>
    </>
  );
}

describe('AddInstitutionPanel', () => {
  test('крок 1: точка має бути в межах Харкова, потім форма', async () => {
    mockFetch({ '/api/institutions': markersFixture });
    renderWithProviders(
      <MapProvider>
        <PickButtons />
        <AddInstitutionPanel />
      </MapProvider>,
      { route: '/add', path: '/add' },
    );

    expect(screen.getByTestId('mode')).toHaveTextContent('true');
    expect(screen.getByText('Точку ще не обрано.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Далі' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'kyiv' }));
    expect(screen.getByText('Точка поза межами Харкова. Оберіть місце в місті.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Далі' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'kharkiv' }));
    expect(screen.getByText('Обрано: 50.00210, 36.24450')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Далі' }));
    expect(screen.getByText('Крок 2 з 2')).toBeInTheDocument();
    expect(screen.getByLabelText(/Назва закладу/)).toBeInTheDocument();
  });
});
