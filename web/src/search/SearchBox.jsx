import { Search, X } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApi } from '../api/useApi.js';
import { useDebouncedValue } from '../lib/useDebouncedValue.js';
import { filtersToSearchString } from '../state/filters.js';
import { useMeta } from '../state/MetaProvider.jsx';
import { useFilters } from '../state/useFilters.js';
import styles from './SearchBox.module.css';
import { flattenSuggestions, GROUP_LABELS, suggestionTarget } from './suggestions.js';

export function SearchBox() {
  const { filters } = useFilters();
  const { colorByCode } = useMeta();
  const navigate = useNavigate();
  const inputId = useId();
  const listId = useId();
  const [text, setText] = useState(filters.q);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  useEffect(() => setText(filters.q), [filters.q]);

  const query = useDebouncedValue(text.trim(), 200);
  const { data } = useApi('/api/search/suggest', { query: { q: query }, enabled: open && query.length >= 2 });
  const options = useMemo(() => (open && query.length >= 2 ? flattenSuggestions(data) : []), [data, open, query]);
  const expanded = options.length > 0;

  const go = (pathname, nextFilters) => {
    setOpen(false);
    setActive(-1);
    navigate({ pathname, search: filtersToSearchString(nextFilters) });
  };

  const choose = (option) => {
    const target = suggestionTarget(option, filters);
    if (option.kind === 'direction') setText('');
    go(target.pathname, target.filters);
  };

  const onSubmit = (event) => {
    event.preventDefault();
    if (active >= 0 && options[active]) return choose(options[active]);
    go('/', { ...filters, q: text.trim() });
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown' && expanded) {
      event.preventDefault();
      setActive((i) => (i + 1) % options.length);
    } else if (event.key === 'ArrowUp' && expanded) {
      event.preventDefault();
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (event.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  };

  const clear = () => {
    setText('');
    if (filters.q) go('/', { ...filters, q: '' });
  };

  return (
    <form role="search" className={styles.search} onSubmit={onSubmit}>
      <label htmlFor={inputId} className="visually-hidden">
        Пошук
      </label>
      <Search aria-hidden="true" size={18} className={styles.icon} />
      <input
        id={inputId}
        type="search"
        role="combobox"
        autoComplete="off"
        enterKeyHint="search"
        placeholder="Робототехніка, 3D, заклад…"
        className={styles.input}
        value={text}
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(event) => {
          setText(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
      />
      {text && (
        <button type="button" className={styles.clear} aria-label="Очистити пошук" onClick={clear}>
          <X aria-hidden="true" size={16} />
        </button>
      )}
      {expanded && (
        <ul id={listId} role="listbox" className={styles.listbox}>
          {options.map((option, index) => {
            const groupStart = index === 0 || options[index - 1].kind !== option.kind;
            return [
              groupStart && (
                <li key={`group-${option.kind}`} role="presentation" className={styles.group}>
                  {GROUP_LABELS[option.kind]}
                </li>
              ),
              <li
                key={`${option.kind}-${option.id}`}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                className={styles.option}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
              >
                {option.categoryCode && (
                  <span className={styles.dot} style={{ background: colorByCode[option.categoryCode] }} aria-hidden="true" />
                )}
                <span className={styles.optionText}>
                  <span>{option.label}</span>
                  {option.sublabel && <span className={styles.sublabel}>{option.sublabel}</span>}
                </span>
              </li>,
            ];
          })}
        </ul>
      )}
    </form>
  );
}
