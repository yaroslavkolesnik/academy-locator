# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
It holds only rules and routing; domain knowledge lives in skills (`.claude/skills/`), loaded on demand.

## How to work here

- **Don't do it the hard way.** If logic branches or a fix needs a second fix, stop and propose the simpler path with its cost.
- **Check the routing table for a skill before writing code.**
- **Record what took work to find** in `docs/tech/YYYY-MM-DD-<topic>.md`, including investigations that ended in "there is no bug".
- **Evidence before "done":** run `npm test` and report pass/fail counts.

## Hard rules

1. **IMPORTANT: No code before an approved spec and plan.** New endpoint, feature, seed or behavior change: `/superpowers:brainstorming` → `docs/specs/YYYY-MM-DD-<topic>-design.md` → user approves → `docs/plans/YYYY-MM-DD-<topic>.md` (approach, files, verification) → user approves → code. These paths replace the superpowers defaults. Exempt: one-line fixes, docs-only edits.
2. **IMPORTANT: Never invent facts about real institutions.** Unverified values stay `null` (skill `seed-data`).
3. `src/services/` stays pure (no express, mongodb, fs or store imports). Response shapes go in `src/services/catalog.js`; enums and labels only in `src/validation/schemas.js`.
4. When the user splits work into phases, do only the current phase and end with their handoff line.

## Project

Academy Locator — MVP demo map of STEAM education in Kharkiv. Node.js ≥20 ESM, Express 4, Zod 3, MongoDB Atlas with in-memory fallback, Render. Frontend: React + Vite in `web/`, built into `public/` and served by the same Express app.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | server with `--watch`, reads `.env` |
| `npm test` | all tests; Mongo tests skip without `MONGODB_URI` |
| `node --test <file>` / `node --test --test-name-pattern="<name>"` | one file / by name |
| `npm run test:mongo` | adds Mongo tests against Atlas |
| `npm run dev:web` | Vite on :5173, proxies `/api` to `npm run dev` |
| `npm run test:web` / `npm run build` | frontend tests (Vitest) / build into `public/` |
| `npm run seed [-- --reset]` | read skill `mongo-ops` first |

## Where the knowledge lives

| Working on | Read |
|---|---|
| architecture, adding or changing an endpoint, filters, errors | skill `api-architecture` |
| anything under `web/`: panels, map, filters in URL, forms, browser checks | skill `frontend` |
| `data/seed/*.json` and tests tied to seed values | skill `seed-data` |
| running the server, end-to-end checks | skill `verify-api` |
| MongoDB Atlas, test DBs, seed, `"store":"memory"` locally | skill `mongo-ops` |
| Render, env vars, CSP and map tiles | skill `deploy-render` |
| approved designs; past investigations | `docs/specs/`; `docs/tech/` |
| map of this agent setup | `.claude/README.md` |

## Conventions

- English: this file, `.claude/**`, `docs/tech/**`. Ukrainian: user-facing strings, code comments, `README.md`, `docs/specs/**`, `docs/plans/**`.
- Quoted literals (error messages, seed values, test names) stay verbatim.
- `docs/specs|plans|tech/` are dated and never rewritten; `README.md` files are edited in place.
