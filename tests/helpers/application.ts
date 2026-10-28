import { assemble } from "@mit-sdg/sync-engine/assembly";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import type { Db } from "mongodb";
import { applicationConceptSet } from "../../src/concepts.ts";
import { composition as Recall } from "../../src/compositions/Recall.ts";
import { composition as Sessions } from "../../src/compositions/Sessions.ts";
import { AuthenticatingConcept } from "../../src/concepts/Authenticating.ts";
import { CollectingConcept } from "../../src/concepts/Collecting.ts";
import { InterpretingConcept } from "../../src/concepts/Interpreting.ts";
import { RemindingConcept } from "../../src/concepts/Reminding.ts";
import { SessioningConcept } from "../../src/concepts/Sessioning.ts";
import { TrackingConcept } from "../../src/concepts/Tracking.ts";
import { policy } from "../../src/http.ts";

/** Same composition tree as production; each test chooses an isolated database. */
export function testApplication(db: Db, clock?: () => Date) {
  const instances = {
    Authenticating: new AuthenticatingConcept(db), Sessioning: new SessioningConcept(clock),
    Collecting: new CollectingConcept(db), Interpreting: new InterpretingConcept(db),
    Tracking: new TrackingConcept(db), Reminding: new RemindingConcept(db),
  };
  const application = assemble({ conceptSet: applicationConceptSet, instances, composition: { Recall, Sessions } });
  const gateway = createGateway({ application });
  const api = createHttpHandler({ application, gateway, policy });
  async function post(path: string, body: Record<string, unknown>, status = 200): Promise<any> {
    const response = await api(new Request(`http://localhost/api/recall/${path}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }));
    const data = await response.json();
    if (response.status !== status) throw new Error(`${path}: expected ${status}, got ${response.status}: ${JSON.stringify(data)}`);
    return data;
  }
  async function account() {
    const credentials = { username: `test_${crypto.randomUUID().slice(0, 12)}`, password: "integration-password-123" };
    return { ...await post("register", credentials), credentials };
  }
  return { ...instances, gateway, api, post, account };
}
