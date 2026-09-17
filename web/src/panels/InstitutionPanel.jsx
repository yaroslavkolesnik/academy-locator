import { ChevronRight, Globe, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { useApi } from '../api/useApi.js';
import { BackLink } from '../layout/BackLink.jsx';
import { displayHost, FORMS, pluralize } from '../lib/format.js';
import { SteamLegend, SteamRing } from '../map/SteamRing.jsx';
import { hasCourseFilters, toApiQuery } from '../state/filters.js';
import { useMapState, useSelectedInstitution } from '../state/MapProvider.jsx';
import { useMeta } from '../state/MetaProvider.jsx';
import { useLinkTo } from '../state/useFilters.js';
import { Badge } from '../ui/Badge.jsx';
import { ErrorState } from '../ui/ErrorState.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import styles from './InstitutionPanel.module.css';
import { NotFoundPanel } from './NotFoundPanel.jsx';
import shared from './Panels.module.css';

function directionStatus(direction, courseFilters) {
  if (direction.courseCount === 0) return 'Курси ще не додані';
  if (courseFilters) return `${direction.matchedCourseCount} з ${direction.courseCount} курсів підходять`;
  return pluralize(direction.courseCount, FORMS.course);
}

export function InstitutionPanel() {
  const { id } = useParams();
  const meta = useMeta();
  const { filters, catalogVersion } = useMapState();
  const linkTo = useLinkTo();
  useSelectedInstitution(id);

  const { data, error, slow, reload } = useApi(`/api/institutions/${encodeURIComponent(id)}`, {
    query: toApiQuery(filters, meta, null),
    refreshKey: catalogVersion,
  });

  if (error?.code === 'NOT_FOUND') {
    return <NotFoundPanel title="Заклад не знайдено" text="Можливо, його ще не схвалили або посилання застаріло." />;
  }
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <Skeleton lines={3} slow={slow} />;

  const { institution, directions } = data;
  const courseFilters = hasCourseFilters(filters);
  const pending = institution.status === 'pending';

  return (
    <article className={shared.section} aria-labelledby="institution-title">
      <BackLink to={linkTo('/')}>До результатів</BackLink>

      <header className={styles.header}>
        <SteamRing profile={institution.steamProfile} size={64} stroke={9} dashed={pending} />
        <div className={shared.stack}>
          <p className={shared.eyebrow}>{meta.labels.type[institution.type]}</p>
          <h2 id="institution-title" className={shared.title}>
            {institution.name}
          </h2>
        </div>
      </header>

      {pending && (
        <p className={styles.pending}>
          <Badge tone="warning">На модерації</Badge>
          <span>Інформацію про заклад ще перевіряє модератор.</span>
        </p>
      )}

      <SteamLegend profile={institution.steamProfile} />
      {institution.shortDescription && <p>{institution.shortDescription}</p>}

      <ul className={styles.contacts}>
        <li>
          <MapPin aria-hidden="true" size={18} />
          <span>{institution.address}</span>
        </li>
        {institution.website && (
          <li>
            <Globe aria-hidden="true" size={18} />
            <a href={institution.website} target="_blank" rel="noopener noreferrer">
              {displayHost(institution.website)}
            </a>
          </li>
        )}
        {institution.phone && (
          <li>
            <Phone aria-hidden="true" size={18} />
            <a href={`tel:${institution.phone}`}>{institution.phone}</a>
          </li>
        )}
        {institution.email && (
          <li>
            <Mail aria-hidden="true" size={18} />
            <a href={`mailto:${institution.email}`}>{institution.email}</a>
          </li>
        )}
        {institution.hasShelter === true && (
          <li>
            <ShieldCheck aria-hidden="true" size={18} />
            <span>Є укриття</span>
          </li>
        )}
      </ul>

      {institution.description && <p className={shared.muted}>{institution.description}</p>}

      <section className={shared.stack} aria-labelledby="directions-title">
        <h3 id="directions-title">Напрямки</h3>
        {directions.length === 0 ? (
          <p className={shared.muted}>Заклад ще не вказав напрямки.</p>
        ) : (
          <ul className={shared.list}>
            {directions.map((direction) => {
              const category = meta.categoryByCode[direction.categoryCode];
              const hasCourses = direction.courseCount > 0;
              const muted = !hasCourses || (courseFilters && direction.matchedCourseCount === 0);
              const content = (
                <>
                  <span className={styles.bar} style={{ background: category?.color }} aria-hidden="true" />
                  <span className={styles.directionBody}>
                    <span className={styles.directionName}>{direction.name}</span>
                    <span className={styles.directionMeta}>
                      {category?.name} · {directionStatus(direction, courseFilters)}
                    </span>
                  </span>
                  {hasCourses && <ChevronRight aria-hidden="true" size={20} />}
                </>
              );
              return (
                <li key={direction.slug}>
                  {hasCourses ? (
                    <Link
                      to={linkTo(`/institutions/${institution.id}/${direction.slug}`)}
                      className={`${styles.direction} ${muted ? styles.muted : ''}`}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className={`${styles.direction} ${styles.muted}`}>{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </article>
  );
}
