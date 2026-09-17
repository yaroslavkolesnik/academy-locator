import { X } from 'lucide-react';
import styles from './Chip.module.css';

export function Chip({ pressed, color, onToggle, removable = false, children }) {
  return (
    <button
      type="button"
      className={styles.chip}
      aria-pressed={pressed}
      onClick={onToggle}
      style={color ? { '--chip-color': color } : undefined}
    >
      {color && <span className={styles.dot} aria-hidden="true" />}
      <span>{children}</span>
      {removable && <X aria-hidden="true" size={14} />}
    </button>
  );
}
