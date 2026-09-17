import styles from './Skeleton.module.css';

export function Skeleton({ lines = 3, slow = false }) {
  return (
    <div className={styles.wrapper} aria-busy="true">
      <p className="visually-hidden" role="status">
        Завантаження…
      </p>
      {slow && (
        <p className={styles.slow} role="status">
          Прокидаємо сервер, це може зайняти до хвилини…
        </p>
      )}
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className={styles.card}>
          <span className={styles.lineWide} />
          <span className={styles.line} />
        </div>
      ))}
    </div>
  );
}
