import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, test } from 'vitest';
import { Panel } from './Panel.jsx';

describe('Panel (mobile)', () => {
  test('ручка перемикає стан шторки', async () => {
    render(
      <MemoryRouter>
        <Panel header={<p>Заголовок</p>}>
          <p>Вміст</p>
        </Panel>
      </MemoryRouter>,
    );
    const panel = screen.getByRole('complementary', { name: 'Панель' });
    expect(panel).toHaveAttribute('data-snap', 'half');
    await userEvent.click(screen.getByRole('button', { name: 'Розгорнути панель' }));
    expect(panel).toHaveAttribute('data-snap', 'full');
    await userEvent.click(screen.getByRole('button', { name: 'Згорнути панель' }));
    expect(panel).toHaveAttribute('data-snap', 'peek');
  });
});
