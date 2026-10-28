import { inputContract } from "../../input.ts";
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former, no, where, whether } from "@mit-sdg/sync-engine/language";
import { concepts } from "../../concepts.ts";

const { Collecting, Interpreting, Reminding, Sessioning, Tracking } = concepts;

export const InboxBook = former(
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

export const List = endpoint(
  "/recall/inbox/list",
  ({ session, user, book }) =>
    receive({ session })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(respond({ book: InboxBook({ user }) })),
  { validators: inputContract("session"), input: { required: ["session"] } },
);

export const LibraryBook = former(
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

export const LibraryList = endpoint(
  "/recall/library/list",
  ({ session, user, book }) =>
    receive({ session })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(respond({ book: LibraryBook({ user }) })),
  { validators: inputContract("session"), input: { required: ["session"] } },
);

export const SavedDetail = former(
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

export const SavedGet = endpoint(
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
  { validators: inputContract("session", "collection"), input: { required: ["session", "collection"] } },
);
