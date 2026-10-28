import { AuthenticatingConcept } from "../../src/concepts/Authenticating.ts";
import { afterAll, beforeAll, expect, test } from "bun:test";
import { assemble } from "@mit-sdg/sync-engine/assembly";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { composition as recallComposition } from "../../src/compositions/Recall.ts";
import { composition as sessionsComposition } from "../../src/compositions/Sessions.ts";
import { applicationConceptSet } from "../../src/concepts.ts";
import { CollectingConcept } from "../../src/concepts/Collecting.ts";
import { InterpretingConcept } from "../../src/concepts/Interpreting.ts";
import { RemindingConcept } from "../../src/concepts/Reminding.ts";
import { SessioningConcept } from "../../src/concepts/Sessioning.ts";
import { TrackingConcept } from "../../src/concepts/Tracking.ts";
import { openTestDb, type TestDb } from "../helpers/db.ts";

let testDb: TestDb;

beforeAll(async () => {
  testDb = await openTestDb();
}, 120_000);

afterAll(async () => {
  await testDb.close();
});

test("confirm chains track and schedule", async () => {
  const application = assemble({
    conceptSet: applicationConceptSet,
    instances: {
      Authenticating: new AuthenticatingConcept(testDb.db),
      Sessioning: new SessioningConcept(),
      Collecting: new CollectingConcept(testDb.db),
      Interpreting: new InterpretingConcept(testDb.db),
      Tracking: new TrackingConcept(testDb.db),
      Reminding: new RemindingConcept(testDb.db),
    },
    composition: { Sessions: sessionsComposition, Recall: recallComposition },
  });
  const gateway = createGateway({ application });

  const start = await gateway.invoke("/recall/register", { username: "maya", password: "correct-horse-battery" });
  expect(start.ok).toBe(true);
  if (!start.ok) return;
  const session = (start.value as { session: string }).session;

  const item = crypto.randomUUID();
  const at = new Date(Date.now() + 60_000);
  const add = await gateway.invoke("/recall/captions/add", {
    session,
    item,
    content: "Concert tickets on sale soon",
    collectedAt: new Date(),
    kind: "event",
    summary: "Buy tickets",
    relevantAt: at,
  });
  expect(add.ok).toBe(true);
  if (!add.ok) return;

  const confirm = await gateway.invoke("/recall/review/confirm", {
    session,
    collection: (add.value as { collection: string }).collection,
    interpretation: (add.value as { interpretation: string }).interpretation,
    at,
  });
  expect(confirm.ok).toBe(true);
  if (!confirm.ok) return;
  const confirmed = confirm.value as { tracking: string; reminder: string };
  expect(confirmed.tracking).toBeString();
  expect(confirmed.reminder).toBeString();
});
