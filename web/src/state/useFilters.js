import { useCallback, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { applyFiltersToSearch, EMPTY_FILTERS, parseFilters } from './filters.js';

export function useFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const setFilters = useCallback(
    (update) => {
      setSearchParams(
        (current) => {
          const prev = parseFilters(current);
          const next = typeof update === 'function' ? update(prev) : { ...prev, ...update };
          return applyFiltersToSearch(current, next);
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const resetFilters = useCallback(() => setFilters((prev) => ({ ...EMPTY_FILTERS, near: prev.near })), [setFilters]);

  return { filters, setFilters, resetFilters };
}

export function useLinkTo() {
  const { search } = useLocation();
  return useCallback((pathname) => ({ pathname, search }), [search]);
}
