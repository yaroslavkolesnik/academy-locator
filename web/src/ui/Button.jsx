import styles from './Button.module.css';

export function Button({ as: Component = 'button', variant = 'primary', size = 'md', icon: Icon, children, className = '', ...props }) {
  const typeProps = Component === 'button' ? { type: props.type ?? 'button' } : {};
  return (
    <Component className={`${styles.button} ${styles[variant]} ${styles[size]} ${className}`} {...typeProps} {...props}>
      {Icon && <Icon aria-hidden="true" size={size === 'sm' ? 16 : 18} strokeWidth={2.2} />}
      {children && <span>{children}</span>}
    </Component>
  );
}
