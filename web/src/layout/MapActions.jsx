import { Plus, Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import { DESKTOP_QUERY, useMediaQuery } from '../lib/useMediaQuery.js';
import { useLinkTo } from '../state/useFilters.js';
import { Button } from '../ui/Button.jsx';
import { IconLink } from '../ui/IconLink.jsx';
import styles from './MapActions.module.css';

export function MapActions() {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const linkTo = useLinkTo();

  if (!isDesktop) {
    return (
      <>
        <IconLink to={linkTo('/quiz')} label="Підібрати курс" icon={Sparkles} />
        <IconLink to={linkTo('/add')} label="Додати заклад" icon={Plus} variant="primary" />
      </>
    );
  }

  return (
    <div className={styles.actions}>
      <Button as={Link} to={linkTo('/quiz')} variant="secondary" icon={Sparkles}>
        Підібрати курс
      </Button>
      <Button as={Link} to={linkTo('/add')} icon={Plus}>
        Додати заклад
      </Button>
    </div>
  );
}
