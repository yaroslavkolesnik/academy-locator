import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import styles from './Dialog.module.css';
import { IconButton } from './IconButton.jsx';

// Нативний <dialog>: фокус-пастка, Esc і backdrop дає браузер
export function Dialog({ open, onClose, title, children, footer, size = 'md' }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const requestClose = () => {
    if (open) onClose();
  };

  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${styles[size] ?? ''}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) requestClose();
      }}
    >
      <div className={styles.inner}>
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <IconButton label="Закрити" icon={X} onClick={requestClose} />
        </header>
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </dialog>
  );
}
