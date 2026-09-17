import styles from './IconButton.module.css';

export function IconButton({ label, icon: Icon, className = '', ...props }) {
  return (
    <button type="button" aria-label={label} title={label} className={`${styles.iconButton} ${className}`} {...props}>
      <Icon aria-hidden="true" size={20} strokeWidth={2.2} />
    </button>
  );
}
