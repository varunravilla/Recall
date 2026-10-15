import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { concepts } from "../concepts.ts";

const { Sessioning } = concepts;

const Start = endpoint(
  "/recall/start",
  ({ user, session, expiresAt }) =>
    receive({ user })
      .then(Sessioning.start({ subject: user }).responds({ session, expiresAt }))
      .then(respond({ user, session, expiresAt })),
  { input: { required: ["user"] } },
);

const Current = endpoint(
  "/recall/current",
  ({ session, user }) =>
    receive({ session })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(respond({ user })),
  { input: { required: ["session"] } },
);

export const composition = { Start, Current };
