import { inputContract } from "../../input.ts";
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { reaction, when, where, now as flowNow } from "@mit-sdg/sync-engine/language";
import { concepts } from "../../concepts.ts";

const { Collecting, Interpreting, Reminding, Sessioning, Tracking } = concepts;

export const Tick = endpoint(
  "/recall/sweep/tick",
  ({ session, user, now, count }) =>
    receive({ session })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(where(flowNow(now)).then(Reminding.sweepDue({ now }).responds({ count })))
      .then(respond({ count })),
  { validators: inputContract("session"), input: { required: ["session"] } },
);

export const RemoveInterpretations = reaction(({ user, collection, interpretation }) =>
  when(Collecting.remove({ user, collection }).responds({ collection }))
    .where(Interpreting._allByItem({ item: collection }).is({ interpretation }))
    .then(Interpreting.remove({ interpretation })),
);

export const RemoveTrackings = reaction(({ interpretation, user, tracking }) =>
  when(Interpreting.remove({ interpretation }).responds({ interpretation }))
    .where(Tracking._allByItem({ item: interpretation }).is({ tracking, owner: user }))
    .then(Tracking.remove({ user, tracking })),
);

export const RemoveReminders = reaction(({ user, tracking }) =>
  when(Tracking.remove({ user, tracking }).responds({ tracking }))
    .then(Reminding.removeItem({ user, item: tracking })),
);

export const CancelCompleted = reaction(({ user, tracking, reminder }) =>
  when(Tracking.complete({ user, tracking }).responds({ tracking }))
    .where(Reminding._byItem({ user, item: tracking }).is({ reminder }))
    .then(Reminding.cancel({ user, reminder })),
);

export const CancelDismissed = reaction(({ user, tracking, reminder }) =>
  when(Tracking.dismiss({ user, tracking }).responds({ tracking }))
    .where(Reminding._byItem({ user, item: tracking }).is({ reminder }))
    .then(Reminding.cancel({ user, reminder })),
);
