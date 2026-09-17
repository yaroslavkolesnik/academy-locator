import { ClipboardList } from 'lucide-react';
import { contactHref, formatDateTime } from '../lib/format.js';
import { EmptyState } from '../ui/EmptyState.jsx';
import { ErrorState } from '../ui/ErrorState.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import styles from './Admin.module.css';

export function RegistrationsTab({ state }) {
  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} />;
  if (!state.data) return <Skeleton lines={2} slow={state.slow} />;
  if (state.data.items.length === 0) {
    return <EmptyState icon={ClipboardList} title="Реєстрацій ще немає" text="Заявки з форм курсів з’являться тут." />;
  }

  return (
    <table className={styles.table}>
      <caption className="visually-hidden">Реєстрації на курси</caption>
      <thead>
        <tr>
          <th scope="col">Дата</th>
          <th scope="col">Ім’я</th>
          <th scope="col">Контакт</th>
          <th scope="col">Вік</th>
          <th scope="col">Курс</th>
          <th scope="col">Заклад</th>
          <th scope="col">Коментар</th>
        </tr>
      </thead>
      <tbody>
        {state.data.items.map((r) => (
          <tr key={r.id}>
            <td data-label="Дата">{formatDateTime(r.createdAt)}</td>
            <td data-label="Ім’я">{r.name}</td>
            <td data-label="Контакт">
              <a href={contactHref(r.contact)}>{r.contact}</a>
            </td>
            <td data-label="Вік">{r.participantAge ?? '—'}</td>
            <td data-label="Курс">{r.courseTitle ?? r.courseId}</td>
            <td data-label="Заклад">{r.institutionShortName ?? '—'}</td>
            <td data-label="Коментар">{r.comment ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
