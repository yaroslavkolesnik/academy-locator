import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router';
import { describe, expect, test } from 'vitest';
import { MapProvider, useMapState } from '../state/MapProvider.jsx';
import {
  markersFixture,
  mockFetch,
  quizFixture,
  recommendationsFixture,
  renderWithProviders,
} from '../testing/fixtures.jsx';
import { QuizDialog } from './QuizDialog.jsx';

function Probe() {
  const { pathname, search } = useLocation();
  const { highlightedIds } = useMapState();
  return (
    <>
      <p data-testid="location">{decodeURIComponent(pathname + search)}</p>
      <p data-testid="highlight">{highlightedIds.join(',')}</p>
    </>
  );
}

const renderQuiz = () =>
  renderWithProviders(
    <MapProvider>
      <QuizDialog />
      <Probe />
    </MapProvider>,
    { route: '/quiz' },
  );

const nextButton = () => screen.getByRole('button', { name: /Далі|Показати результати/ });

describe('QuizDialog', () => {
  test('проходження квізу → рекомендації → показ на карті з підсвіткою', async () => {
    const fetchMock = mockFetch({
      '/api/quiz': quizFixture,
      '/api/recommendations': () => ({ body: recommendationsFixture }),
      '/api/institutions': markersFixture,
    });
    renderQuiz();

    expect(await screen.findByText('Питання 1 з 5')).toBeInTheDocument();
    expect(nextButton()).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: '10–13 років' }));
    await userEvent.click(nextButton());
    await userEvent.click(screen.getByRole('button', { name: 'Будувати й конструювати' }));
    await userEvent.click(nextButton());
    await userEvent.click(screen.getByRole('button', { name: 'Наживо, в класі' }));
    await userEvent.click(nextButton());
    await userEvent.click(screen.getByRole('button', { name: 'Підійдуть і платні' }));
    await userEvent.click(nextButton());
    await userEvent.click(screen.getByRole('button', { name: 'Не важливо' }));
    await userEvent.click(screen.getByRole('button', { name: 'Показати результати' }));

    expect(await screen.findByRole('heading', { name: 'Робототехніка на Arduino' })).toBeInTheDocument();
    expect(screen.getByText('Ваш інтерес: Робототехніка')).toBeInTheDocument();

    const [, init] = fetchMock.mock.calls.find(([u]) => u === '/api/recommendations');
    expect(JSON.parse(init.body)).toEqual({
      age: 11,
      interests: ['robotics', '3d-modeling', 'electronics'],
      format: ['offline', 'hybrid'],
      price: 'any',
    });

    await userEvent.click(screen.getByRole('button', { name: 'Показати на карті' }));
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/?direction=robotics,3d-modeling,electronics,game-dev&format=offline,hybrid&age=10-13',
    );
    expect(screen.getByTestId('highlight')).toHaveTextContent('khpi,itstep-kharkiv');
  });

  test('порожній результат пропонує змінити відповіді', async () => {
    mockFetch({
      '/api/quiz': quizFixture,
      '/api/recommendations': () => ({ body: { filters: { ageFrom: 25, ageTo: 25 }, items: [] } }),
      '/api/institutions': markersFixture,
    });
    renderQuiz();
    await screen.findByText('Питання 1 з 5');
    for (const option of ['18+ років', 'Малювати й оживляти персонажів', 'Онлайн з дому', 'Лише безкоштовні', 'Не важливо']) {
      await userEvent.click(screen.getByRole('button', { name: option }));
      await userEvent.click(nextButton());
    }
    expect(await screen.findByText('Точних збігів немає')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Змінити відповіді' }));
    expect(screen.getByText('Питання 1 з 5')).toBeInTheDocument();
  });
});
