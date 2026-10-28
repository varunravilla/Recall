/** Synthetic HTTP checks only. Does not send images to AI or touch existing users. */
const origin = process.argv[2];
const reportPath = process.argv[3] ?? "docs/validation/deployed-p4.json";
if (!origin || !/^https?:\/\//.test(origin)) throw new Error("Usage: bun scripts/check-deployed.ts https://your-app.example");
const checks: Array<{ name: string; passed: boolean; detail?: string }> = [];
const records: Array<{ session: string; collection: string }> = [];
const sessions: string[] = [];
const check = (name: string, passed: boolean, detail?: string) => { checks.push({ name, passed, ...(detail ? { detail } : {}) }); console.log(`${passed ? "PASS" : "FAIL"} ${name}`); };
async function post(path: string, body: Record<string, unknown>) {
  const response = await fetch(new URL(`/api/recall/${path}`, origin), {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000),
  });
  return { status: response.status, data: await response.json() as any };
}
async function account() {
  const credentials = { username: `p4_${crypto.randomUUID().slice(0, 12)}`, password: crypto.randomUUID() };
  const result = await post("register", credentials);
  if (result.status !== 200) throw new Error(`Registration failed: ${result.status}`);
  sessions.push(result.data.session);
  return { ...result.data, credentials };
}
const future = new Date(Date.now() + 3600000).toISOString();
try {
  const health = await fetch(new URL("/health", origin));
  check("health and MongoDB", health.status === 200 && (await health.json() as any).status === "ok");
  const home = await fetch(origin); check("homepage", home.status === 200 && (await home.text()).includes("<title>Recall</title>"));
  const a = await account(); const b = await account();
  const wrong = await post("start", { ...a.credentials, password: "wrong-password-123" });
  check("wrong password refused", wrong.status === 401);
  check("forged session refused", (await post("library/list", { session: "forged" })).status === 401);
  const invalid = await post("captions/add", { session: a.session });
  check("missing fields refused", invalid.status === 400);
  const created = await post("captions/add", { session: a.session, item: crypto.randomUUID(), content: "Synthetic P4 concert check", collectedAt: new Date().toISOString(), kind: "event", summary: "Buy test concert tickets", relevantAt: future });
  if (created.status !== 200) throw new Error(`Capture failed: ${created.status}`);
  const item = created.data; records.push({ session: a.session, collection: item.collection });
  const read = await post("saved/get", { session: a.session, collection: item.collection });
  check("proposal readable", read.status === 200 && read.data.item.interpretationRow.status === "proposed");
  for (const route of ["review/get", "saved/get"]) {
    const other = await post(route, { session: b.session, collection: item.collection });
    check(`foreign ${route} denied without server error`, other.status === 404, `HTTP ${other.status}`);
  }
  const denied = await post("saved/delete", { session: b.session, collection: item.collection });
  check("foreign delete refused", denied.status === 403 || denied.status === 404);
  check("refused deletion preserved owner item", (await post("saved/get", { session: a.session, collection: item.collection })).status === 200);
  const malformed = await post("review/confirm", { session: a.session, ...item, at: "invalid-time" });
  check("malformed reminder refused before confirmation", malformed.status === 400, `HTTP ${malformed.status}`);
  const after = await post("saved/get", { session: a.session, collection: item.collection });
  check("invalid confirmation leaves proposal unchanged", after.data.item?.interpretationRow?.status === "proposed" && !after.data.item?.trackingRow?.tracking);
  // If the old deployment accepted the invalid time, report it and avoid using
  // that corrupted reminder in subsequent checks. Cleanup still removes it.
  if (malformed.status === 400) {
    const tracked = await post("review/confirm", { session: a.session, ...item, at: new Date(0).toISOString() });
    check("confirm creates tracking and reminder", tracked.status === 200 && !!tracked.data.reminder);
    await post("sweep/tick", { session: a.session });
    const inbox = await post("inbox/list", { session: a.session });
    check("HTTP timestamp becomes due", inbox.data.book?.due?.some((row: any) => row.details?.collection === item.collection && row.details?.reminderStatus === "due"));
    const complete = await post("saved/complete", { session: a.session, collection: item.collection, tracking: tracked.data.tracking });
    check("complete saved item", complete.status === 200);
  }
  const login = await post("start", a.credentials);
  if (login.status === 200) sessions.push(login.data.session);
  const persisted = await post("saved/get", { session: login.data.session, collection: item.collection });
  check("saved data survives a fresh login", persisted.status === 200 && persisted.data.item?.collection === item.collection);
  const route = await fetch(new URL(`/saved/${item.collection}`, origin));
  check("direct item URL serves Vue entry", route.status === 200 && (await route.text()).includes('<div id="app">'));
} catch (error) {
  check("check run completed", false, error instanceof Error ? error.message : String(error));
} finally {
  for (const item of records) {
    const deleted = await post("saved/delete", item).catch(() => null);
    check("synthetic item cleanup", deleted?.status === 200);
    if (deleted?.status === 200) check("deleted item unavailable", (await post("saved/get", item)).status === 404);
  }
  for (const session of sessions) await post("end", { session }).catch(() => null);
  const report = { run: new Date().toISOString(), origin, scope: "Synthetic HTTP checks; no AI requests, browser interaction, personal photos, deployment changes, or verification of deployed Git identity. Two synthetic accounts remain because account deletion is not implemented.", checks, passed: checks.every(c => c.passed) };
  await Bun.write(reportPath, JSON.stringify(report, null, 2) + "\n");
  if (!report.passed) process.exitCode = 1;
}
