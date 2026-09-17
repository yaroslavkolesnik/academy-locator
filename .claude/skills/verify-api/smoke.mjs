// End-to-end smoke test of a running Academy Locator server.
// Usage: node .claude/skills/verify-api/smoke.mjs [baseUrl=http://localhost:3999] [adminToken]
// Mutates state: run against a fresh MemoryStore or a throwaway MongoDB database.

const base = (process.argv[2] ?? 'http://localhost:3999').replace(/\/$/, '');
const adminToken = process.argv[3] ?? process.env.ADMIN_TOKEN ?? '';

let failed = 0;
const results = [];

async function call(method, path, { body, headers = {} } = {}) {
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // non-JSON body
  }
  return { status: res.status, json };
}

async function step(name, fn) {
  try {
    const detail = await fn();
    results.push(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
  } catch (err) {
    failed += 1;
    results.push(`FAIL  ${name} — ${err.message}`);
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

await step('GET /health', async () => {
  const r = await call('GET', '/health');
  expect(r.status === 200 && r.json.status === 'ok', `status ${r.status}`);
  return `store: ${r.json.store}`;
});

await step('GET /meta', async () => {
  const r = await call('GET', '/meta');
  expect(r.status === 200, `status ${r.status}`);
  expect(r.json.categories.length === 5 && r.json.directions.length > 0, 'reference data missing');
  return `${r.json.city.name}, ${r.json.directions.length} directions`;
});

await step('GET /quiz', async () => {
  const r = await call('GET', '/quiz');
  expect(r.status === 200 && r.json.questions.length > 0, `status ${r.status}`);
});

await step('GET /institutions?direction=robotics&ageFrom=10&ageTo=13', async () => {
  const r = await call('GET', '/institutions?direction=robotics&ageFrom=10&ageTo=13');
  expect(r.status === 200 && r.json.items.length > 0, `status ${r.status}, items ${r.json?.items?.length}`);
  return JSON.stringify(r.json.summary);
});

await step('GET /institutions/khpi', async () => {
  const r = await call('GET', '/institutions/khpi');
  expect(r.status === 200 && r.json.directions.length > 0, `status ${r.status}`);
});

await step('GET /institutions/khpi/directions/robotics/courses', async () => {
  const r = await call('GET', '/institutions/khpi/directions/robotics/courses');
  expect(r.status === 200 && r.json.items.length > 0, `status ${r.status}`);
});

await step('GET /courses/khpi-robotics-arduino', async () => {
  const r = await call('GET', '/courses/khpi-robotics-arduino');
  expect(r.status === 200 && r.json.course.title, `status ${r.status}`);
  return `seatsLeft ${r.json.course.seatsLeft}`;
});

await step('GET /search/suggest?q=робот (Cyrillic query)', async () => {
  const r = await call('GET', `/search/suggest?q=${encodeURIComponent('робот')}`);
  expect(r.status === 200 && r.json.directions.some((d) => d.slug === 'robotics'), `status ${r.status}`);
});

await step('POST /recommendations (Olena scenario)', async () => {
  const r = await call('POST', '/recommendations', {
    body: { age: 11, interests: ['robotics', '3d-modeling', 'electronics'], format: ['offline', 'hybrid'] },
  });
  expect(r.status === 200 && r.json.items.length > 0, `status ${r.status}`);
  return r.json.items.map((i) => i.course.id).join(', ');
});

await step('POST /courses/palace-lego/registrations until 409', async () => {
  const body = { name: 'Олена', contact: '+380501234567', participantAge: 8, consent: true };
  const statuses = [];
  for (let i = 0; i < 20; i += 1) {
    const r = await call('POST', '/courses/palace-lego/registrations', { body });
    statuses.push(r.status);
    if (r.status !== 201) {
      expect(r.status === 409 && r.json.error.code === 'NO_SEATS', `unexpected ${r.status}`);
      break;
    }
  }
  expect(statuses.at(-1) === 409, 'never reached NO_SEATS');
  return statuses.join(' ');
});

await step('POST registration without consent → 400', async () => {
  const r = await call('POST', '/courses/khpi-python-highschool/registrations', {
    body: { name: 'Олена', contact: 'olena@example.com', consent: false },
  });
  expect(r.status === 400 && r.json.error.code === 'VALIDATION_ERROR', `status ${r.status}`);
});

let submissionId;
await step('POST /institutions (submission)', async () => {
  const r = await call('POST', '/institutions', {
    body: {
      name: 'Школа робототехніки «Смоук»',
      type: 'private_school',
      address: 'вул. Пушкінська, 50, Харків',
      lat: 50.0021,
      lng: 36.2445,
      phone: '+380501112233',
      contactPerson: 'Ірина',
      declaredDirectionIds: ['robotics'],
    },
  });
  expect(r.status === 201 && r.json.institution.status === 'pending', `status ${r.status}`);
  expect(!('contactPerson' in r.json.institution), 'contactPerson leaked in public response');
  expect(r.json.institution.name.includes('Смоук'), 'Cyrillic not preserved');
  submissionId = r.json.institution.id;
});

await step('GET /admin/submissions without token → 401 or 404', async () => {
  const r = await call('GET', '/admin/submissions');
  expect([401, 404].includes(r.status), `status ${r.status}`);
  return r.status === 404 ? 'admin disabled (no ADMIN_TOKEN on server)' : 'protected';
});

if (adminToken) {
  const auth = { headers: { 'X-Admin-Token': adminToken } };

  await step('GET /admin/submissions', async () => {
    const r = await call('GET', '/admin/submissions', auth);
    expect(r.status === 200 && r.json.items.some((i) => i.id === submissionId), `status ${r.status}`);
  });

  await step('PATCH /admin/institutions/:id → approved', async () => {
    const r = await call('PATCH', `/admin/institutions/${submissionId}`, { ...auth, body: { status: 'approved' } });
    expect(r.status === 200 && r.json.institution.status === 'approved', `status ${r.status}`);
  });

  await step('GET /admin/registrations', async () => {
    const r = await call('GET', '/admin/registrations', auth);
    expect(r.status === 200 && r.json.items.length > 0, `status ${r.status}`);
    return `${r.json.items.length} registrations`;
  });
} else {
  results.push('SKIP  admin steps — pass the admin token as the 2nd argument');
}

console.log(results.join('\n'));
console.log(failed ? `\n${failed} step(s) failed` : '\nAll steps passed');
process.exit(failed ? 1 : 0);
