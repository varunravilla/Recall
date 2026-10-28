type Handler = (request: Request) => Promise<Response>;
const photoPaths = new Set(["import", "import-batch", "image", "status"].map(name => `/api/recall/photos/${name}`));

/** One production boundary also exercised by transport tests. */
export function routeApi({ api, photos }: { api: Handler; photos: Handler }): Handler {
  return request => {
    const path = new URL(request.url).pathname.replace(/\/+$/, "");
    if (["/api/recall/photos/add", "/api/recall/photos/found"].includes(path))
      return Promise.resolve(Response.json({ error: "Use photo import." }, { status: 404 }));
    if (photoPaths.has(path)) return photos(request);
    return api(request);
  };
}
