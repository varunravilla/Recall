# Deploy Recall on 6.1040 Apps

Live app: [Recall](https://recall.mit-sdg.dev/).

An HTTP smoke check on October 19, 2026 returned HTTP 200 for the homepage and
HTTP 200 with `{"status":"ok"}` for `/health`. The homepage references the same
`index-BY7MV948.js` bundle produced after the add-more-photos fix. This checks
availability and the database health response, not complete browser journeys or
the deployment's Git commit identity.

Follow the [course deployment guide](https://61040.github.io/fa26/resources/deploying-apps/).
The repository is prepared for one Bun process serving both the API and built Vue pages.

| Setting | Value |
| --- | --- |
| Repository | `https://github.com/varunravilla/Recall` |
| Runtime | Bun; exact version is in root `package.json` |
| Package directories | `.` (all dependencies are in the root package; frontend has scripts only) |
| Build script | `build` |
| Start script | `start` |
| Port | `3000` |
| Health check | `/health` |
| Database | Add MongoDB; use variable name `MONGODB_URL` |

The platform supplies HOST, PORT, NODE_ENV, and the database connection string.
Do not upload `.env`. Recall uses bearer sessions in JSON bodies, not cookies.
Set `GEMINI_API_KEY` and optionally `GEMINI_MODEL=gemini-3.5-flash-lite`. Images persist in MongoDB; no server filesystem or S3 bucket is needed for this bounded-image implementation. See [AI setup](ai-import.md).

Build locally with `bun run build`. With MongoDB running, `bun run preview`
serves the production build at `http://127.0.0.1:3000`. For a disposable database,
run `bun run build` and `bun scripts/preview-memory.ts` instead. The latter loses
all preview data when stopped and does not use the configured application DB.

Before deployment, commit and push the intended version. Choose that exact
commit on the platform. After deployment, check `/health`, create an account,
import a screenshot, reload Saved and a direct item link, and complete the item.
Check that Gemini accepts the deployed server key and produces a future suggestion. Record
the live URL and commit in P3.md. A successful local build is not a live-deployment
verification.
