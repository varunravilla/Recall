import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former, no, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";

const { Collecting, Interpreting, Reminding, Sessioning, Tracking } = concepts;

const InboxBook = former(
  "the action inbox book",
  (
    { user },
    {
      collection,
      item,
      content,
      collectedAt,
      interpretation,
      kind,
      summary,
      relevantAt,
      status,
      tracking,
      interpretationId,
      reminder,
      at,
      reminderStatus,
    },
  ) =>
    form({
      forReview: each(Collecting._byOwner({ user }).is({ collection, item, content, collectedAt })).form({
        collection,
        item,
        content,
        collectedAt,
        proposal: each(
          Interpreting._byItem({ item: collection }).is({
            interpretation,
            kind,
            summary,
            relevantAt,
            status,
          }),
        ).form({ interpretation, kind, summary, relevantAt, status }),
      }),
      due: each(Tracking._pending({ user }).is({ tracking, item: interpretationId })).form({
        tracking,
        interpretationId,
        details: where(
          Interpreting._byId({ interpretation: interpretationId }).is({ item: collection }),
          Interpreting._byItem({ item: collection }).is({ summary, kind }),
          Reminding._byItem({ user, item: tracking }).is({ reminder, at, status: reminderStatus }),
        ).form({ collection, reminder, at, reminderStatus, summary, kind }),
      }),
    }),
);

const AddCaption = endpoint(
  "/recall/captions/add",
  ({ session, user, item, content, collectedAt, kind, summary, relevantAt, collection, interpretation }) =>
    receive({ session, item, content, collectedAt, kind, summary, relevantAt })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(Collecting.add({ user, item, content, collectedAt }).responds({ collection }))
      .then(
        Interpreting.propose({ item: collection, kind, summary, relevantAt }).responds({
          interpretation,
        }),
      )
      .then(respond({ collection, interpretation })),
  {
    input: {
      required: ["session", "item", "content", "collectedAt", "kind", "summary", "relevantAt"],
    },
  },
);

const List = endpoint(
  "/recall/inbox/list",
  ({ session, user, book }) =>
    receive({ session })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(respond({ book: InboxBook({ user }) })),
  { input: { required: ["session"] } },
);

const LibraryBook = former(
  "the saved library book",
  (
    { user },
    {
      collection,
      content,
      collectedAt,
      interpretation,
      kind,
      summary,
      relevantAt,
      interpretationStatus,
      tracking,
      trackingStatus,
      reminder,
      at,
      reminderStatus,
    },
  ) =>
    form({
      items: each(Collecting._byOwner({ user }).is({ collection, content, collectedAt })).form({
        collection,
        content,
        collectedAt,
        interpretationRow: where(
          Interpreting._byItem({ item: collection }).is({
            interpretation,
            kind,
            summary,
            relevantAt,
            status: interpretationStatus,
          }),
        ).form({ interpretation, kind, summary, relevantAt, status: interpretationStatus }),
        trackingRow: where(
          Interpreting._byItem({ item: collection }).is({ interpretation }),
          Tracking._byItem({ user, item: interpretation }).is({ tracking, status: trackingStatus }),
        ).form({ tracking, status: trackingStatus }),
        reminderRow: where(
          Interpreting._byItem({ item: collection }).is({ interpretation }),
          Tracking._byItem({ user, item: interpretation }).is({ tracking }),
          Reminding._byItem({ user, item: tracking }).is({ reminder, at, status: reminderStatus }),
        ).form({ reminder, at, status: reminderStatus }),
      }),
    }),
);

const LibraryList = endpoint(
  "/recall/library/list",
  ({ session, user, book }) =>
    receive({ session })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(respond({ book: LibraryBook({ user }) })),
  { input: { required: ["session"] } },
);

const Get = endpoint(
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
  { input: { required: ["session", "collection"] } },
);

const Revise = endpoint(
  "/recall/review/revise",
  ({ session, user, collection, interpretation, kind, summary, relevantAt }) =>
    receive({ session, collection, interpretation, kind, summary, relevantAt })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(
        where(Collecting._byId({ collection }).is({ owner: user }))
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
      ),
  {
    input: {
      required: [
        "session",
        "collection",
        "interpretation",
        "kind",
        "summary",
        "relevantAt",
      ],
    },
  },
);

const Confirm = endpoint(
  "/recall/review/confirm",
  ({ session, user, collection, interpretation, at, tracking, reminder }) =>
    receive({ session, collection, interpretation, at })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(
        where(Collecting._byId({ collection }).is({ owner: user }))
          .then(Interpreting.confirm({ interpretation }).responds({ interpretation }))
          .then(Tracking.track({ user, item: interpretation }).responds({ tracking }))
          .then(Reminding.schedule({ user, item: tracking, at }).responds({ reminder }))
          .then(respond({ interpretation, tracking, reminder }))
          .named("owner"),
        where(no(Collecting._byId({ collection }).is({ owner: user })))
          .then(respond({ error: "NOT_FOUND" as const }))
          .named("missing"),
      ),
  {
    input: { required: ["session", "collection", "interpretation", "at"] },
  },
);

const Reject = endpoint(
  "/recall/review/reject",
  ({ session, user, collection, interpretation }) =>
    receive({ session, collection, interpretation })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(
        where(Collecting._byId({ collection }).is({ owner: user }))
          .then(Interpreting.reject({ interpretation }).responds({ interpretation }))
          .then(respond({ interpretation }))
          .named("owner"),
        where(no(Collecting._byId({ collection }).is({ owner: user })))
          .then(respond({ error: "NOT_FOUND" as const }))
          .named("missing"),
      ),
  { input: { required: ["session", "collection", "interpretation"] } },
);

const SavedDetail = former(
  "the saved item (collection)",
  (
    { user, collection },
    {
      item,
      content,
      collectedAt,
      interpretation,
      kind,
      summary,
      relevantAt,
      interpretationStatus,
      tracking,
      trackingStatus,
      reminder,
      at,
      reminderStatus,
    },
  ) =>
    where(Collecting._byId({ collection }).is({ owner: user, item, content, collectedAt })).form({
      collection,
      item,
      content,
      collectedAt,
      interpretationRow: where(
        Interpreting._byItem({ item: collection }).is({
          interpretation,
          kind,
          summary,
          relevantAt,
          status: interpretationStatus,
        }),
      ).form({ interpretation, kind, summary, relevantAt, status: interpretationStatus }),
      trackingRow: where(
        Interpreting._byItem({ item: collection }).is({ interpretation }),
        Tracking._byItem({ user, item: interpretation }).is({ tracking, status: trackingStatus }),
      ).form({ tracking, status: trackingStatus }),
      reminderRow: where(
        Interpreting._byItem({ item: collection }).is({ interpretation }),
        Tracking._byItem({ user, item: interpretation }).is({ tracking }),
        Reminding._byItem({ user, item: tracking }).is({ reminder, at, status: reminderStatus }),
      ).form({ reminder, at, status: reminderStatus }),
    }),
);

const SavedGet = endpoint(
  "/recall/saved/get",
  ({ session, user, collection, item }) =>
    receive({ session, collection })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(
        where(Collecting._byId({ collection }).is({ owner: user }))
          .then(respond({ item: SavedDetail({ user, collection }) }))
          .named("found"),
        where(no(Collecting._byId({ collection }).is({ owner: user })))
          .then(respond({ error: "NOT_FOUND" as const }))
          .named("missing"),
      ),
  { input: { required: ["session", "collection"] } },
);

const Complete = endpoint(
  "/recall/saved/complete",
  ({ session, user, tracking, collection }) =>
    receive({ session, tracking, collection })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(
        where(Collecting._byId({ collection }).is({ owner: user }))
          .then(Tracking.complete({ user, tracking }).responds({ tracking }))
          .then(respond({ tracking }))
          .named("owner"),
        where(no(Collecting._byId({ collection }).is({ owner: user })))
          .then(respond({ error: "NOT_FOUND" as const }))
          .named("missing"),
      ),
  { input: { required: ["session", "tracking", "collection"] } },
);

const Dismiss = endpoint(
  "/recall/saved/dismiss",
  ({ session, user, tracking, collection }) =>
    receive({ session, tracking, collection })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(
        where(Collecting._byId({ collection }).is({ owner: user }))
          .then(Tracking.dismiss({ user, tracking }).responds({ tracking }))
          .then(respond({ tracking }))
          .named("owner"),
        where(no(Collecting._byId({ collection }).is({ owner: user })))
          .then(respond({ error: "NOT_FOUND" as const }))
          .named("missing"),
      ),
  { input: { required: ["session", "tracking", "collection"] } },
);

const Reschedule = endpoint(
  "/recall/saved/reschedule",
  ({ session, user, tracking, collection, reminder, at }) =>
    receive({ session, tracking, collection, at })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(
        where(
          Collecting._byId({ collection }).is({ owner: user }),
          Reminding._byItem({ user, item: tracking }).is({ reminder }),
        )
          .then(Reminding.reschedule({ user, reminder, at }).responds({ reminder }))
          .then(respond({ reminder, at }))
          .named("owner"),
        where(no(Collecting._byId({ collection }).is({ owner: user })))
          .then(respond({ error: "NOT_FOUND" as const }))
          .named("missing"),
      ),
  { input: { required: ["session", "tracking", "collection", "at"] } },
);

const Tick = endpoint(
  "/recall/sweep/tick",
  ({ now, count }) =>
    receive({ now }).then(Reminding.sweepDue({ now }).responds({ count })).then(respond({ count })),
  { input: { required: ["now"] } },
);

export const composition = {
  Collecting: { AddCaption },
  Inbox: { List, InboxBook },
  Library: { List: LibraryList, LibraryBook },
  Review: { Get, Revise, Confirm, Reject },
  Saved: { Get: SavedGet, SavedDetail, Complete, Dismiss, Reschedule },
  Sweep: { Tick },
};
