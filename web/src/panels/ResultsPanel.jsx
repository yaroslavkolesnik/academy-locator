import { Link } from 'react-router';
import { formatDistance, FORMS, pluralize } from '../lib/format.js';
import { SteamRing } from '../map/SteamRing.jsx';
import { hasCourseFilters } from '../state/filters.js';
import { useMapState, useSelectedInstitution } from '../state/MapProvider.jsx';
import { useMeta } from '../state/MetaProvider.jsx';
import { useFilters, useLinkTo } from '../state/useFilters.js';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { ErrorState } from '../ui/ErrorState.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import shared from './Panels.module.css';
import styles from './ResultsPanel.module.css';

export function ResultsPanel() {
  const { markers, highlightedIds } = useMapState();
  const { labels, dataNotice } = useMeta();
  const { filters, resetFilters } = useFilters();
  const linkTo = useLinkTo();
  useSelectedInstitution(null);

  if (markers.error && !markers.data) return <ErrorState error={markers.error} onRetry={markers.reload} />;
  if (!markers.data) return <Skeleton lines={4} slow={markers.slow} />;

  const { summary, items } = markers.data;
  const courseFilters = hasCourseFilters(filters);

  return (
    <section className={shared.section} aria-labelledby="results-title">
      <h2 id="results-title" className="visually-hidden">
        Результати пошуку
      </h2>
      <p className={styles.summary} aria-live="polite">
        {pluralize(summary.institutions, FORMS.institution)} · {pluralize(summary.courses, FORMS.course)}
      </p>

      {items.length === 0 ? (
        <EmptyState
          title="Нічого не знайдено"
          text="Спробуйте змінити або скинути фільтри."
          action={<Button onClick={resetFilters}>Скинути фільтри</Button>}
        />
      ) : (
        <ul className={shared.list}>
          {items.map((item) => (
            <li key={item.id}>
              <Link to={linkTo(`/institutions/${item.id}`)} className={styles.item}>
                <SteamRing profile={item.steamProfile} size={44} dashed={item.status === 'pending'} />
                <span className={styles.body}>
                  <span className={styles.name}>{item.shortName}</span>
                  <span className={styles.meta}>
                    {labels.type[item.type]}
                    {item.distanceKm != null && ` · ${formatDistance(item.distanceKm)}`}
                  </span>
                  <span className={styles.meta}>
                    {courseFilters
                      ? `${item.matchedCourseCount} з ${item.courseCount} курсів підходять`
                      : pluralize(item.courseCount, FORMS.course)}
                  </span>
                </span>
                <span className={styles.badges}>
                  {item.status === 'pending' && <Badge tone="warning">На модерації</Badge>}
                  {highlightedIds.includes(item.id) && <Badge tone="info">Рекомендовано</Badge>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className={shared.notice}>{dataNotice}</p>
    </section>
  );
}
