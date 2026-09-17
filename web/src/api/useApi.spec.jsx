import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { useApi } from './useApi.js';

const json = (body) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

describe('useApi', () => {
  test('завантажує дані', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ ok: 1 })));
    const { result } = renderHook(() => useApi('/api/meta'));
    await waitFor(() => expect(result.current.data).toEqual({ ok: 1 }));
    expect(result.current.loading).toBe(false);
  });

  test('enabled=false — без запиту', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useApi('/api/search/suggest', { enabled: false }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  test('зміна query скасовує попередній запит', async () => {
    const signals = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((url, init) => {
        signals.push(init.signal);
        return new Promise(() => {});
      }),
    );
    const { rerender } = renderHook(({ q }) => useApi('/api/institutions', { query: { q } }), {
      initialProps: { q: 'a' },
    });
    rerender({ q: 'ab' });
    await waitFor(() => expect(signals).toHaveLength(2));
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  test('slow=true, якщо відповідь довша за 3 с', () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    const { result } = renderHook(() => useApi('/api/meta'));
    expect(result.current.slow).toBe(false);
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.slow).toBe(true);
  });

  test('reload робить повторний запит; keepPreviousData зберігає дані під час нового запиту', async () => {
    let n = 0;
    vi.stubGlobal('fetch', vi.fn(async () => json({ n: ++n })));
    const { result, rerender } = renderHook(
      ({ q }) => useApi('/api/x', { query: { q }, keepPreviousData: true }),
      { initialProps: { q: '1' } },
    );
    await waitFor(() => expect(result.current.data).toEqual({ n: 1 }));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.data).toEqual({ n: 2 }));
    rerender({ q: '2' });
    expect(result.current.data).toEqual({ n: 2 });
    await waitFor(() => expect(result.current.data).toEqual({ n: 3 }));
  });

  test('без keepPreviousData зміна url скидає дані', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => json({ url })));
    const { result, rerender } = renderHook(({ id }) => useApi(`/api/institutions/${id}`), {
      initialProps: { id: 'a' },
    });
    await waitFor(() => expect(result.current.data).toEqual({ url: '/api/institutions/a' }));
    rerender({ id: 'b' });
    await waitFor(() => expect(result.current.data).toEqual({ url: '/api/institutions/b' }));
    expect(result.current.error).toBeNull();
  });
});
