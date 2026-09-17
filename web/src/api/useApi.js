import { useCallback, useEffect, useRef, useState } from 'react';
import { buildUrl, request } from './client.js';

export const SLOW_MS = 3000;
const INITIAL = { data: null, error: null, loading: false, slow: false };

// Дані з API: скасування застарілих запитів, прапорець slow для холодного старту Render
export function useApi(path, { query, enabled = true, headers, refreshKey, keepPreviousData = false } = {}) {
  const url = enabled && path ? buildUrl(path, query) : null;
  const headersKey = headers ? JSON.stringify(headers) : '';
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState(() => (url ? { ...INITIAL, loading: true } : INITIAL));
  const lastUrl = useRef(url);

  useEffect(() => {
    if (!url) {
      lastUrl.current = null;
      setState(INITIAL);
      return undefined;
    }

    const urlChanged = lastUrl.current !== url;
    lastUrl.current = url;
    setState((prev) =>
      urlChanged && !keepPreviousData ? { ...INITIAL, loading: true } : { ...prev, loading: true, error: null, slow: false },
    );

    const controller = new AbortController();
    const timer = setTimeout(() => setState((prev) => ({ ...prev, slow: true })), SLOW_MS);

    request(url, { signal: controller.signal, headers: headersKey ? JSON.parse(headersKey) : undefined })
      .then((data) => setState({ data, error: null, loading: false, slow: false }))
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        setState((prev) => ({ ...prev, error, loading: false, slow: false }));
      })
      .finally(() => clearTimeout(timer));

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [url, headersKey, nonce, refreshKey, keepPreviousData]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}
