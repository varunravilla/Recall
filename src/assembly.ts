import { assemble } from "@mit-sdg/sync-engine/assembly";
import { composition as recallComposition } from "./compositions/Recall.ts";
import { composition as sessionsComposition } from "./compositions/Sessions.ts";
import { applicationConceptSet } from "./concepts.ts";
import { CollectingConcept } from "./concepts/Collecting.ts";
import { InterpretingConcept } from "./concepts/Interpreting.ts";
import { RemindingConcept } from "./concepts/Reminding.ts";
import { SessioningConcept } from "./concepts/Sessioning.ts";
import { TrackingConcept } from "./concepts/Tracking.ts";
import { db } from "./db.ts";

export function assembleApplication() {
  return assemble({
    conceptSet: applicationConceptSet,
    instances: {
      Sessioning: new SessioningConcept(),
      Collecting: new CollectingConcept(db),
      Interpreting: new InterpretingConcept(db),
      Tracking: new TrackingConcept(db),
      Reminding: new RemindingConcept(db),
    },
    composition: {
      Sessions: sessionsComposition,
      Recall: recallComposition,
    },
    rawFaultReporter: ({ error }) => console.error(error),
  });
}
