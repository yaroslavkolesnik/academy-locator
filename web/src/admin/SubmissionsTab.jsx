import { Check, Inbox, MapPin, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { request } from '../api/client.js';
import { formatDateTime } from '../lib/format.js';
import { useMeta } from '../state/MetaProvider.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { ErrorState } from '../ui/ErrorState.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { useToast } from '../ui/Toast.jsx';
import styles from './Admin.module.css';
import { adminHeaders } from './adminToken.js';

const SHELTER_LABELS = { true: 'Так', false: 'Ні', null: 'Не вказано' };

export function SubmissionsTab({ state, token, onChanged }) {
  const { labels, directionById } = useMeta();
  const toast = useToast();
  const [confirming, setConfirming] = useState(null);
  const [busyId, setBusyId] = useState(null);

  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} />;
  if (!state.data) return <Skeleton lines={2} slow={state.slow} />;
  if (state.data.items.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="Нових заявок немає"
        text="Коли заклад надішле форму «Додати заклад», заявка з’явиться тут."
      />
    );
  }

  const decide = async (item, status) => {
    setBusyId(item.id);
    try {
      await request(`/api/admin/institutions/${encodeURIComponent(item.id)}`, {
        method: 'PATCH',
        body: { status },
        headers: adminHeaders(token),
      });
      toast.show(status === 'approved' ? `«${item.name}» схвалено` : `«${item.name}» відхилено`, {
        tone: status === 'approved' ? 'success' : 'neutral',
      });
      setConfirming(null);
      onChanged();
    } catch (error) {
      toast.show(error.message, { tone: 'danger' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ul className={styles.list}>
      {state.data.items.map((item) => {
        const contacts = [item.contactPerson, item.phone, item.email, item.website].filter(Boolean).join(' · ');
        const directions = item.declaredDirectionIds.map((id) => directionById[id]?.name ?? id).join(', ');
        const isConfirming = confirming?.id === item.id;
        return (
          <li key={item.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h3>{item.name}</h3>
                <p className={styles.muted}>
                  {labels.type[item.type]} · надіслано {formatDateTime(item.createdAt)}
                </p>
              </div>
              <Badge tone="warning">На модерації</Badge>
            </div>
            <dl className={styles.details}>
              <div>
                <dt>Адреса</dt>
                <dd>{item.address}</dd>
              </div>
              {item.shortDescription && (
                <div>
                  <dt>Опис</dt>
                  <dd>{item.shortDescription}</dd>
                </div>
              )}
              <div>
                <dt>Контакти</dt>
                <dd>{contacts || '—'}</dd>
              </div>
              <div>
                <dt>Укриття</dt>
                <dd>{SHELTER_LABELS[String(item.hasShelter)]}</dd>
              </div>
              <div>
                <dt>Напрямки</dt>
                <dd>{directions || '—'}</dd>
              </div>
            </dl>
            <div className={styles.actions}>
              <Button as={Link} to={`/institutions/${item.id}`} variant="ghost" size="sm" icon={MapPin}>
                На карті
              </Button>
              {isConfirming ? (
                <>
                  <span className={styles.confirmText}>
                    {confirming.status === 'approved' ? 'Схвалити заклад?' : 'Відхилити заклад?'}
                  </span>
                  <Button
                    size="sm"
                    variant={confirming.status === 'approved' ? 'primary' : 'danger'}
                    disabled={busyId === item.id}
                    onClick={() => decide(item, confirming.status)}
                  >
                    Так
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                    Скасувати
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="danger" icon={X} onClick={() => setConfirming({ id: item.id, status: 'rejected' })}>
                    Відхилити
                  </Button>
                  <Button size="sm" icon={Check} onClick={() => setConfirming({ id: item.id, status: 'approved' })}>
                    Схвалити
                  </Button>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
