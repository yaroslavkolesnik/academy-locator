import { SlidersHorizontal } from 'lucide-react';
import { useId, useState } from 'react';
import { countActive } from '../state/filters.js';
import { useFilters } from '../state/useFilters.js';
import { Button } from '../ui/Button.jsx';
import { FiltersForm } from './FiltersForm.jsx';
import styles from './FiltersPanel.module.css';

export function FiltersPanel() {
  const { filters, setFilters, resetFilters } = useFilters();
  const [open, setOpen] = useState(false);
  const regionId = useId();
  const count = countActive(filters) - (filters.q ? 1 : 0);

  return (
    <div className={styles.filters}>
      <div className={styles.bar}>
        <Button
          variant="secondary"
          size="sm"
          icon={SlidersHorizontal}
          aria-expanded={open}
          aria-controls={regionId}
          onClick={() => setOpen((v) => !v)}
        >
          {count > 0 ? `Фільтри · ${count}` : 'Фільтри'}
        </Button>
        {count > 0 && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Скинути
          </Button>
        )}
      </div>
      {open && (
        <div id={regionId} className={styles.region}>
          <FiltersForm filters={filters} onChange={setFilters} />
        </div>
      )}
    </div>
  );
}
