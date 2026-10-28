import { expect, test } from "bun:test";
import { routeApi } from "../../src/routing.ts";
for (const name of ["add", "found"]) for (const suffix of ["", "/", "///"]) for (const method of ["POST", "GET", "PUT"]) {
  test(`public router blocks internal photo ${name}${suffix} using ${method}`, async () => {
    let calls = 0;
    const handler = routeApi({ api: async () => { calls++; return Response.json({ unsafe: true }); }, photos: async () => { calls++; return Response.json({ unsafe: true }); } });
    const response = await handler(new Request(`http://localhost/api/recall/photos/${name}${suffix}`, { method }));
    expect(response.status).toBe(404);
    expect(calls).toBe(0);
  });
}
for (const name of ["import", "import-batch", "image", "status"]) {
  test(`public router sends ${name} through the authenticated photo adapter`, async () => {
    let photoCalls = 0;
    const handler = routeApi({ api: async () => { throw new Error("Bypassed photo adapter"); }, photos: async request => { photoCalls++; expect(request.method).toBe("POST"); return new Response("photo adapter"); } });
    const response = await handler(new Request(`http://localhost/api/recall/photos/${name}`, { method: "POST" }));
    expect(await response.text()).toBe("photo adapter"); expect(photoCalls).toBe(1);
  });
}
test("ordinary endpoints preserve the HTTP handler's status and response", async () => {
  const handler = routeApi({ api: async () => Response.json({ error: "UNAUTHORIZED" }, { status: 401 }), photos: async () => { throw new Error("Wrong adapter"); } });
  const response = await handler(new Request("http://localhost/api/recall/library/list", { method: "POST" }));
  expect(response.status).toBe(401); expect(await response.json()).toEqual({ error: "UNAUTHORIZED" });
});
