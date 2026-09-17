import { SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { FORMS, pluralize } from '../lib/format.js';
import { countActive } from '../state/filters.js';
import { useMapState } from '../state/MapProvider.jsx';
import { useFilters } from '../state/useFilters.js';
import { Button } from '../ui/Button.jsx';
import { Dialog } from '../ui/Dialog.jsx';
import { IconButton } from '../ui/IconButton.jsx';
import styles from './FiltersDialogButton.module.css';
import { FiltersForm } from './FiltersForm.jsx';

export function FiltersDialogButton() {
  const { filters, setFilters, resetFilters } = useFilters();
  const { markers } = useMapState();
  const [open, setOpen] = useState(false);
  const count = countActive(filters) - (filters.q ? 1 : 0);
  const summary = markers.data?.summary;

  return (
    <>
      <span className={styles.wrapper}>
        <IconButton
          label={count > 0 ? `Фільтри, активних: ${count}` : 'Фільтри'}
          icon={SlidersHorizontal}
          onClick={() => setOpen(true)}
        />
        {count > 0 && (
          <span className={styles.count} aria-hidden="true">
            {count}
          </span>
        )}
      </span>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Фільтри"
        footer={
          <>
            {count > 0 && (
              <Button variant="ghost" onClick={resetFilters}>
                Скинути
              </Button>
            )}
            <Button onClick={() => setOpen(false)}>
              {summary ? `Показати ${pluralize(summary.institutions, FORMS.institution)}` : 'Показати'}
            </Button>
          </>
        }
      >
        <FiltersForm filters={filters} onChange={setFilters} />
      </Dialog>
    </>
  );
}
