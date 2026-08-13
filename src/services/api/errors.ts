import { apiUrl } from "./base";

/**
 * Thrown when a request never reached the backend — the `fetch` promise itself
 * rejected (server unreachable, connection refused, DNS failure). This is
 * categorically different from an HTTP error response: an HTTP response, even a
 * 4xx/5xx, means the server is up and answering. The root route guard relies on
 * this distinction to tell a "server is down" boot apart from a genuine fresh
 * install (which returns a real response saying setup isn't complete).
 */
export class ServerUnavailableError extends Error {
  constructor() {
    super("The server is unreachable");
    this.name = "ServerUnavailableError";
  }
}

/**
 * Like `fetch`, but converts a network-level rejection into a typed
 * `ServerUnavailableError`. A returned `Response` (any status) passes through
 * untouched, so callers keep handling HTTP errors as they normally would.
 */
export async function fetchOrThrowUnavailable(
  input: RequestInfo,
  init?: RequestInit
): Promise<Response> {
  try {
    return await fetch(typeof input === "string" ? apiUrl(input) : input, init);
  } catch {
    throw new ServerUnavailableError();
  }
}

/**
 * An HTTP error response, carrying the status alongside the backend's message.
 *
 * It extends `Error` and keeps `message` as the human-readable text, so every
 * existing `catch` that only reads the message is unaffected. The status is
 * here for the few callers that must tell *why* a request failed apart from
 * *that* it failed — analytics answers 503 when the deployment runs without an
 * analytics database, which is a state to explain, not an error to report.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * One rule failure from the pre-publish validation gate (mirrors
 * `platforms.ValidationError` in the Go backend, CON-73 §2.4). Only the
 * fields the UI consumes are declared; `message` is human-readable and
 * self-contained ("file is N bytes; platform allows up to M").
 */
type PlatformValidationError = {
  message?: string;
  rule?: string;
};

type ApiErrorBody = {
  error?: string;
  /**
   * Keyed by platform id. Sent with 422s from the validation gate — post
   * create, the draft → ready_for_publish PUT, and POST /:id/schedule.
   */
  platform_validation?: Record<string, PlatformValidationError[]>;
};

/**
 * Caps how many validation details are folded into one message so a post
 * with many failing attachments doesn't produce a paragraph.
 */
const MAX_VALIDATION_DETAILS = 4;

/**
 * The account-selection 422s (CON-150) send a bare machine code as `error`
 * — `AccountSelectionError.Reason` in
 * `src/post_actions/schedule/schedule.go`. Every other endpoint sends prose,
 * so without this the user would read "account_selection_required" in a
 * toast. The UI blocks these cases up front (see `getTransitionBlockers`);
 * what lands here is the race the client can't see — a second account
 * connected, or the chosen one disconnected, since the page loaded.
 */
const ACCOUNT_SELECTION_MESSAGES: Record<string, string> = {
  account_selection_required:
    "This platform has more than one connected account, so the post has to say which one it publishes as. Pick an account and try again.",
  account_unavailable:
    "The account this post publishes as is no longer connected. Pick another one and try again.",
  account_platform_mismatch:
    "The account this post publishes as belongs to a different platform. Pick one that matches and try again.",
};

function validationDetails(
  byPlatform: ApiErrorBody["platform_validation"]
): string[] {
  if (!byPlatform || typeof byPlatform !== "object") return [];
  // Dedupe: several attachments can fail the same rule with the same text.
  const seen = new Set<string>();
  for (const errs of Object.values(byPlatform)) {
    if (!Array.isArray(errs)) continue;
    for (const e of errs) {
      const detail = e?.message || e?.rule;
      if (detail) seen.add(detail);
    }
  }
  return [...seen];
}

/**
 * Extracts a human-readable error message from a non-OK API response. Prefers
 * the backend's `{ error: string }` JSON body, appending any
 * `platform_validation` rule failures so a 422 tells the user *which* check
 * failed; falls back to `fallback` when the body is absent, malformed, or has
 * no error string.
 */
export async function errorMessage(
  res: Response,
  fallback: string
): Promise<string> {
  try {
    const body = (await res.json()) as ApiErrorBody;
    if (typeof body.error === "string" && body.error.length > 0) {
      const accountMessage = ACCOUNT_SELECTION_MESSAGES[body.error];
      if (accountMessage) return accountMessage;
      const details = validationDetails(body.platform_validation);
      if (details.length === 0) return body.error;
      const shown = details.slice(0, MAX_VALIDATION_DETAILS);
      const more = details.length - shown.length;
      return `${body.error}: ${shown.join("; ")}${more > 0 ? ` (+${more} more)` : ""}`;
    }
  } catch {
    // fall through
  }
  return fallback;
}
