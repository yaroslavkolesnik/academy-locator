import { Building2, CalendarDays, Monitor, MonitorSmartphone, Users, Wallet } from 'lucide-react';
import { Link } from 'react-router';
import { formatAge, formatDate, formatPrice, seatsLabel } from '../lib/format.js';
import { useMeta } from '../state/MetaProvider.jsx';
import { Badge } from '../ui/Badge.jsx';
import styles from './CourseCard.module.css';

const FORMAT_ICONS = { offline: Building2, online: Monitor, hybrid: MonitorSmartphone };

export function CourseCard({ course, to }) {
  const { labels } = useMeta();
  const FormatIcon = FORMAT_ICONS[course.format] ?? Building2;
  const lowSeats = course.seatsLeft !== null && course.seatsLeft <= 5;
  const mismatch = course.matchesFilters === false;

  return (
    <Link to={to} className={`${styles.card} ${mismatch ? styles.muted : ''}`}>
      <span className={styles.top}>
        <span className={styles.title}>{course.title}</span>
        {lowSeats && <Badge tone={course.seatsLeft === 0 ? 'danger' : 'warning'}>{seatsLabel(course.seatsLeft)}</Badge>}
      </span>
      <span className={styles.description}>{course.shortDescription}</span>
      <span className={styles.facts}>
        <span>
          <Users aria-hidden="true" size={16} />
          {formatAge(course.ageMin, course.ageMax)}
        </span>
        <span>
          <FormatIcon aria-hidden="true" size={16} />
          {labels.format[course.format]}
        </span>
        <span>
          <Wallet aria-hidden="true" size={16} />
          {formatPrice(course.price, course.priceUnit)}
        </span>
        <span>
          <CalendarDays aria-hidden="true" size={16} />
          Старт {formatDate(course.startDate)}
        </span>
      </span>
      {mismatch && <span className="visually-hidden">Не відповідає обраним фільтрам</span>}
    </Link>
  );
}
