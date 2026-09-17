import styles from './Brand.module.css';

export function Brand({ compact = false }) {
  return (
    <div className={styles.brand}>
      <img src="/favicon.svg" alt="" width={compact ? 28 : 36} height={compact ? 28 : 36} />
      <div>
        <p className={styles.name}>Academy Locator</p>
        {!compact && <p className={styles.tagline}>STEAM-освіта Харкова</p>}
      </div>
    </div>
  );
}
