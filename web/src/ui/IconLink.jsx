import { Link } from 'react-router';
import styles from './IconButton.module.css';

export function IconLink({ to, label, icon: Icon, variant = 'default' }) {
  return (
    <Link
      to={to}
      aria-label={label}
      title={label}
      className={`${styles.iconButton} ${variant === 'primary' ? styles.primary : ''}`}
    >
      <Icon aria-hidden="true" size={20} strokeWidth={2.2} />
    </Link>
  );
}
