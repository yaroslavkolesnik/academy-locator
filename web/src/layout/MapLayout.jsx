import { Outlet } from 'react-router';
import { DESKTOP_QUERY, useMediaQuery } from '../lib/useMediaQuery.js';
import { LocationButton } from '../map/LocationButton.jsx';
import { MapView } from '../map/MapView.jsx';
import { MapProvider, useMapState } from '../state/MapProvider.jsx';
import { DesktopHeader } from './DesktopHeader.jsx';
import { MapActions } from './MapActions.jsx';
import styles from './MapLayout.module.css';
import { Panel } from './Panel.jsx';
import { TopBar } from './TopBar.jsx';

export function MapLayout() {
  return (
    <MapProvider>
      <MapScreen />
    </MapProvider>
  );
}

// Порядок у DOM = порядок Tab: пошук і панель → дії → карта. Розташування задає CSS, а не порядок.
function MapScreen() {
  const { pickMode } = useMapState();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  return (
    <div className={styles.layout} data-picking={pickMode || undefined}>
      {!isDesktop && <TopBar />}
      <Panel header={isDesktop ? <DesktopHeader /> : null}>
        <Outlet />
      </Panel>
      {isDesktop && <MapActions />}
      <div className={styles.mapControls}>
        <LocationButton compact={!isDesktop} />
        {!isDesktop && <MapActions />}
      </div>
      <div className={styles.map}>
        <MapView />
      </div>
    </div>
  );
}
