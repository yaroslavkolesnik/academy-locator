import { LogOut, Map as MapIcon } from 'lucide-react';
import { useCallback, useEffect, useId, useState } from 'react';
import { Link } from 'react-router';
import { useApi } from '../api/useApi.js';
import { Brand } from '../layout/Brand.jsx';
import { Button } from '../ui/Button.jsx';
import styles from './Admin.module.css';
import { AdminLogin } from './AdminLogin.jsx';
import { adminHeaders, clearToken, readToken, saveToken } from './adminToken.js';
import { RegistrationsTab } from './RegistrationsTab.jsx';
import { SubmissionsTab } from './SubmissionsTab.jsx';

const DEFAULT_TITLE = 'Academy Locator — STEAM-освіта Харкова';

export function AdminPage() {
  const [token, setToken] = useState(readToken);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    document.title = 'Модерація — Academy Locator';
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, []);

  const logout = useCallback((message = '') => {
    clearToken();
    setToken('');
    setNotice(message);
  }, []);

  const onUnauthorized = useCallback(() => logout('Сесію завершено: токен більше не дійсний.'), [logout]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Brand compact />
        <div className={styles.headerActions}>
          <Button as={Link} to="/" variant="ghost" size="sm" icon={MapIcon}>
            До карти
          </Button>
          {token && (
            <Button variant="secondary" size="sm" icon={LogOut} onClick={() => logout()}>
              Вийти
            </Button>
          )}
        </div>
      </header>
      <main className={styles.main}>
        <h1 className={styles.title}>Модерація</h1>
        {token ? (
          <AdminDashboard token={token} onUnauthorized={onUnauthorized} />
        ) : (
          <AdminLogin
            notice={notice}
            onSuccess={(value) => {
              saveToken(value);
              setToken(value);
              setNotice('');
            }}
          />
        )}
      </main>
    </div>
  );
}

const TABS = [
  { id: 'submissions', label: 'Заявки' },
  { id: 'registrations', label: 'Реєстрації' },
];

function AdminDashboard({ token, onUnauthorized }) {
  const baseId = useId();
  const [tab, setTab] = useState('submissions');
  const [version, setVersion] = useState(0);
  const headers = adminHeaders(token);
  const submissions = useApi('/api/admin/submissions', { headers, refreshKey: version });
  const registrations = useApi('/api/admin/registrations', { headers, refreshKey: version });

  useEffect(() => {
    if (submissions.error?.code === 'UNAUTHORIZED' || registrations.error?.code === 'UNAUTHORIZED') onUnauthorized();
  }, [submissions.error, registrations.error, onUnauthorized]);

  const counts = {
    submissions: submissions.data?.items.length,
    registrations: registrations.data?.items.length,
  };

  const onKeyDown = (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    setTab((current) => (current === 'submissions' ? 'registrations' : 'submissions'));
  };

  return (
    <div className={styles.dashboard}>
      <div role="tablist" aria-label="Розділи модерації" className={styles.tabs} onKeyDown={onKeyDown}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${baseId}-${t.id}-tab`}
            aria-controls={`${baseId}-${t.id}-panel`}
            aria-selected={tab === t.id}
            tabIndex={tab === t.id ? 0 : -1}
            className={styles.tab}
            onClick={() => setTab(t.id)}
          >
            {counts[t.id] === undefined ? t.label : `${t.label} (${counts[t.id]})`}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${baseId}-${tab}-panel`} aria-labelledby={`${baseId}-${tab}-tab`}>
        {tab === 'submissions' ? (
          <SubmissionsTab state={submissions} token={token} onChanged={() => setVersion((v) => v + 1)} />
        ) : (
          <RegistrationsTab state={registrations} />
        )}
      </div>
    </div>
  );
}
