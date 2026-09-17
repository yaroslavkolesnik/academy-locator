import { createContext, useContext, useMemo } from 'react';
import { useApi } from '../api/useApi.js';
import { Brand } from '../layout/Brand.jsx';
import { ErrorState } from '../ui/ErrorState.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';
import styles from './MetaProvider.module.css';

export const MetaContext = createContext(null);

const byKey = (list, key) => Object.fromEntries(list.map((item) => [item[key], item]));
const labelsOf = (list) => Object.fromEntries(list.map((item) => [item.id, item.name]));

export function buildMetaIndex(meta) {
  return {
    ...meta,
    categoryByCode: byKey(meta.categories, 'code'),
    directionBySlug: byKey(meta.directions, 'slug'),
    directionById: byKey(meta.directions, 'id'),
    colorByCode: Object.fromEntries(meta.categories.map((c) => [c.code, c.color])),
    labels: {
      type: labelsOf(meta.institutionTypes),
      format: labelsOf(meta.formats),
      level: labelsOf(meta.levels),
      price: labelsOf(meta.priceOptions),
    },
  };
}

export function MetaProvider({ children }) {
  const { data, error, slow, reload } = useApi('/api/meta');
  const value = useMemo(() => (data ? buildMetaIndex(data) : null), [data]);

  if (!value) {
    return (
      <main className={styles.boot}>
        <Brand />
        {error ? <ErrorState error={error} onRetry={reload} /> : <Skeleton lines={2} slow={slow} />}
      </main>
    );
  }
  return <MetaContext.Provider value={value}>{children}</MetaContext.Provider>;
}

export function useMeta() {
  const ctx = useContext(MetaContext);
  if (!ctx) throw new Error('useMeta must be used inside MetaProvider');
  return ctx;
}
