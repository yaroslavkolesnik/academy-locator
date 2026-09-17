---
name: mongo-ops
description: Working with MongoDB Atlas for Academy Locator — Mongo tests, throwaway databases, npm run seed and --reset, auto-seeding, and the local "store: memory" / querySrv ECONNREFUSED issue. Use before running anything against the database from .env, before seeding, or when the server unexpectedly uses MemoryStore.
---

# MongoDB operations

## Databases

| Database | Who uses it | Safe to wipe |
|---|---|---|
| `academy_locator` (`MONGODB_DB` default) | the user's real demo data (registrations, submissions) | **no** — only when the user explicitly asks |
| `academy_locator_test` | `tests/store/mongoStore.test.js` | dropped by the tests |
| `academy_locator_seedtest` | `tests/store/mongoSetup.test.js` | dropped by the tests |
| `academy_locator_smoke` (or any `*_smoke`) | your manual end-to-end checks | drop when done |

Do not read or print `.env`; the URI contains credentials. Load it with `node --env-file=.env` or `dotenv`.
Never echo `mongodb+srv://` strings in output — filter them (`grep -v '://'`).

## Seeding

- **On server start** `mongoSetup.js#autoSeed` fills only empty `institutions` / `courses` collections.
  A fresh cluster needs no manual seeding.
- `npm run seed` (sync): replaces seed institutions and courses from JSON **including `seatsLeft`**, deletes
  seed records that left the JSON, keeps submissions and registrations. Seats can then disagree with existing
  registrations — mention this to the user.
- `npm run seed -- --reset`: deletes all institutions, courses **and registrations**, then reseeds.
  Run it only with an explicit throwaway database, e.g. `MONGODB_DB=academy_locator_smoke npm run seed -- --reset`.
  Against `academy_locator` only when the user asks for it in this conversation (typically right before a demo).

## Tests against Atlas

```bash
npm run test:mongo                                    # everything, with .env
node --env-file=.env --test tests/store/mongoStore.test.js
```

The contract suite reconnects and drops its DB per test, ~2 s each over the network (~35 s total). Test files
run in parallel, so each Mongo test file uses its own database name.

## End-to-end against Mongo

```bash
MONGODB_DB=academy_locator_smoke ADMIN_TOKEN=smoke-token PORT=3998 node src/server.js
```

Then skill `verify-api`. Restart the server once to confirm data persisted. Drop the database afterwards:

```bash
node --env-file=.env -e "const {MongoClient}=require('mongodb');(async()=>{const c=new MongoClient(process.env.MONGODB_URI);await c.connect();console.log(await c.db('academy_locator_smoke').dropDatabase());await c.close()})()"
```

## "store: memory" locally / `querySrv ECONNREFUSED`

On this Windows machine Node's resolver uses `127.0.0.1`, which refuses SRV lookups, so `mongodb+srv://`
fails and `createStore` falls back to MemoryStore with a warning. `nslookup` and 8.8.8.8 resolve fine; Render
is unaffected. It is not a code bug — do not change project code. For a local run, preload a public resolver:

```bash
node --env-file=.env --import "file:///<abs path>/.claude/skills/mongo-ops/dns-preload.mjs" --test
NODE_OPTIONS="--import=file:///<abs path>/.claude/skills/mongo-ops/dns-preload.mjs" node src/server.js
```

Background: `docs/tech/2026-09-17-local-mongodb-srv-dns.md`.

If it fails on Render too, the cause is different: check Atlas **Network Access** (`0.0.0.0/0`) and the URI.
