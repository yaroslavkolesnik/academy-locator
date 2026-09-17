import { LoaderCircle, LocateFixed } from 'lucide-react';
import { useMapState } from '../state/MapProvider.jsx';
import styles from './LocationButton.module.css';

export function LocationButton({ compact = false }) {
  const { filters, geoStatus, enableNear, disableNear } = useMapState();
  const pending = geoStatus === 'pending';
  const Icon = pending ? LoaderCircle : LocateFixed;
  const label = pending ? 'Визначаємо місцезнаходження…' : 'Поруч зі мною';

  return (
    <button
      type="button"
      className={`${styles.locate} ${compact ? styles.compact : ''}`}
      aria-pressed={filters.near}
      aria-label={compact ? label : undefined}
      disabled={pending}
      onClick={filters.near ? disableNear : enableNear}
    >
      <Icon aria-hidden="true" size={20} className={pending ? styles.spin : undefined} />
      {!compact && <span>{label}</span>}
    </button>
  );
}
