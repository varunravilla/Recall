# Agent guide — Recall (6.1040 P2)

**Repo state:** P2 MVP. See [README.md](README.md#startup-guide) to run locally.

## Read first

1. [README.md](README.md)
2. [P1.md](P1.md) — design narrative + UI sketch links
3. [P2.md](P2.md) — user journey + demo URL
4. [design/](design/) — sync-engine specs (edit here; run `bun run check:design`)

## Course links

- P2: https://61040.github.io/fa26/assignments/p2/
- sync-engine: https://61040.github.io/fa26/resources/sync-engine-local-dev/

## Product rules (P1)

Events, places, products only — no automated purchase/booking. Flow: collect → propose interpretation → confirm → track → remind → complete/dismiss. UI reference: `design_images/` (see P1.md).

## Design → code

1. Edit `design/`
2. `bun run check:design`
3. Implement `src/concepts`, `src/compositions`
4. `bun run generate` && `bun run check`

## Stack

Bun; sync-engine **1.1.0** + `@mit-sdg/sync-engine-http`; MongoDB via Podman `compose.yaml`; Vue 3 + Vite.

## Run

```sh
cp .env.example .env
bun install
podman machine start   # macOS if needed
bun run db:up
bun run dev
```

- API: http://127.0.0.1:3000
- UI: http://localhost:5173 (proxies `/api`)
- `bun run check`, `bun test`, `bun run db:reset`

## Five concepts

| Concept | Storage |
| --- | --- |
| Sessioning | In-memory, 30min TTL |
| Collecting | Mongo; includes **content** caption |
| Interpreting | Mongo; item = **collection** id |
| Tracking | Mongo; item = **interpretation** id |
| Reminding | Mongo; item = **tracking** id; **sweepDue(now)** |

## Frontend

- `sessionStorage` session id; send `session` in JSON body (not cookies).
- `fetch` in `frontend/src/api.ts` — do not bundle sync-engine client.
- Client `recognizeCaption`; inbox polls `/recall/sweep/tick`.

## Backend

- `await client.connect()` in `main.ts` before listen.
- Reactions = endpoint `.then()` chains with `where(Collecting._byId...)` owner checks.

## Common failures

| Issue | Fix |
| --- | --- |
| JSON parse in UI | Start backend; guard empty responses in `api.ts` |
| Mongo refused | `db:up`; Podman disk space |
| Confirm fails | Include **`at`** in confirm body |
| Wrong joins | Interpret collection id; track interpretation id |

## Keep

`P1.md`, `design_images/`, `design/`, `P2.md`, `README.md`, `AGENTS.md`

## Submit

Commit hash, `P2.md` demo URL, passing check + test.
