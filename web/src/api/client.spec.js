import { describe, expect, test, vi } from 'vitest';
import { ApiError, buildUrl, request } from './client.js';

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('buildUrl', () => {
  test('пропускає порожні значення і кодує решту', () => {
    expect(buildUrl('/api/institutions', { q: '', category: 'T,E', ageFrom: 0, lat: undefined, near: null })).toBe(
      '/api/institutions?category=T%2CE&ageFrom=0',
    );
  });

  test('без параметрів повертає шлях', () => {
    expect(buildUrl('/api/meta')).toBe('/api/meta');
    expect(buildUrl('/api/meta', {})).toBe('/api/meta');
  });
});

describe('request', () => {
  test('GET повертає JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { status: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(request('/api/health')).resolves.toEqual({ status: 'ok' });
    expect(fetchMock.mock.calls[0][1].method).toBe('GET');
  });

  test('POST надсилає JSON-тіло та заголовки', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(201, { id: 'x' }));
    vi.stubGlobal('fetch', fetchMock);
    await request('/api/institutions', { method: 'POST', body: { name: 'Школа' }, headers: { 'X-Admin-Token': 't' } });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).toBe('{"name":"Школа"}');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.headers['X-Admin-Token']).toBe('t');
  });

  test('конверт помилки → ApiError з кодом, статусом і деталями', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        json(400, {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Некоректні дані форми',
            details: [{ path: 'name', message: 'Імʼя: обовʼязкове поле' }],
          },
        }),
      ),
    );
    const error = await request('/api/x', { method: 'POST', body: {} }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'VALIDATION_ERROR', status: 400, message: 'Некоректні дані форми' });
    expect(error.details).toHaveLength(1);
  });

  test('не-JSON відповідь з помилкою → INTERNAL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad Gateway', { status: 502 })));
    await expect(request('/api/x')).rejects.toMatchObject({ code: 'INTERNAL', status: 502 });
  });

  test('мережева помилка → NETWORK', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(request('/api/x')).rejects.toMatchObject({ code: 'NETWORK' });
  });

  test('скасування прокидається як AbortError', async () => {
    const abort = new DOMException('Aborted', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort));
    await expect(request('/api/x')).rejects.toBe(abort);
  });
});
