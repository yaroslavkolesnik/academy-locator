import { toggleValue } from '../state/filters.js';
import { useMeta } from '../state/MetaProvider.jsx';
import { Chip } from '../ui/Chip.jsx';
import styles from './FiltersForm.module.css';

function FilterGroup({ title, children }) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{title}</legend>
      <div className={styles.chips}>{children}</div>
    </fieldset>
  );
}

export function FiltersForm({ filters, onChange }) {
  const { categories, ageGroups, priceOptions, formats, institutionTypes, directionBySlug } = useMeta();
  const toggle = (key, value) => onChange({ [key]: toggleValue(filters[key], value) });
  const single = (key, value) => onChange({ [key]: filters[key] === value ? '' : value });

  return (
    <div className={styles.form}>
      {filters.direction.length > 0 && (
        <FilterGroup title="Напрямки">
          {filters.direction.map((slug) => (
            <Chip key={slug} pressed removable onToggle={() => toggle('direction', slug)}>
              {directionBySlug[slug]?.name ?? slug}
            </Chip>
          ))}
        </FilterGroup>
      )}
      <FilterGroup title="Напрям STEAM">
        {categories.map((c) => (
          <Chip key={c.code} color={c.color} pressed={filters.category.includes(c.code)} onToggle={() => toggle('category', c.code)}>
            {c.name}
          </Chip>
        ))}
      </FilterGroup>
      <FilterGroup title="Вік">
        {ageGroups.map((g) => (
          <Chip key={g.id} pressed={filters.age === g.id} onToggle={() => single('age', g.id)}>
            {g.name}
          </Chip>
        ))}
      </FilterGroup>
      <FilterGroup title="Вартість">
        {priceOptions.map((p) => (
          <Chip key={p.id} pressed={filters.price === p.id} onToggle={() => single('price', p.id)}>
            {p.name}
          </Chip>
        ))}
      </FilterGroup>
      <FilterGroup title="Формат">
        {formats.map((f) => (
          <Chip key={f.id} pressed={filters.format.includes(f.id)} onToggle={() => toggle('format', f.id)}>
            {f.name}
          </Chip>
        ))}
      </FilterGroup>
      <FilterGroup title="Тип закладу">
        {institutionTypes.map((t) => (
          <Chip key={t.id} pressed={filters.type.includes(t.id)} onToggle={() => toggle('type', t.id)}>
            {t.name}
          </Chip>
        ))}
      </FilterGroup>
    </div>
  );
}
