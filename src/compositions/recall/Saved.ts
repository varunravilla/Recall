import { inputContract } from "../../input.ts";
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { no, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../../concepts.ts";

const { Collecting, Interpreting, Reminding, Sessioning, Tracking } = concepts;

export const Complete = endpoint(
  "/recall/saved/complete",
  ({ session, user, tracking, collection, interpretation }) =>
    receive({ session, tracking, collection })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(
        where(Collecting._byId({ collection }).is({ owner: user }),
          Interpreting._byItem({ item: collection }).is({ interpretation }),
          Tracking._byId({ tracking }).is({ owner: user, item: interpretation }))
          .then(Tracking.complete({ user, tracking }).responds({ tracking }))
          .then(respond({ tracking }))
          .named("owner"),
        where(no(Collecting._byId({ collection }).is({ owner: user })))
          .then(respond({ error: "NOT_FOUND" as const }))
          .named("missing"),
        where(Collecting._byId({ collection }).is({ owner: user }),
          Interpreting._byItem({ item: collection }).is({ interpretation }),
          no(Tracking._byId({ tracking }).is({ owner: user, item: interpretation })))
          .then(respond({ error: "NOT_FOUND" as const })).named("mismatched"),
      ),
  { validators: inputContract("session", "tracking", "collection"), input: { required: ["session", "tracking", "collection"] } },
);

export const Dismiss = endpoint(
  "/recall/saved/dismiss",
  ({ session, user, tracking, collection, interpretation }) =>
    receive({ session, tracking, collection })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(
        where(Collecting._byId({ collection }).is({ owner: user }),
          Interpreting._byItem({ item: collection }).is({ interpretation }),
          Tracking._byId({ tracking }).is({ owner: user, item: interpretation }))
          .then(Tracking.dismiss({ user, tracking }).responds({ tracking }))
          .then(respond({ tracking }))
          .named("owner"),
        where(no(Collecting._byId({ collection }).is({ owner: user })))
          .then(respond({ error: "NOT_FOUND" as const }))
          .named("missing"),
        where(Collecting._byId({ collection }).is({ owner: user }),
          Interpreting._byItem({ item: collection }).is({ interpretation }),
          no(Tracking._byId({ tracking }).is({ owner: user, item: interpretation })))
          .then(respond({ error: "NOT_FOUND" as const })).named("mismatched"),
      ),
  { validators: inputContract("session", "tracking", "collection"), input: { required: ["session", "tracking", "collection"] } },
);

export const Reschedule = endpoint(
  "/recall/saved/reschedule",
  ({ session, user, tracking, collection, interpretation, reminder, at }) =>
    receive({ session, tracking, collection, at })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(
        where(
          Collecting._byId({ collection }).is({ owner: user }),
          Interpreting._byItem({ item: collection }).is({ interpretation }),
          Tracking._byId({ tracking }).is({ owner: user, item: interpretation }),
          Reminding._byItem({ user, item: tracking }).is({ reminder }),
        )
          .then(Reminding.reschedule({ user, reminder, at }).responds({ reminder }))
          .then(respond({ reminder, at }))
          .named("owner"),
        where(no(Collecting._byId({ collection }).is({ owner: user })))
          .then(respond({ error: "NOT_FOUND" as const }))
          .named("missing"),
        where(Collecting._byId({ collection }).is({ owner: user }),
          Interpreting._byItem({ item: collection }).is({ interpretation }),
          no(Tracking._byId({ tracking }).is({ owner: user, item: interpretation })))
          .then(respond({ error: "NOT_FOUND" as const })).named("mismatched"),
        where(Collecting._byId({ collection }).is({ owner: user }),
          Interpreting._byItem({ item: collection }).is({ interpretation }),
          Tracking._byId({ tracking }).is({ owner: user, item: interpretation }),
          no(Reminding._byItem({ user, item: tracking })))
          .then(respond({ error: "NOT_FOUND" as const })).named("noReminder"),
      ),
  { validators: inputContract("session", "tracking", "collection", "at"), input: { required: ["session", "tracking", "collection", "at"] } },
);

export const Delete = endpoint(
  "/recall/saved/delete",
  ({ session, user, collection }) => receive({ session, collection })
    .then(Sessioning.current({ session }).responds({ subject: user }))
    .then(Collecting.remove({ user, collection }).responds({ collection }))
    .then(respond({ collection })),
  { validators: inputContract("session", "collection"), input: { required: ["session", "collection"] } },
);
