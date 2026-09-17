import { FiltersPanel } from '../filters/FiltersPanel.jsx';
import { SearchBox } from '../search/SearchBox.jsx';
import { Brand } from './Brand.jsx';
import styles from './DesktopHeader.module.css';

export function DesktopHeader() {
  return (
    <div className={styles.header}>
      <Brand />
      <SearchBox />
      <FiltersPanel />
    </div>
  );
}
