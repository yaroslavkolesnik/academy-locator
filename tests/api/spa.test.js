import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeApp } from '../helpers/app.js';

let publicDir;
let emptyDir;

before(() => {
  publicDir = mkdtempSync(join(tmpdir(), 'al-public-'));
  writeFileSync(join(publicDir, 'index.html'), '<!doctype html><title>Academy Locator</title>');
  mkdirSync(join(publicDir, 'assets'));
  writeFileSync(join(publicDir, 'assets', 'app-abc123.js'), 'console.log(1)');
  emptyDir = mkdtempSync(join(tmpdir(), 'al-empty-'));
});

after(() => {
  rmSync(publicDir, { recursive: true, force: true });
  rmSync(emptyDir, { recursive: true, force: true });
});

describe('статика та SPA fallback', () => {
  test('/ віддає index.html без кешу', async () => {
    const { api } = makeApp({ publicDir });
    const res = await api.get('/').expect(200);
    assert.match(res.headers['content-type'], /text\/html/);
    assert.match(res.text, /Academy Locator/);
    assert.equal(res.headers['cache-control'], 'no-cache');
  });

  test('клієнтські маршрути віддають index.html', async () => {
    const { api } = makeApp({ publicDir });
    for (const path of ['/institutions/khpi', '/courses/khpi-robotics-arduino?age=10-13', '/admin', '/quiz']) {
      const res = await api.get(path).expect(200);
      assert.match(res.text, /Academy Locator/, path);
    }
  });

  test('хешовані assets кешуються назавжди', async () => {
    const { api } = makeApp({ publicDir });
    const res = await api.get('/assets/app-abc123.js').expect(200);
    assert.match(res.headers['content-type'], /javascript/);
    assert.match(res.headers['cache-control'], /immutable/);
  });

  test('відсутній файл з розширенням → 404, а не index.html', async () => {
    const { api } = makeApp({ publicDir });
    const res = await api.get('/assets/missing.js').expect(404);
    assert.doesNotMatch(res.text, /Academy Locator/);
  });

  test('/api не перехоплюється fallback', async () => {
    const { api } = makeApp({ publicDir });
    const res = await api.get('/api/nope').expect(404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
    await api.get('/api/health').expect(200);
  });

  test('без зібраного фронтенду клієнтський маршрут → 404', async () => {
    const { api } = makeApp({ publicDir: emptyDir });
    await api.get('/institutions/khpi').expect(404);
  });

  test('CSP дозволяє тайли OpenStreetMap і лише власні скрипти', async () => {
    const { api } = makeApp({ publicDir });
    const csp = (await api.get('/')).headers['content-security-policy'];
    assert.match(csp, /img-src 'self' data: https:\/\/tile\.openstreetmap\.org(;|$)/);
    assert.match(csp, /script-src 'self'(;|$)/);
  });

  test('Referrer-Policy передає лише origin: без Referer тайли OSM блокуються', async () => {
    const { api } = makeApp({ publicDir });
    const res = await api.get('/');
    assert.equal(res.headers['referrer-policy'], 'strict-origin-when-cross-origin');
  });
});
