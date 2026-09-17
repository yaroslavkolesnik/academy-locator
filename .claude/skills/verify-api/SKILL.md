---
name: verify-api
description: Run the Academy Locator server locally and verify endpoints end to end (demo flow, registrations, submissions, admin). Use before reporting a user-visible API change as done, after changing app.js or middleware, or when asked to run, start or smoke-test the API.
---

# Verify the API end to end

`npm test` covers logic. This skill checks the real process: env loading, middleware order, headers, persistence.

## 1. Start the server on a spare port

Use a port other than the user's `PORT` so their dev server keeps running. Empty `MONGODB_URI` forces
MemoryStore (dotenv does not override variables that are already set, even empty ones):

```bash
PORT=3999 MONGODB_URI= ADMIN_TOKEN=smoke-token node src/server.js
```

Run it in the background, then poll `http://localhost:3999/api/health` until it answers
(do not sleep blindly). The log line must show `store: memory` (or `mongo` if intended).

To verify against MongoDB instead, use a throwaway database — see skill `mongo-ops`.

## 2. Run the smoke script

```bash
node .claude/skills/verify-api/smoke.mjs http://localhost:3999 smoke-token
```

It walks the demo flow with Node `fetch` and prints PASS/FAIL per step, exiting 1 on any failure:
health → meta → quiz → filtered markers → card → direction courses → course → suggest → recommendations
(Olena scenario) → registrations until 409 → 400 validation → submission (pending, no `contactPerson`) →
admin 401 without token → admin list → approve → registrations list.

It mutates state (seats, submissions), so run it against a fresh MemoryStore or a throwaway Mongo DB,
never against the user's `academy_locator` database.

Ad-hoc requests: use Node `fetch` too. **curl from Git Bash on Windows corrupts Cyrillic** in `-d` bodies and
query strings, which looks like a server encoding bug but is not.

## 3. Stop the server

On Windows a background `node` is not stopped by closing the shell. Kill by port:

```bash
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3999 -State Listen | % { Stop-Process -Id $_.OwningProcess -Force }"
```

## 4. Report

State which store was used, the PASS/FAIL summary, and any header checks you did
(`Content-Encoding: gzip`, `RateLimit`, `X-Content-Type-Options: nosniff`).
