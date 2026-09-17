import { useState } from 'react';
import { request } from '../api/client.js';
import { Button } from '../ui/Button.jsx';
import { Field } from '../ui/Field.jsx';
import styles from './Admin.module.css';
import { adminHeaders } from './adminToken.js';

export function AdminLogin({ notice, onSuccess }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    const token = value.trim();
    if (!token) {
      setError('Введіть токен.');
      return;
    }
    setChecking(true);
    setError('');
    try {
      await request('/api/admin/submissions', { headers: adminHeaders(token) });
      onSuccess(token);
    } catch (err) {
      if (err.code === 'UNAUTHORIZED') setError('Невірний токен.');
      else if (err.status === 404) setError('Модерацію вимкнено на сервері: не задано ADMIN_TOKEN.');
      else setError(err.message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <form className={styles.loginCard} onSubmit={onSubmit} noValidate>
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
      <Field label="Адмін-токен" hint="Значення ADMIN_TOKEN у налаштуваннях сервісу на Render" error={error} required>
        <input
          name="token"
          type="password"
          autoComplete="current-password"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError('');
          }}
        />
      </Field>
      <Button type="submit" disabled={checking}>
        {checking ? 'Перевіряємо…' : 'Увійти'}
      </Button>
    </form>
  );
}
