# Agent infrastructure map

How Claude Code is set up for this repository. Living document — update it when skills or rules change.

## Instruction layers

Claude Code loads all of these at launch and stacks them:

| Level | File | Use it for |
|---|---|---|
| Managed policy | set by an organization | not configured |
| User | `~/.claude/CLAUDE.md` | personal preferences across all projects |
| Project | `CLAUDE.md` (committed) | rules and routing only, kept under ~3 KB |
| Local | `CLAUDE.local.md` (git-ignored) | personal notes for this repo, e.g. decisions for a private branch |

`CLAUDE.md` is guidance, not enforcement: each line competes for attention. Before adding a rule, ask whether
it belongs in a skill (domain knowledge, procedures) or a hook (must never be broken). Write rules that are
specific and checkable, name the replacement instead of only banning, and keep `IMPORTANT` for two or three rules.
When the agent gets something wrong, fix the rule or the skill rather than only the code.

## Skills (`.claude/skills/`)

| Skill | Covers | Bundled scripts |
|---|---|---|
| `api-architecture` | layers, store contract, filters, errors, add-an-endpoint procedure | — |
| `seed-data` | real vs fictional data, verifying institutions, invariants, tests tied to seed | `check-seed.mjs` |
| `verify-api` | running the server on a spare port, end-to-end demo flow, stopping it on Windows | `smoke.mjs` |
| `mongo-ops` | databases, seed/reset, Mongo tests, local SRV DNS issue | `dns-preload.mjs` |
| `deploy-render` | render.yaml, env vars, Atlas network access, free tier, CSP for the frontend | — |

Candidates for later: a `frontend` skill (Leaflet map, consuming `/api/meta`, served from `public/`) once the
frontend design is approved.

## Documents

| Path | Kind | Language |
|---|---|---|
| `docs/specs/YYYY-MM-DD-<topic>-design.md` | approved designs, dated, never rewritten | Ukrainian |
| `docs/plans/YYYY-MM-DD-<topic>.md` | implementation plans, dated, never rewritten | Ukrainian |
| `docs/tech/YYYY-MM-DD-<topic>.md` | investigations and decisions that took work to find | English |
| `README.md` | how to run, API table, deploy steps — living | Ukrainian |

## Workflow

Spec → plan → code (CLAUDE.md hard rule 1), using the `superpowers` plugin skills (`brainstorming`,
`writing-plans`) with the paths above instead of their `docs/superpowers/` defaults.

## Hooks

None yet (decision 2026-09-17: revisit when the project grows). Candidates, in priority order:

1. Block reading or printing `.env` (Read/Edit and `cat`/`type` in Bash).
2. Block `seed --reset` when the command does not set `MONGODB_DB`.
3. Block writes to `src/services/*` that import express, mongodb, `node:fs` or `../store/`.
4. Stop hook: run `npm test` when `src/` or `tests/` changed and refuse to finish on failures.
