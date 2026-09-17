import { BookOpen } from 'lucide-react';
import { useParams } from 'react-router';
import { useApi } from '../api/useApi.js';
import { BackLink } from '../layout/BackLink.jsx';
import { toApiQuery } from '../state/filters.js';
import { useMapState, useSelectedInstitution } from '../state/MapProvider.jsx';
import { useMeta } from '../state/MetaProvider.jsx';
import { useLinkTo } from '../state/useFilters.js';
import { EmptyState } from '../ui/EmptyState.jsx';
import { ErrorState } from '../ui/ErrorState.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import { CourseCard } from './CourseCard.jsx';
import { NotFoundPanel } from './NotFoundPanel.jsx';
import shared from './Panels.module.css';

export function DirectionCoursesPanel() {
  const { id, slug } = useParams();
  const meta = useMeta();
  const { filters, catalogVersion } = useMapState();
  const linkTo = useLinkTo();
  useSelectedInstitution(id);

  const { data, error, slow, reload } = useApi(
    `/api/institutions/${encodeURIComponent(id)}/directions/${encodeURIComponent(slug)}/courses`,
    { query: toApiQuery(filters, meta, null), refreshKey: catalogVersion },
  );

  if (error?.code === 'NOT_FOUND') {
    return <NotFoundPanel title={error.message === 'Заклад не знайдено' ? 'Заклад не знайдено' : 'Напрямок не знайдено'} />;
  }
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <Skeleton lines={3} slow={slow} />;

  const { institution, direction, items } = data;
  const category = meta.categoryByCode[direction.categoryCode];

  return (
    <section className={shared.section} aria-labelledby="direction-title">
      <BackLink to={linkTo(`/institutions/${institution.id}`)}>{institution.shortName}</BackLink>
      <div className={shared.stack}>
        <p className={shared.eyebrow}>
          <span className={shared.dot} style={{ '--dot-color': category?.color }} aria-hidden="true" />
          {category?.name}
        </p>
        <h2 id="direction-title" className={shared.title}>
          {direction.name}
        </h2>
        <p className={shared.muted}>{institution.name}</p>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={BookOpen} title="Курсів поки немає" text="Заклад ще не додав курси цього напрямку." />
      ) : (
        <ul className={shared.list}>
          {items.map((course) => (
            <li key={course.id}>
              <CourseCard course={course} to={linkTo(`/courses/${course.id}`)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
