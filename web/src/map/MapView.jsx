import 'leaflet/dist/leaflet.css';
import './markers.css';
import { useEffect } from 'react';
import { CircleMarker, MapContainer, Marker, TileLayer, useMap, useMapEvents, ZoomControl } from 'react-leaflet';
import { useLocation, useNavigate } from 'react-router';
import { prefersReducedMotion } from '../lib/reducedMotion.js';
import { DESKTOP_QUERY, useMediaQuery } from '../lib/useMediaQuery.js';
import { useMapState } from '../state/MapProvider.jsx';
import { useMeta } from '../state/MetaProvider.jsx';
import { focusOffset, roundCoord } from './geo.js';
import { institutionIcon, markerLabel, pickIcon } from './markers.js';
import styles from './MapView.module.css';

// Тайли OSM без ключа (CARTO тепер вимагає API-ключ). Кольори приглушує CSS-фільтр у MapView.module.css,
// щоб STEAM-мітки лишались головним акцентом.
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const USER_DOT = { color: '#ffffff', weight: 3, fillColor: '#2563EB', fillOpacity: 1 };

export function MapView() {
  const { city, colorByCode } = useMeta();
  const { markers, filters, selectedId, highlightedIds, pickMode, pickPoint, setPickPoint, userLocation } = useMapState();
  const navigate = useNavigate();
  const { search } = useLocation();
  const items = markers.data?.items ?? [];
  const { south, west, north, east } = city.bounds;

  return (
    <MapContainer
      className={styles.map}
      center={[city.center.lat, city.center.lng]}
      zoom={city.zoom}
      minZoom={11}
      maxZoom={18}
      maxBounds={[
        [south - 0.15, west - 0.25],
        [north + 0.15, east + 0.25],
      ]}
      maxBoundsViscosity={0.8}
      zoomControl={false}
    >
      <TileLayer url={TILE_URL} attribution={ATTRIBUTION} maxZoom={19} />
      <ZoomControl position="bottomright" />
      {items.map((marker) => {
        const selected = marker.id === selectedId;
        const highlighted = highlightedIds.includes(marker.id);
        return (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            title={marker.shortName}
            alt={marker.shortName}
            keyboard={false}
            interactive={!pickMode}
            opacity={pickMode ? 0.5 : 1}
            zIndexOffset={selected ? 1000 : highlighted ? 500 : 0}
            icon={institutionIcon(marker, { colorByCode, label: markerLabel(marker, filters), selected, highlighted })}
            eventHandlers={{ click: () => navigate({ pathname: `/institutions/${marker.id}`, search }) }}
          />
        );
      })}
      {userLocation && <CircleMarker center={[userLocation.lat, userLocation.lng]} radius={8} pathOptions={USER_DOT} />}
      <FocusOn point={items.find((m) => m.id === selectedId)} />
      <FocusOn point={filters.near ? userLocation : null} minZoom={14} />
      {pickMode && <PickLayer point={pickPoint} onPick={setPickPoint} />}
    </MapContainer>
  );
}

function FocusOn({ point, minZoom = 15 }) {
  const map = useMap();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const lat = point?.lat;
  const lng = point?.lng;

  useEffect(() => {
    if (lat == null || lng == null) return;
    const zoom = Math.max(map.getZoom(), minZoom);
    const [dx, dy] = focusOffset({ isDesktop, height: map.getSize().y });
    const target = map.unproject(map.project([lat, lng], zoom).add([dx, dy]), zoom);
    if (prefersReducedMotion()) map.setView(target, zoom);
    else map.flyTo(target, zoom, { duration: 0.6 });
  }, [lat, lng, isDesktop, map, minZoom]);

  return null;
}

function PickLayer({ point, onPick }) {
  useMapEvents({
    click: (event) => onPick({ lat: roundCoord(event.latlng.lat), lng: roundCoord(event.latlng.lng) }),
  });
  if (!point) return null;
  return (
    <Marker
      position={[point.lat, point.lng]}
      icon={pickIcon}
      draggable
      keyboard={false}
      eventHandlers={{
        dragend: (event) => {
          const { lat, lng } = event.target.getLatLng();
          onPick({ lat: roundCoord(lat), lng: roundCoord(lng) });
        },
      }}
    />
  );
}
