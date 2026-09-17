import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { useGeolocation } from './useGeolocation.js';

const setGeolocation = (value) => Object.defineProperty(navigator, 'geolocation', { value, configurable: true });

afterEach(() => setGeolocation(undefined));

describe('useGeolocation', () => {
  test('успіх → coords і status granted', async () => {
    setGeolocation({ getCurrentPosition: (ok) => ok({ coords: { latitude: 50.004, longitude: 36.235 } }) });
    const { result } = renderHook(() => useGeolocation());
    let coords;
    await act(async () => {
      coords = await result.current.locate();
    });
    expect(coords).toEqual({ lat: 50.004, lng: 36.235 });
    expect(result.current).toMatchObject({ coords, status: 'granted' });
  });

  test('відмова → null і status denied', async () => {
    setGeolocation({ getCurrentPosition: (ok, fail) => fail({ code: 1 }) });
    const { result } = renderHook(() => useGeolocation());
    await act(async () => {
      expect(await result.current.locate()).toBeNull();
    });
    expect(result.current.status).toBe('denied');
  });

  test('браузер без геолокації → unsupported', async () => {
    const { result } = renderHook(() => useGeolocation());
    await act(async () => {
      expect(await result.current.locate()).toBeNull();
    });
    expect(result.current.status).toBe('unsupported');
  });
});
