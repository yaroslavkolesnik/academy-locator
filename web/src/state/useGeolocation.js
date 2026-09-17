import { useCallback, useState } from 'react';

export function useGeolocation() {
  const [state, setState] = useState({ coords: null, status: 'idle' });

  const locate = useCallback(
    () =>
      new Promise((resolve) => {
        if (!navigator.geolocation) {
          setState({ coords: null, status: 'unsupported' });
          resolve(null);
          return;
        }
        setState((prev) => ({ ...prev, status: 'pending' }));
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
            setState({ coords, status: 'granted' });
            resolve(coords);
          },
          () => {
            setState({ coords: null, status: 'denied' });
            resolve(null);
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
        );
      }),
    [],
  );

  return { ...state, locate };
}
