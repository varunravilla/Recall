# Recall

Recall turns screenshots of events, places and products into ideas to revisit or
reminders to act on. It keeps the source image alongside the interpretation so
users can review dated suggestions before scheduling them.

[Live app](https://recall.mit-sdg.dev/) · [P4 overview](P4.md) · [Final design](docs/design-summary.md) · [Specifications](design/) · [Validation](docs/validation/README.md)

[Journey recording](https://drive.google.com/file/d/1r-wVCXXpEuqKjzmQkGzn-j-MuozuTZF0/view?usp=sharing) · [Visual study](docs/visual-study/README.md) · [Google Slides](https://docs.google.com/presentation/d/1z6NSPecjiPFXpwEyJR7AOQWH6pfXjO-oz-uZVtBeBG8/edit)

## Startup guide

Requires Bun **1.4.2** and either Podman with Compose or a MongoDB connection.
All dependencies install from the root package and `bun.lock`.

For first-time setup, copy `.env.example` to `.env`. Preserve an existing `.env`.
Set `GEMINI_API_KEY` to your own Google AI Studio key and keep it server-side.
The supplied `MONGODB_URL` matches the local Compose database. See
[AI setup and privacy](docs/ai-import.md) for quotas and image limits.

```sh
bun install --frozen-lockfile
podman machine start       # macOS, if the machine is stopped
bun run db:up
bun run dev
```

Open **http://localhost:5173**. Vite proxies `/api` to the backend at
**http://127.0.0.1:3000**. `/health` checks MongoDB connectivity. Password accounts
are created through the app. A browser can read selected files or an exported
folder, but cannot watch Apple Photos in the background.

For a production preview, stop the development server, keep MongoDB running, and
run `bun run preview`. Open **http://127.0.0.1:3000**. One Bun process serves the
built Vue pages and API. [Deployment settings](docs/deployment.md) use root package
directory `.`, build script `build`, start script `start`, and `MONGODB_URL`.

## Build and test

```sh
bun run check:design
bun run generate
bun run check
bun run check:frontend
bun run build
bun run test:memory
```

`test:memory` starts temporary MongoDB instances and uses isolated databases. Its
first run may download the MongoDB binary. Alternatively, start the Compose DB
and run `bun test`; each test database has a random `test-` name and is dropped
afterward. Tests never clear the configured application database.

`bun scripts/validate.ts` runs the full sequence and saves output in
`docs/validation/`, including Bun's coverage report. The [coverage map](docs/testing.md)
links endpoint contracts and failure risks to their tests. Live Gemini checks are
optional and use your API quota.
`bun scripts/check-deployed.ts https://recall.mit-sdg.dev/` checks deployed HTTP
persistence, access refusal and errors using synthetic accounts and data. It
cleans up its items, sends no AI requests, and leaves its synthetic accounts.
See the [browser checklist](docs/browser-checks.md) for interface verification.

## Using Recall

1. Sign in, choose photos or a folder, allow analysis, then **Find my saves**.
2. Review a dated suggestion against its image, edit as needed, then **Save reminder**.
   Useful undated items appear in Saved as **Found**, without reminders.
3. Search Saved or return to Inbox when a reminder is due. Complete, dismiss, or
   delete an item when it no longer needs attention. Deletion asks for confirmation.

You can add more photos during analysis without clearing earlier results. Pause
finishes the active batch and preserves waiting files. Reloading clears waiting
files, while accepted images persist. Reminders appear in the open Inbox rather
than as OS notifications. Sessions expire after 30 minutes and on server restart.
Password recovery and reopening completed intentions are not implemented.

## Project materials

| Material | Purpose |
| --- | --- |
| [Final design document](docs/design-summary.md) | Significant decisions and differences from P1/P3 |
| [Design notes](docs/design-decisions.md) | Dated engineering observations and rationale |
| [Composition specification](design/compositions/Recall.md) | Workflow boundaries, ownership rules and consequences |
| [Concept specifications](design/concepts/) and [generated API](generated/recall.md) | State/action contracts and endpoint interface |
| [Validation](docs/validation/README.md) | Saved results and limits of the evidence |
| [P5 testing preparation](docs/user-testing.md) | Participant tasks and observation guide |
| [P1](P1.md), [P2](P2.md), [P3](P3.md) | Historical milestone narratives |

The private individual repository contains the design notebook. The existing
recording is the P3 journey; [P4](P4.md) distinguishes it from a final recording.
