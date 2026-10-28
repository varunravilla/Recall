import { inputContract } from "../../input.ts";
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { no, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../../concepts.ts";

const { Collecting, Interpreting, Sessioning } = concepts;

export const AddCaption = endpoint(
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
    validators: inputContract("session", "item", "content", "collectedAt", "kind", "summary", "relevantAt"), input: { required: ["session", "item", "content", "collectedAt", "kind", "summary", "relevantAt"] },
  },
);

export const AddPhoto = endpoint(
  "/recall/photos/add",
  ({ session, user, item, content, collectedAt, imageData, mimeType, kind, summary, relevantAt, collection, interpretation }) =>
    receive({ session, item, content, collectedAt, imageData, mimeType, kind, summary, relevantAt })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(Collecting.addPhoto({ user, item, content, collectedAt, imageData, mimeType }).responds({ collection }))
      .then(Interpreting.propose({ item: collection, kind, summary, relevantAt }).responds({ interpretation }))
      .then(respond({ collection, interpretation })),
  { validators: inputContract("session", "item", "content", "collectedAt", "imageData", "mimeType", "kind", "summary", "relevantAt"), input: { required: ["session", "item", "content", "collectedAt", "imageData", "mimeType", "kind", "summary", "relevantAt"] } },
);

export const AddFoundPhoto = endpoint(
  "/recall/photos/found",
  ({ session, user, item, content, collectedAt, imageData, mimeType, kind, summary, collection, interpretation }) =>
    receive({ session, item, content, collectedAt, imageData, mimeType, kind, summary })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(Collecting.addPhoto({ user, item, content, collectedAt, imageData, mimeType }).responds({ collection }))
      .then(Interpreting.propose({ item: collection, kind, summary }).responds({ interpretation }))
      .then(Interpreting.confirm({ interpretation }).responds({ interpretation }))
      .then(respond({ collection, interpretation })),
  { validators: inputContract("session", "item", "content", "collectedAt", "imageData", "mimeType", "kind", "summary"), input: { required: ["session", "item", "content", "collectedAt", "imageData", "mimeType", "kind", "summary"] } },
);

export const GetPhoto = endpoint(
  "/recall/photos/get",
  ({ session, user, collection, imageData, mimeType }) => receive({ session, collection })
    .then(Sessioning.current({ session }).responds({ subject: user }))
    .then(
      where(Collecting._photo({ user, collection }).is({ imageData, mimeType }))
        .then(respond({ imageData, mimeType })).named("found"),
      where(no(Collecting._photo({ user, collection })))
        .then(respond({ error: "NOT_FOUND" as const })).named("missing"),
    ),
  { validators: inputContract("session", "collection"), input: { required: ["session", "collection"] } },
);

export const FindPhoto = endpoint(
  "/recall/photos/find",
  ({ session, user, item, collection }) => receive({ session, item })
    .then(Sessioning.current({ session }).responds({ subject: user }))
    .then(
      where(Collecting._find({ user, item }).is({ collection }))
        .then(respond({ collection })).named("found"),
      where(no(Collecting._find({ user, item })))
        .then(respond({ error: "NOT_FOUND" as const })).named("missing"),
    ),
  { validators: inputContract("session", "item"), input: { required: ["session", "item"] } },
);
