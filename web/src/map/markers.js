import L from 'leaflet';
import { hasCourseFilters } from '../state/filters.js';
import { initials, ringSvg } from './steamRing.js';

// Коли активні фільтри курсів, у центрі кільця — кількість відповідних курсів, інакше — ініціали
export function markerLabel(marker, filters) {
  return hasCourseFilters(filters) ? String(marker.matchedCourseCount) : initials(marker.shortName);
}

const iconCache = new Map();

export function institutionIcon(marker, { colorByCode, label, selected, highlighted }) {
  const pending = marker.status === 'pending';
  const size = selected ? 60 : 46;
  const key = [marker.id, JSON.stringify(marker.steamProfile), label, selected, highlighted, pending].join('|');
  if (!iconCache.has(key)) {
    const className = [
      'al-marker',
      selected && 'al-marker--selected',
      highlighted && 'al-marker--highlighted',
      pending && 'al-marker--pending',
    ]
      .filter(Boolean)
      .join(' ');
    iconCache.set(
      key,
      L.divIcon({
        html: ringSvg({ profile: marker.steamProfile, colorByCode, size, stroke: selected ? 8 : 6, dashed: pending, label }),
        className,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      }),
    );
  }
  return iconCache.get(key);
}

export const pickIcon = L.divIcon({
  html: '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48" aria-hidden="true"><path d="M18 46s16-15.2 16-28A16 16 0 0 0 2 18c0 12.8 16 28 16 28z" fill="#2563EB" stroke="#fff" stroke-width="3"/><circle cx="18" cy="18" r="6" fill="#fff"/></svg>',
  className: 'al-pick',
  iconSize: [36, 48],
  iconAnchor: [18, 46],
});
