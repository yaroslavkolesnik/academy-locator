import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { DESKTOP_QUERY, useMediaQuery } from '../lib/useMediaQuery.js';
import styles from './Panel.module.css';
import { cycleSnap, initialSnap, nextSnap } from './sheet.js';

const SheetContext = createContext({ snap: 'half', setSnap() {} });

export function Panel({ header, children }) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const { pathname } = useLocation();
  const [snap, setSnap] = useState(() => initialSnap(pathname));
  const dragStartY = useRef(null);
  const dragged = useRef(false);

  useEffect(() => {
    setSnap(initialSnap(pathname));
  }, [pathname]);

  const value = useMemo(() => ({ snap, setSnap }), [snap]);

  const onPointerDown = (event) => {
    dragStartY.current = event.clientY;
    dragged.current = false;
  };

  const onPointerUp = (event) => {
    if (dragStartY.current === null) return;
    const next = nextSnap(snap, event.clientY - dragStartY.current);
    dragStartY.current = null;
    if (next !== snap) {
      dragged.current = true;
      setSnap(next);
    }
  };

  const onHandleClick = () => {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    setSnap(cycleSnap(snap));
  };

  return (
    <SheetContext.Provider value={value}>
      <aside className={styles.panel} data-snap={isDesktop ? undefined : snap} aria-label="Панель">
        {!isDesktop && (
          <button
            type="button"
            className={styles.handle}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onClick={onHandleClick}
            aria-expanded={snap !== 'peek'}
            aria-label={snap === 'full' ? 'Згорнути панель' : 'Розгорнути панель'}
          >
            <span className={styles.grip} aria-hidden="true" />
          </button>
        )}
        {header && <div className={styles.header}>{header}</div>}
        <div className={styles.content}>{children}</div>
      </aside>
    </SheetContext.Provider>
  );
}

export function useSheet() {
  return useContext(SheetContext);
}
