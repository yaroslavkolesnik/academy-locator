import { SearchX } from 'lucide-react';
import styles from './EmptyState.module.css';

export function EmptyState({ title, text, action, icon: Icon = SearchX }) {
  return (
    <div className={styles.empty}>
      <Icon aria-hidden="true" size={32} className={styles.icon} />
      <h3 className={styles.title}>{title}</h3>
      {text && <p className={styles.text}>{text}</p>}
      {action}
    </div>
  );
}
