import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import styles from './BackLink.module.css';

export function BackLink({ to, children }) {
  return (
    <Link to={to} className={styles.back}>
      <ArrowLeft aria-hidden="true" size={18} />
      <span>{children}</span>
    </Link>
  );
}
