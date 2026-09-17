import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useMatch } from 'react-router';
import { useApi } from '../api/useApi.js';
import { useToast } from '../ui/Toast.jsx';
import { filtersToSearchString, toApiQuery } from './filters.js';
import { useMeta } from './MetaProvider.jsx';
import { useFilters } from './useFilters.js';
import { useGeolocation } from './useGeolocation.js';

const MapStateContext = createContext(null);
const GEO_DENIED_MESSAGE = 'Не вдалося визначити ваше місцезнаходження. Дозвольте доступ до геолокації в браузері.';

export function MapProvider({ children }) {
  const meta = useMeta();
  const { filters, setFilters } = useFilters();
  const toast = useToast();
  const geo = useGeolocation();
  const pickMode = Boolean(useMatch('/add'));

  const [selectedId, setSelectedId] = useState(null);
  const [highlight, setHighlight] = useState({ ids: [], key: null });
  const [pickPoint, setPickPoint] = useState(null);
  const [catalogVersion, setCatalogVersion] = useState(0);

  const enableNear = useCallback(async () => {
    const coords = geo.coords ?? (await geo.locate());
    if (coords) setFilters({ near: true });
    else {
      setFilters({ near: false });
      toast.show(GEO_DENIED_MESSAGE, { tone: 'danger' });
    }
    return coords;
  }, [geo.coords, geo.locate, setFilters, toast]);

  const disableNear = useCallback(() => setFilters({ near: false }), [setFilters]);

  // Посилання з near=1: визначаємо місцезнаходження один раз після відкриття
  const nearRequested = useRef(false);
  useEffect(() => {
    if (!filters.near || geo.coords || nearRequested.current) return;
    nearRequested.current = true;
    enableNear();
  }, [filters.near, geo.coords, enableNear]);

  const coords = filters.near ? geo.coords : null;
  const markers = useApi('/api/institutions', {
    query: toApiQuery(filters, meta, coords),
    keepPreviousData: true,
    refreshKey: catalogVersion,
  });

  const filtersKey = filtersToSearchString(filters);
  const highlightedIds = highlight.key === filtersKey ? highlight.ids : [];

  const showHighlight = useCallback((ids, forFilters) => {
    setHighlight({ ids, key: filtersToSearchString(forFilters) });
  }, []);

  const refreshCatalog = useCallback(() => setCatalogVersion((v) => v + 1), []);

  const value = useMemo(
    () => ({
      markers,
      filters,
      selectedId,
      setSelectedId,
      highlightedIds,
      showHighlight,
      pickMode,
      pickPoint,
      setPickPoint,
      userLocation: geo.coords,
      geoStatus: geo.status,
      locate: geo.locate,
      enableNear,
      disableNear,
      catalogVersion,
      refreshCatalog,
    }),
    [
      markers,
      filters,
      selectedId,
      highlightedIds,
      showHighlight,
      pickMode,
      pickPoint,
      geo.coords,
      geo.status,
      geo.locate,
      enableNear,
      disableNear,
      catalogVersion,
      refreshCatalog,
    ],
  );

  return <MapStateContext.Provider value={value}>{children}</MapStateContext.Provider>;
}

export function useMapState() {
  const ctx = useContext(MapStateContext);
  if (!ctx) throw new Error('useMapState must be used inside MapProvider');
  return ctx;
}

export function useSelectedInstitution(id) {
  const { setSelectedId } = useMapState();
  useEffect(() => {
    setSelectedId(id ?? null);
  }, [id, setSelectedId]);
}
