import { apiUrl } from './base'

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
    super('The server is unreachable')
    this.name = 'ServerUnavailableError'
  }
}

/**
 * Like `fetch`, but converts a network-level rejection into a typed
 * `ServerUnavailableError`. A returned `Response` (any status) passes through
 * untouched, so callers keep handling HTTP errors as they normally would.
 */
export async function fetchOrThrowUnavailable(
  input: RequestInfo,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await fetch(typeof input === 'string' ? apiUrl(input) : input, init)
  } catch {
    throw new ServerUnavailableError()
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
  readonly status: number
  /**
   * The machine-readable reason, when the body carried one — the content
   * bank's `content_locked` and upload codes (CON-281/312), an entitlement's
   * `entitlement_exceeded`. Switch on this rather than on `message`, which is
   * prose.
   */
  readonly code?: string

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

/**
 * Why the server refused, when the reason was the workspace's plan (CON-295).
 *
 * The two words are `Entitlement`'s own (`types/entitlements.ts`): a denial the
 * client predicted and one the server delivered are the same two facts, and
 * wording them apart would leave the app saying different things about one
 * refusal depending on whether it saw it coming.
 *
 * `limit` and `current` are null on the tier refusal because the server sends
 * no numbers with it — a capability that is off has nothing to count. They are
 * nullable on the quota refusal too, for the narrower reason that a body is
 * whatever arrives: the fields are stated in the contract, and a message that
 * silently reads `undefined` as `0` would report a limit of zero on a malformed
 * payload.
 */
export type EntitlementDenial = {
  reason: 'tier' | 'limit'
  /** The entitlement key, verbatim — `active_campaigns`, `posts_total`. */
  feature: string
  limit: number | null
  current: number | null
}

/**
 * A refusal whose reason is the plan, typed so a call site can say so.
 *
 * It is an `ApiError` first: every existing `catch` reading `message` or
 * `status` keeps working, and `message` is a sentence about the action that
 * failed rather than the machine code — see `MACHINE_ONLY_CODES`. What this
 * class adds is the part that cannot be recovered from prose, so the surface
 * that wants to offer an upgrade has something to key on.
 *
 * Deliberately *not* paired with a cache invalidation the way a 401 or a 403 is
 * (`handleUnauthorized`, `handleForbidden`). Refetching the plan after a quota
 * refusal looks like the obvious repair and would change nothing: the API ships
 * allowances and no tally, so the entry comes back with the same limit and the
 * same uncounted `used` it already held. When a usage read exists that is the
 * moment to add one.
 */
export class EntitlementError extends ApiError {
  readonly reason: EntitlementDenial['reason']
  readonly feature: string
  readonly limit: number | null
  readonly current: number | null

  constructor(status: number, message: string, denial: EntitlementDenial) {
    super(
      status,
      message,
      denial.reason === 'limit'
        ? 'entitlement_exceeded'
        : 'feature_not_available',
    )
    this.name = 'EntitlementError'
    this.reason = denial.reason
    this.feature = denial.feature
    this.limit = denial.limit
    this.current = denial.current
  }
}

/**
 * One rule failure from the pre-publish validation gate (mirrors
 * `platforms.ValidationError` in the Go backend, CON-73 §2.4). Only the
 * fields the UI consumes are declared; `message` is human-readable and
 * self-contained ("file is N bytes; platform allows up to M").
 */
type PlatformValidationError = {
  message?: string
  rule?: string
}

type ApiErrorBody = {
  error?: string
  code?: string
  /**
   * Keyed by platform id. Sent with 422s from the validation gate — post
   * create, the draft → ready_for_publish PUT, and POST /:id/schedule.
   */
  platform_validation?: Record<string, PlatformValidationError[]>
  /**
   * The entitlement key a 402 or 403 refused on, with its numbers when it has
   * them (CON-295, `defaultErrorHandler` in the Go repo's `transport/server`).
   */
  feature?: string
  limit?: number
  current?: number
}

/**
 * Caps how many validation details are folded into one message so a post
 * with many failing attachments doesn't produce a paragraph.
 */
const MAX_VALIDATION_DETAILS = 4

/**
 * The account-selection 422s (CON-150) send a bare machine code as `error`
 * — `AccountSelectionError.Reason` in
 * `src/post_actions/schedule/schedule.go`. Every other endpoint sends prose,
 * so without this the user would read "account_selection_required" in a
 * toast. The UI blocks these cases up front (see `getTransitionBlockers`);
 * what lands here is the race the client can't see — a second account
 * connected, or the chosen one disconnected, since the page loaded.
 */
/**
 * Codes that are identifiers rather than sentences, and have no stand-in here.
 *
 * The account-selection codes above are answered with English written on this
 * side. These two are not, and the difference is the catalogue: a refusal about
 * the plan is copy the user reads, so it belongs in `i18n/resources` and is
 * rendered where a `t` exists — the mutation toast in `lib/queryClient.ts`. What
 * this set does is stop the identifier itself from being mistaken for prose. The
 * caller's own fallback ("Unable to create the campaign") takes its place: it
 * says less than the code pretends to, and unlike the code it is true and
 * readable.
 */
const MACHINE_ONLY_CODES = new Set([
  'entitlement_exceeded',
  'feature_not_available',
])

const ACCOUNT_SELECTION_MESSAGES: Record<string, string> = {
  account_selection_required:
    'This platform has more than one connected account, so the post has to say which one it publishes as. Pick an account and try again.',
  account_unavailable:
    'The account this post publishes as is no longer connected. Pick another one and try again.',
  account_platform_mismatch:
    'The account this post publishes as belongs to a different platform. Pick one that matches and try again.',
}

function validationDetails(
  byPlatform: ApiErrorBody['platform_validation'],
): string[] {
  if (!byPlatform || typeof byPlatform !== 'object') return []
  // Dedupe: several attachments can fail the same rule with the same text.
  const seen = new Set<string>()
  for (const errs of Object.values(byPlatform)) {
    if (!Array.isArray(errs)) continue
    for (const e of errs) {
      const detail = e?.message || e?.rule
      if (detail) seen.add(detail)
    }
  }
  return [...seen]
}

/**
 * The error body, or null when there wasn't one to read.
 *
 * A response body can only be consumed once, which is why this is separate from
 * the two things built out of it: `apiErrorFrom` needs both the message and the
 * structured fields, and parsing twice would hand the second caller an empty
 * stream rather than a second copy.
 */
async function readErrorBody(res: Response): Promise<ApiErrorBody | null> {
  try {
    return (await res.json()) as ApiErrorBody
  } catch {
    return null
  }
}

function messageFrom(body: ApiErrorBody | null, fallback: string): string {
  const error = body?.error
  if (typeof error !== 'string' || error.length === 0) return fallback
  if (MACHINE_ONLY_CODES.has(error)) return fallback
  const accountMessage = ACCOUNT_SELECTION_MESSAGES[error]
  if (accountMessage) return accountMessage
  const details = validationDetails(body?.platform_validation)
  if (details.length === 0) return error
  const shown = details.slice(0, MAX_VALIDATION_DETAILS)
  const more = details.length - shown.length
  return `${error}: ${shown.join('; ')}${more > 0 ? ` (+${more} more)` : ''}`
}

/** A wire number, or null — never a silent zero. See `EntitlementDenial`. */
function figure(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/**
 * The plan-shaped reading of a refusal, or null when it isn't one.
 *
 * **Both the status and the code have to agree.** 403 in particular is a
 * crowded answer: it is what an owner-only route tells a member, and what a tab
 * pinned to a workspace it has left gets back — which is why `handleForbidden`
 * exists and why it verifies before acting. Keying on the code alone would let
 * any of those be re-told as "your plan doesn't include this", and keying on the
 * status alone would be worse.
 */
function entitlementDenial(
  status: number,
  body: ApiErrorBody | null,
): EntitlementDenial | null {
  const feature = typeof body?.feature === 'string' ? body.feature : ''
  if (status === 402 && body?.error === 'entitlement_exceeded') {
    return {
      reason: 'limit',
      feature,
      limit: figure(body.limit),
      current: figure(body.current),
    }
  }
  if (status === 403 && body?.error === 'feature_not_available') {
    return { reason: 'tier', feature, limit: null, current: null }
  }
  return null
}

/**
 * Extracts a human-readable error message from a non-OK API response. Prefers
 * the backend's `{ error: string }` JSON body, appending any
 * `platform_validation` rule failures so a 422 tells the user *which* check
 * failed; falls back to `fallback` when the body is absent, malformed, or
 * carries a code rather than prose.
 *
 * Used directly by the services that hold their own `fetch` — the streams, the
 * uploads, the assistant. Those throw a plain `Error`, so an entitlement refusal
 * reaching one of them arrives as the fallback sentence and nothing more;
 * `apiErrorFrom` is what keeps the structured half, on the `apiJson`/`apiVoid`
 * path every mutation takes.
 */
export async function errorMessage(
  res: Response,
  fallback: string,
): Promise<string> {
  return messageFrom(await readErrorBody(res), fallback)
}

/**
 * The error to throw for a non-OK response: an `EntitlementError` when the plan
 * was the reason, an `ApiError` otherwise.
 */
export async function apiErrorFrom(
  res: Response,
  fallback: string,
): Promise<ApiError> {
  const body = await readErrorBody(res)
  const message = messageFrom(body, fallback)
  const denial = entitlementDenial(res.status, body)
  if (denial) return new EntitlementError(res.status, message, denial)
  const code =
    typeof body?.code === 'string' && body.code ? body.code : undefined
  return new ApiError(res.status, message, code)
}
