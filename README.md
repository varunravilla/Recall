# Recall

Screenshots should come back when they become useful, not just become easier to find.

P3 beta: import photos → automatic interpretation → save an undated find, or review a dated reminder → complete, dismiss, or delete.

[Gemini import setup](docs/ai-import.md) · [P3 journey](P3.md) · [Validation](docs/validation/README.md) · [Visual study](docs/visual-study/README.md) · [Design decisions](docs/design-decisions.md) · [Deployment](docs/deployment.md)

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


```sh
podman machine start

```


```sh
bun run db:up
```


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

### Beta journey

1. Create a password account, then open **Add**.
2. Choose photos or an exported folder and allow photo analysis.
3. Dated suggestions open in **Review**. Correct the action/time and choose **Save
   reminder**. Useful undated images appear in Saved as **Found**, without a reminder.
4. Open **Inbox** when due, then complete or dismiss. Search Saved, or delete an
   item after confirming its removal.

Gemini generates captions and actions, and times only when the image supports them. Expired and irrelevant images are skipped. Accepted images persist in your account. See [setup and privacy details](docs/ai-import.md). Recall cannot scan Photos in the background.
Reminders appear in the open Inbox; they are not OS notifications.

### P3 checks

```sh
bun run check:frontend     # checks Vue templates as well as TypeScript
bun run build              # production Vue bundle
bun scripts/validate.ts    # saves design/check/build/test output in docs/validation/
bun scripts/check-gemini.ts # live Gemini test with a synthetic fixture; requires your API key
```

See [P3.md](P3.md) for the current journey and limitations.
P1 and P2 remain historical milestone records.

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

### Photo import

Choose photos or an exported library folder, allow analysis, and select **Find my
saves**. Every readable new image is analyzed automatically; no local OCR or filter
mode needs configuring. Useful undated items appear as Found; dated suggestions
can become reminders after review. Existing saved images bypass repeat analysis.

The importer sends up to ten images per request and prepares one batch ahead.
New image copies target 1 MB each; originals stay untouched. Google quotas can
still require a wait. Optional `GEMINI_REQUESTS_PER_MINUTE` configures known project
limits; provider retry hints handle other quota responses. Waiting files remain
in the tab when paused, but a reload clears them. See [import details](docs/ai-import.md)
and [validation](docs/validation/README.md).

[Browser verification checklist](docs/browser-checks.md)
