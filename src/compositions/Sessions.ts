import { inputContract } from "../input.ts";
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { concepts } from "../concepts.ts";

const { Sessioning, Authenticating } = concepts;

const Start = endpoint(
  "/recall/start",
  ({ username, password, user, session, expiresAt }) =>
    receive({ username, password })
      .then(Authenticating.login({ username, password }).responds({ user }))
      .then(Sessioning.start({ subject: user }).responds({ session, expiresAt }))
      .then(respond({ user, session, expiresAt })),
  { validators: inputContract("username", "password"), input: { required: ["username", "password"] } },
);

const Current = endpoint(
  "/recall/current",
  ({ session, user }) =>
    receive({ session })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(respond({ user })),
  { validators: inputContract("session"), input: { required: ["session"] } },
);

const Register = endpoint(
  "/recall/register",
  ({ username, password, user, session, expiresAt }) =>
    receive({ username, password })
      .then(Authenticating.register({ username, password }).responds({ user }))
      .then(Sessioning.start({ subject: user }).responds({ session, expiresAt }))
      .then(respond({ user, session, expiresAt })),
  { validators: inputContract("username", "password"), input: { required: ["username", "password"] } },
);
const End = endpoint(
  "/recall/end",
  ({ session, ended }) => receive({ session })
    .then(Sessioning.end({ session }).responds({ ended }))
    .then(respond({ ended })),
  { validators: inputContract("session"), input: { required: ["session"] } },
);
export const composition = { Start, Register, Current, End };
