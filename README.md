# Recall

Screenshots should come back when they become useful, not just become easier to find.

P2 MVP: log in → Photos permission → collect caption → propose → confirm → track → remind → sweep → complete.

## Startup guide

### Prerequisites

- [Bun](https://bun.sh) (`bun --version`)
- [Podman](https://podman.io) + Compose ([MongoDB setup guide](https://61040.github.io/fa26/resources/mongodb-setup/))

### 1. Environment

```sh
cp .env.example .env
bun install
```

`.env` uses `mongodb://dev:dev@127.0.0.1:27017/recall?authSource=admin` (matches `compose.yaml`).

### 2. Podman + MongoDB

On macOS, after a reboot or if containers fail:

```sh
podman machine start
```

If you see **connection refused** to the Podman socket while the machine says “already running”:

```sh
podman machine stop
podman machine start
```

If storage errors persist (disk was full, corrupted overlay), reset the VM (removes container volumes inside Podman):

```sh
podman machine stop
podman machine rm
podman machine init
podman machine start
```

Start MongoDB and wait until it accepts connections:

```sh
bun run db:up
```

Useful commands:

| Command | Purpose |
| --- | --- |
| `bun run db:check` | Ping MongoDB |
| `bun run db:logs` | Container logs |
| `bun run db:reset` | Wipe data and restart |
| `bun run db:shell` | `mongosh` as `dev` |

Port **27017** must be free. Another MongoDB or container can block it (`lsof -i :27017`).

### 3. Run the app

```sh
bun run dev
```

- **API:** http://127.0.0.1:3000 (`/health`, `/api/...`)
- **UI:** http://localhost:5173 (Vite proxies `/api` to the backend)

Or run pieces separately:

```sh
bun run db:up
bun run dev:backend   # port 3000
bun run dev:frontend  # port 5173
```

### 4. Verify

```sh
bun run check:design
bun run generate
bun run check
bun test              # needs `bun run db:up` first
bun run test:memory   # no Podman; good for CI / broken Podman
```

Optional end-to-end script (backend must be running):

```sh
bun scripts/try-journey.ts
```

### Core journey (demo)

1. Open http://localhost:5173 — **log in**, **Allow Photos access** (web demo).
2. **Add** — paste a concert/ticket caption (simulates a detected screenshot).
3. **Review** → **Confirm** (~1 minute reminder).
4. **Inbox** polls sweep; when due, open saved item → **Mark complete**.

Add your screen recording URL in [P2.md](P2.md).

## Project layout

| Path | Role |
| --- | --- |
| [P1.md](P1.md) | P1 design narrative |
| [design_images/](design_images/) | UI sketches (P1) |
| [design/](design/) | sync-engine specs |
| [src/](src/) | Backend concepts + compositions |
| [frontend/](frontend/) | Vue 3 + Vite UI |
| [P2.md](P2.md) | P2 journey + demo link |

## Course

- [P2 assignment](https://61040.github.io/fa26/assignments/p2/)
- [sync-engine local dev](https://61040.github.io/fa26/resources/sync-engine-local-dev/)
