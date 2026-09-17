# Local MongoDB Atlas connection fails with `querySrv ECONNREFUSED` — no bug in the code

Date: 2026-09-17 · Outcome: environment issue, project code unchanged

## Symptom

Running the Mongo tests (`node --env-file=.env --test tests/store/mongoStore.test.js`) failed on every test:

```
Error: querySrv ECONNREFUSED _mongodb._tcp.<cluster>.mongodb.net
```

The server in the same situation silently used MemoryStore (`createStore` fallback) and `/api/health` reported
`"store":"memory"`.

## Investigation

1. `nslookup -type=SRV _mongodb._tcp.<cluster>.mongodb.net` succeeded via the system resolver `192.168.0.1`
   and returned three shard hosts — the cluster and the SRV record exist.
2. In Node, `dns.getServers()` returned `[ '127.0.0.1' ]`; `dns.promises.resolveSrv(...)` → `ECONNREFUSED`.
3. A `dns.promises.Resolver` with `setServers(['8.8.8.8'])` resolved the same record (3 entries).

So Node on this machine uses a different resolver than Windows tools, and that resolver refuses SRV queries.
The connection string, driver version and store code are not involved.

## Resolution

- No change to project code. Render resolves DNS normally.
- For local verification, preload `.claude/skills/mongo-ops/dns-preload.mjs` (`dns.setServers(['8.8.8.8','1.1.1.1'])`)
  via `--import`. With it, all 18 store-contract tests and the seed tests passed against Atlas.
- If the user ever needs this in their own dev loop, the agreed option was an optional `DNS_SERVERS` env var in
  `src/config.js`; it was deliberately not implemented.
