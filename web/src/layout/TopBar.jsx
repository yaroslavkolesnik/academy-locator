import { FiltersDialogButton } from '../filters/FiltersDialogButton.jsx';
import { SearchBox } from '../search/SearchBox.jsx';
import styles from './TopBar.module.css';

export function TopBar() {
  return (
    <div className={styles.topBar}>
      <SearchBox />
      <FiltersDialogButton />
    </div>
  );
}
