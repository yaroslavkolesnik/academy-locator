import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { Chip } from './Chip.jsx';
import { Dialog } from './Dialog.jsx';
import { Field } from './Field.jsx';
import { ToastProvider, useToast } from './Toast.jsx';

describe('Chip', () => {
  test('перемикає aria-pressed', async () => {
    function Harness() {
      const [on, setOn] = useState(false);
      return (
        <Chip pressed={on} onToggle={() => setOn((v) => !v)}>
          Технології
        </Chip>
      );
    }
    render(<Harness />);
    const chip = screen.getByRole('button', { name: 'Технології' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Field', () => {
  test('звʼязує label, hint і помилку з полем', () => {
    render(
      <Field label="Імʼя" hint="Як до вас звертатися" error="Імʼя: мінімум 2 символи" required>
        <input />
      </Field>,
    );
    const input = screen.getByLabelText(/Імʼя/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toBeRequired();
    expect(input).toHaveAccessibleDescription('Як до вас звертатися Імʼя: мінімум 2 символи');
    expect(screen.getByRole('alert')).toHaveTextContent('мінімум 2 символи');
  });
});

describe('Dialog', () => {
  test('відкривається, має заголовок і закривається кнопкою', async () => {
    const onClose = vi.fn();
    render(
      <Dialog open title="Фільтри" onClose={onClose}>
        <p>Вміст</p>
      </Dialog>,
    );
    expect(screen.getByRole('dialog', { name: 'Фільтри' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Закрити' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('Toast', () => {
  test('показує повідомлення в live-регіоні', async () => {
    function Trigger() {
      const toast = useToast();
      return <button onClick={() => toast.show('Заклад додано')}>go</button>;
    }
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'go' }));
    expect(screen.getByRole('status')).toHaveTextContent('Заклад додано');
  });
});
