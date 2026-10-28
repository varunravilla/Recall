import { inputContract } from "../../input.ts";
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { no, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../../concepts.ts";

const { Collecting, Interpreting, Reminding, Sessioning, Tracking } = concepts;

export const Get = endpoint(
  "/recall/review/get",
  ({
    session,
    user,
    collection,
    item,
    content,
    collectedAt,
    interpretation,
    kind,
    summary,
    relevantAt,
    status,
  }) =>
    receive({ session, collection })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(
        where(
          Collecting._byId({ collection }).is({ owner: user, item, content, collectedAt }),
          Interpreting._byItem({ item: collection }).is({
            interpretation,
            kind,
            summary,
            relevantAt,
            status,
          }),
        )
          .then(
            respond({
              collection,
              item,
              content,
              collectedAt,
              interpretation,
              kind,
              summary,
              relevantAt,
              status,
            }),
          )
          .named("found"),
        where(no(Collecting._byId({ collection }).is({ owner: user })))
          .then(respond({ error: "NOT_FOUND" as const }))
          .named("missing"),
      ),
  { validators: inputContract("session", "collection"), input: { required: ["session", "collection"] } },
);

export const Revise = endpoint(
  "/recall/review/revise",
  ({ session, user, collection, interpretation, kind, summary, relevantAt }) =>
    receive({ session, collection, interpretation, kind, summary, relevantAt })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(
        where(Collecting._byId({ collection }).is({ owner: user }),
          Interpreting._byId({ interpretation }).is({ item: collection }))
          .then(
            Interpreting.revise({ interpretation, kind, summary, relevantAt }).responds({
              interpretation,
            }),
          )
          .then(respond({ interpretation }))
          .named("owner"),
        where(no(Collecting._byId({ collection }).is({ owner: user })))
          .then(respond({ error: "NOT_FOUND" as const }))
          .named("missing"),
        where(Collecting._byId({ collection }).is({ owner: user }),
          no(Interpreting._byId({ interpretation }).is({ item: collection })))
          .then(respond({ error: "NOT_FOUND" as const })).named("mismatched"),
      ),
  {
    validators: inputContract("session", "collection", "interpretation", "kind", "summary", "relevantAt"), input: { required: [
        "session",
        "collection",
        "interpretation",
        "kind",
        "summary",
        "relevantAt",
      ] },
  },
);

export const Confirm = endpoint(
  "/recall/review/confirm",
  ({ session, user, collection, interpretation, at, tracking, reminder }) =>
    receive({ session, collection, interpretation, at })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(
        where(Collecting._byId({ collection }).is({ owner: user }),
          Interpreting._byId({ interpretation }).is({ item: collection }))
          .then(Interpreting.confirm({ interpretation }).responds({ interpretation }))
          .then(Tracking.track({ user, item: interpretation }).responds({ tracking }))
          .then(Reminding.schedule({ user, item: tracking, at }).responds({ reminder }))
          .then(respond({ interpretation, tracking, reminder }))
          .named("owner"),
        where(no(Collecting._byId({ collection }).is({ owner: user })))
          .then(respond({ error: "NOT_FOUND" as const }))
          .named("missing"),
        where(Collecting._byId({ collection }).is({ owner: user }),
          no(Interpreting._byId({ interpretation }).is({ item: collection })))
          .then(respond({ error: "NOT_FOUND" as const })).named("mismatched"),
      ),
  {
    validators: inputContract("session", "collection", "interpretation", "at"), input: { required: ["session", "collection", "interpretation", "at"] },
  },
);

export const Reject = endpoint(
  "/recall/review/reject",
  ({ session, user, collection, interpretation }) =>
    receive({ session, collection, interpretation })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(
        where(Collecting._byId({ collection }).is({ owner: user }),
          Interpreting._byId({ interpretation }).is({ item: collection }))
          .then(Interpreting.reject({ interpretation }).responds({ interpretation }))
          .then(respond({ interpretation }))
          .named("owner"),
        where(no(Collecting._byId({ collection }).is({ owner: user })))
          .then(respond({ error: "NOT_FOUND" as const }))
          .named("missing"),
        where(Collecting._byId({ collection }).is({ owner: user }),
          no(Interpreting._byId({ interpretation }).is({ item: collection })))
          .then(respond({ error: "NOT_FOUND" as const })).named("mismatched"),
      ),
  { validators: inputContract("session", "collection", "interpretation"), input: { required: ["session", "collection", "interpretation"] } },
);
