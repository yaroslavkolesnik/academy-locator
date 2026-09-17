import { useId } from 'react';
import styles from './Checkbox.module.css';

export function Checkbox({ label, error, ...inputProps }) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={styles.wrapper}>
      <label htmlFor={id} className={styles.checkbox}>
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...inputProps}
        />
        <span>{label}</span>
      </label>
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
