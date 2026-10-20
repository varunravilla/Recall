import { httpPolicy } from "@mit-sdg/sync-engine-http/policy";

export const policy = httpPolicy({
  basePath: "/api",
  publicErrors: {
    INVALID_CREDENTIALS: "UNAUTHORIZED",
    ACCOUNT_EXISTS: "CONFLICT",
    UNKNOWN_SESSION: "UNAUTHORIZED",
    EMPTY_CONTENT: "INVALID_REQUEST",
    ALREADY_COLLECTED: "CONFLICT",
    NOT_OWNER: "FORBIDDEN",
    NOT_PROPOSED: "CONFLICT",
    ALREADY_TRACKING: "CONFLICT",
    NOT_PENDING: "CONFLICT",
    NOT_SCHEDULED: "CONFLICT",
    NOT_YET: "CONFLICT",
    NOT_DUE: "CONFLICT",
  },
});
