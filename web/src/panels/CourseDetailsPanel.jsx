import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useApi } from '../api/useApi.js';
import { RegistrationDialog } from '../forms/RegistrationDialog.jsx';
import { BackLink } from '../layout/BackLink.jsx';
import { formatAge, formatDate, formatPrice, seatsLabel } from '../lib/format.js';
import { useMapState, useSelectedInstitution } from '../state/MapProvider.jsx';
import { useMeta } from '../state/MetaProvider.jsx';
import { useLinkTo } from '../state/useFilters.js';
import { Button } from '../ui/Button.jsx';
import { ErrorState } from '../ui/ErrorState.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import styles from './CourseDetailsPanel.module.css';
import { NotFoundPanel } from './NotFoundPanel.jsx';
import shared from './Panels.module.css';

export function CourseDetailsPanel() {
  const { courseId } = useParams();
  const { labels, dataNotice } = useMeta();
  const { catalogVersion } = useMapState();
  const linkTo = useLinkTo();
  const [registerOpen, setRegisterOpen] = useState(false);

  const { data, error, slow, reload } = useApi(`/api/courses/${encodeURIComponent(courseId)}`, {
    refreshKey: catalogVersion,
  });
  useSelectedInstitution(data?.institution.id ?? null);

  if (error?.code === 'NOT_FOUND') return <NotFoundPanel title="Курс не знайдено" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <Skeleton lines={4} slow={slow} />;

  const { course, institution, direction, category } = data;
  const noSeats = course.seatsLeft === 0;
  const facts = [
    ['Вік', formatAge(course.ageMin, course.ageMax)],
    ['Формат', labels.format[course.format]],
    ['Рівень', labels.level[course.level]],
    ['Тривалість', course.durationText],
    ['Розклад', course.scheduleText],
    ['Старт', formatDate(course.startDate)],
    ['Вартість', formatPrice(course.price, course.priceUnit)],
    ['Місця', seatsLabel(course.seatsLeft) ?? 'Без обмежень'],
  ];

  return (
    <article className={shared.section} aria-labelledby="course-title">
      <BackLink to={linkTo(`/institutions/${institution.id}/${direction.slug}`)}>{direction.name}</BackLink>

      <div className={shared.stack}>
        <p className={shared.eyebrow}>
          <span className={shared.dot} style={{ '--dot-color': category?.color }} aria-hidden="true" />
          {category?.name}
        </p>
        <h2 id="course-title" className={shared.title}>
          {course.title}
        </h2>
        <Link to={linkTo(`/institutions/${institution.id}`)} className={styles.institution}>
          {institution.shortName}
        </Link>
      </div>

      <p>{course.shortDescription}</p>

      <dl className={styles.facts}>
        {facts.map(([label, value]) => (
          <div key={label} className={styles.fact}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <section className={shared.stack} aria-labelledby="course-about">
        <h3 id="course-about">Про курс</h3>
        <p>{course.description}</p>
      </section>
      <section className={shared.stack} aria-labelledby="course-audience">
        <h3 id="course-audience">Для кого</h3>
        <p>{course.audience}</p>
      </section>

      <p className={shared.notice}>{dataNotice}</p>

      <div className={styles.cta}>
        <Button onClick={() => setRegisterOpen(true)} disabled={noSeats} className={styles.ctaButton}>
          {noSeats ? 'Місць немає' : 'Зареєструватися'}
        </Button>
      </div>

      <RegistrationDialog
        course={course}
        institution={institution}
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onRegistered={reload}
      />
    </article>
  );
}
