import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former, no, now as flowNow, reaction, when, where, whether } from "@mit-sdg/sync-engine/language";
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
          whether(Interpreting._byItem({ item: collection }).is({
            interpretation,
            kind,
            summary,
            relevantAt,
            status: interpretationStatus,
          })),
        ).form({ interpretation, kind, summary, relevantAt, status: interpretationStatus }),
        trackingRow: where(
          whether(Interpreting._byItem({ item: collection }).is({ interpretation })),
          whether(Tracking._byItem({ user, item: interpretation }).is({ tracking, status: trackingStatus })),
        ).form({ tracking, status: trackingStatus }),
        reminderRow: where(
          whether(Interpreting._byItem({ item: collection }).is({ interpretation })),
          whether(Tracking._byItem({ user, item: interpretation }).is({ tracking })),
          whether(Reminding._byItem({ user, item: tracking }).is({ reminder, at, status: reminderStatus })),
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
    input: { required: ["session", "collection", "interpretation", "at"] },
  },
);

const Reject = endpoint(
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
        whether(Interpreting._byItem({ item: collection }).is({
          interpretation,
          kind,
          summary,
          relevantAt,
          status: interpretationStatus,
        })),
      ).form({ interpretation, kind, summary, relevantAt, status: interpretationStatus }),
      trackingRow: where(
        whether(Interpreting._byItem({ item: collection }).is({ interpretation })),
        whether(Tracking._byItem({ user, item: interpretation }).is({ tracking, status: trackingStatus })),
      ).form({ tracking, status: trackingStatus }),
      reminderRow: where(
        whether(Interpreting._byItem({ item: collection }).is({ interpretation })),
        whether(Tracking._byItem({ user, item: interpretation }).is({ tracking })),
        whether(Reminding._byItem({ user, item: tracking }).is({ reminder, at, status: reminderStatus })),
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
  { input: { required: ["session", "tracking", "collection"] } },
);

const Dismiss = endpoint(
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
  { input: { required: ["session", "tracking", "collection"] } },
);

const Reschedule = endpoint(
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
  { input: { required: ["session", "tracking", "collection", "at"] } },
);

const Tick = endpoint(
  "/recall/sweep/tick",
  ({ session, user, now, count }) =>
    receive({ session })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(where(flowNow(now)).then(Reminding.sweepDue({ now }).responds({ count })))
      .then(respond({ count })),
  { input: { required: ["session"] } },
);

const AddPhoto = endpoint(
  "/recall/photos/add",
  ({ session, user, item, content, collectedAt, imageData, mimeType, kind, summary, relevantAt, collection, interpretation }) =>
    receive({ session, item, content, collectedAt, imageData, mimeType, kind, summary, relevantAt })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(Collecting.addPhoto({ user, item, content, collectedAt, imageData, mimeType }).responds({ collection }))
      .then(Interpreting.propose({ item: collection, kind, summary, relevantAt }).responds({ interpretation }))
      .then(respond({ collection, interpretation })),
  { input: { required: ["session", "item", "content", "collectedAt", "imageData", "mimeType", "kind", "summary", "relevantAt"] } },
);
const AddFoundPhoto = endpoint(
  "/recall/photos/found",
  ({ session, user, item, content, collectedAt, imageData, mimeType, kind, summary, collection, interpretation }) =>
    receive({ session, item, content, collectedAt, imageData, mimeType, kind, summary })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(Collecting.addPhoto({ user, item, content, collectedAt, imageData, mimeType }).responds({ collection }))
      .then(Interpreting.propose({ item: collection, kind, summary }).responds({ interpretation }))
      .then(Interpreting.confirm({ interpretation }).responds({ interpretation }))
      .then(respond({ collection, interpretation })),
  { input: { required: ["session", "item", "content", "collectedAt", "imageData", "mimeType", "kind", "summary"] } },
);
const GetPhoto = endpoint(
  "/recall/photos/get",
  ({ session, user, collection, imageData, mimeType }) => receive({ session, collection })
    .then(Sessioning.current({ session }).responds({ subject: user }))
    .then(
      where(Collecting._photo({ user, collection }).is({ imageData, mimeType }))
        .then(respond({ imageData, mimeType })).named("found"),
      where(no(Collecting._photo({ user, collection })))
        .then(respond({ error: "NOT_FOUND" as const })).named("missing"),
    ),
  { input: { required: ["session", "collection"] } },
);
const FindPhoto = endpoint(
  "/recall/photos/find",
  ({ session, user, item, collection }) => receive({ session, item })
    .then(Sessioning.current({ session }).responds({ subject: user }))
    .then(
      where(Collecting._find({ user, item }).is({ collection }))
        .then(respond({ collection })).named("found"),
      where(no(Collecting._find({ user, item })))
        .then(respond({ error: "NOT_FOUND" as const })).named("missing"),
    ),
  { input: { required: ["session", "item"] } },
);

const Delete = endpoint(
  "/recall/saved/delete",
  ({ session, user, collection }) => receive({ session, collection })
    .then(Sessioning.current({ session }).responds({ subject: user }))
    .then(Collecting.remove({ user, collection }).responds({ collection }))
    .then(respond({ collection })),
  { input: { required: ["session", "collection"] } },
);
const RemoveInterpretations = reaction(({ user, collection, interpretation }) =>
  when(Collecting.remove({ user, collection }).responds({ collection }))
    .where(Interpreting._allByItem({ item: collection }).is({ interpretation }))
    .then(Interpreting.remove({ interpretation })),
);
const RemoveTrackings = reaction(({ interpretation, user, tracking }) =>
  when(Interpreting.remove({ interpretation }).responds({ interpretation }))
    .where(Tracking._allByItem({ item: interpretation }).is({ tracking, owner: user }))
    .then(Tracking.remove({ user, tracking })),
);
const RemoveReminders = reaction(({ user, tracking }) =>
  when(Tracking.remove({ user, tracking }).responds({ tracking }))
    .then(Reminding.removeItem({ user, item: tracking })),
);

const CancelCompleted = reaction(({ user, tracking, reminder }) =>
  when(Tracking.complete({ user, tracking }).responds({ tracking }))
    .where(Reminding._byItem({ user, item: tracking }).is({ reminder }))
    .then(Reminding.cancel({ user, reminder })),
);
const CancelDismissed = reaction(({ user, tracking, reminder }) =>
  when(Tracking.dismiss({ user, tracking }).responds({ tracking }))
    .where(Reminding._byItem({ user, item: tracking }).is({ reminder }))
    .then(Reminding.cancel({ user, reminder })),
);

export const composition = {
  CancelCompleted, CancelDismissed, RemoveInterpretations, RemoveTrackings, RemoveReminders,
  Photos: { Add: AddPhoto, Found: AddFoundPhoto, Get: GetPhoto, Find: FindPhoto },
  Collecting: { AddCaption },
  Inbox: { List, InboxBook },
  Library: { List: LibraryList, LibraryBook },
  Review: { Get, Revise, Confirm, Reject },
  Saved: { Get: SavedGet, SavedDetail, Complete, Dismiss, Reschedule, Delete },
  Sweep: { Tick },
};
