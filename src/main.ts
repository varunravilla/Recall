import { MAX_IMPORT_BODY_BYTES } from "./photos/image.ts";
import { createPhotoHandler } from "./photos/http.ts";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "./assembly.ts";
import { policy } from "./http.ts";
import { client, db } from "./db.ts";

await client.connect();

const application = assembleApplication();
const gateway = createGateway({ application });
const api = createHttpHandler({ application, gateway, policy });

const photos = createPhotoHandler({ gateway });

const dist = `${import.meta.dir}/../frontend/dist`;
const server = Bun.serve({
  idleTimeout: 180,
  maxRequestBodySize: MAX_IMPORT_BODY_BYTES,
  async fetch(request) {
    let path: string;
    try { path = decodeURIComponent(new URL(request.url).pathname); }
    catch { return new Response("Invalid path", { status: 400 }); }
    if (path.includes("..") || path.includes("\\") || path.includes("\0")) return new Response("Not found", { status: 404 });
    const file = Bun.file(dist + path);
    if (path !== "/" && await file.exists()) return new Response(file);
    if (path.startsWith("/assets/") || path.startsWith("/api/")) return new Response("Not found", { status: 404 });
    return new Response(Bun.file(`${dist}/index.html`), { headers: { "Cache-Control": "no-cache" } });
  },
  hostname: process.env.HOST ?? "127.0.0.1",
  port: Number(process.env.PORT ?? 3000),
  routes: {
    "/api/recall/photos/import": photos,
    "/api/recall/photos/import-batch": photos,
    "/api/recall/photos/image": photos,
    "/api/recall/photos/status": photos,
    "/api/recall/photos/add": photos,
    "/api/*": (request: Request) => {
      const path = new URL(request.url).pathname.replace(/\/+$/, "");
      if (["/api/recall/photos/add", "/api/recall/photos/found"].includes(path)) return Response.json({ error: "Use photo import." }, { status: 404 });
      return api(request);
    },
    "/health": async () => {
      try {
        await db.command({ ping: 1 });
        return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
      } catch {
        return Response.json(
          { status: "unavailable" },
          { status: 503, headers: { "Cache-Control": "no-store" } },
        );
      }
    },
  },
});

console.log(`Backend listening on ${server.url}`);
