import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import type { RecallWireHttp } from "../generated/wire.ts";

const client = createHttpClient<RecallWireHttp>({ baseUrl: "http://127.0.0.1:3000/api" });

const start = await client.recall.register({ username: `demo_${Date.now()}`, password: "demo-password-12345" });
if ("error" in start) throw new Error(String(start.error));
const { session } = start;

const item = crypto.randomUUID();
const relevantAt = new Date(Date.now() + 60_000).toISOString();
const add = await client.recall.captions.add({
  session,
  item,
  content: "Tickets on sale Friday 10am — don't miss the concert!",
  collectedAt: new Date().toISOString(),
  kind: "event",
  summary: "Buy tickets",
  relevantAt,
});
if ("error" in add) throw new Error(String(add.error));
console.log("Added caption", add);

const review = await client.recall.review.get({ session, collection: add.collection });
if ("error" in review) throw new Error(String(review.error));
console.log("Review", review);

const confirm = await client.recall.review.confirm({
  session,
  collection: add.collection,
  interpretation: add.interpretation,
  at: relevantAt,
});
if ("error" in confirm) throw new Error(String(confirm.error));
console.log("Confirmed", confirm);

const tick = await client.recall.sweep.tick({ session });
console.log("Sweep", tick);

const inbox = await client.recall.inbox.list({ session });
console.log("Inbox", JSON.stringify(inbox, null, 2));
