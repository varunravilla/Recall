import { InvalidTime } from "./input.ts";
import authenticatingSpec from "@design/concepts/Authenticating.md" with { type: "text" };
import { AuthenticatingConcept, InvalidCredentials, AccountExists } from "./concepts/Authenticating.ts";
import { conceptSet, registerConcept } from "@mit-sdg/sync-engine/assembly";
import collectingSpec from "@design/concepts/Collecting.md" with { type: "text" };
import interpretingSpec from "@design/concepts/Interpreting.md" with { type: "text" };
import remindingSpec from "@design/concepts/Reminding.md" with { type: "text" };
import sessioningSpec from "@design/concepts/Sessioning.md" with { type: "text" };
import trackingSpec from "@design/concepts/Tracking.md" with { type: "text" };
import {
  AlreadyCollected,
  CollectingConcept,
  EmptyContent,
  NotOwner as CollectingNotOwner,
} from "./concepts/Collecting.ts";
import { InterpretingConcept, NotProposed } from "./concepts/Interpreting.ts";
import {
  NotDue,
  NotOwner as RemindingNotOwner,
  NotScheduled,
  NotYet,
  RemindingConcept,
} from "./concepts/Reminding.ts";
import { SessioningConcept, UnknownSession } from "./concepts/Sessioning.ts";
import {
  AlreadyTracking,
  NotOwner as TrackingNotOwner,
  NotPending,
  TrackingConcept,
} from "./concepts/Tracking.ts";

const sessioning = registerConcept({
  class: SessioningConcept,
  spec: sessioningSpec,
  refusals: { UNKNOWN_SESSION: UnknownSession },
});

const collecting = registerConcept({
  class: CollectingConcept,
  spec: collectingSpec,
  refusals: {
    INVALID_TIME: InvalidTime,
    EMPTY_CONTENT: EmptyContent,
    ALREADY_COLLECTED: AlreadyCollected,
    NOT_OWNER: CollectingNotOwner,
  },
});

const interpreting = registerConcept({
  class: InterpretingConcept,
  spec: interpretingSpec,
  refusals: { INVALID_TIME: InvalidTime, NOT_PROPOSED: NotProposed },
});

const tracking = registerConcept({
  class: TrackingConcept,
  spec: trackingSpec,
  refusals: {
    ALREADY_TRACKING: AlreadyTracking,
    NOT_OWNER: TrackingNotOwner,
    NOT_PENDING: NotPending,
  },
});

const reminding = registerConcept({
  class: RemindingConcept,
  spec: remindingSpec,
  refusals: {
    NOT_OWNER: RemindingNotOwner,
    INVALID_TIME: InvalidTime,
    NOT_SCHEDULED: NotScheduled,
    NOT_YET: NotYet,
    NOT_DUE: NotDue,
  },
});

export const applicationConceptSet = conceptSet({
  Authenticating: registerConcept({ class: AuthenticatingConcept, spec: authenticatingSpec, refusals: { INVALID_CREDENTIALS: InvalidCredentials, ACCOUNT_EXISTS: AccountExists } }),
  Sessioning: sessioning,
  Collecting: collecting,
  Interpreting: interpreting,
  Tracking: tracking,
  Reminding: reminding,
});

export const { concepts } = applicationConceptSet;
