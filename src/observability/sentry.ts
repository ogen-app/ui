/**
 * Sentry browser error monitoring + tracing (CON-304, the UI half of CON-302).
 *
 * The browser is the head of the end-to-end trace: a page load or navigation
 * opens a transaction, every `fetch`/XHR to the API becomes a child span, and
 * `sentry-trace`/`baggage` are propagated so the server trace continues this
 * one. Errors anywhere attach to the active trace.
 *
 * Locked decisions this module obeys (see CON-302):
 *  - D2  SaaS Sentry — configuration is env only, nothing to self-host.
 *  - D3  Conservative capture — no session replay (the integration is simply
 *        never added), request bodies and query strings are scrubbed, and only
 *        stable ids (user, tenant) leave the browser.
 *  - D4  Fail-open — with `VITE_SENTRY_DSN` unset the SDK is never initialised
 *        and the app behaves exactly as it did before this feature existed.
 *        This is env-gated, not a feature flag: a flag means "not built yet",
 *        whereas telemetry is built and toggled by whether a DSN is configured,
 *        mirroring the server's `ANALYTICS_DSN` fail-open pattern.
 */
import * as Sentry from '@sentry/react'
import type { AnyRouter } from '@tanstack/react-router'

import { ApiError, ServerUnavailableError } from '@/services/api/errors'
import { useAuthStore } from '@/stores/authStore'
import type { User } from '@/types/user'

const DSN = import.meta.env.VITE_SENTRY_DSN ?? ''

/**
 * `@sentry/react` v10 does not re-export `TransactionEvent`, so derive it from
 * the SDK's own `beforeSendTransaction` option type rather than naming it.
 */
type TransactionEvent = Parameters<
  NonNullable<
    NonNullable<Parameters<typeof Sentry.init>[0]>['beforeSendTransaction']
  >
>[0]

/** Whether a DSN is configured — the single fail-open gate (D4). */
export function isTelemetryEnabled(): boolean {
  return DSN.length > 0
}

/**
 * Which outbound requests get `sentry-trace`/`baggage` attached. Deliberately
 * narrow: the API only, never a third party. The default same-origin deploy
 * addresses the API at the relative `/api/*`; a decoupled deploy sets
 * `VITE_API_URL` to an absolute origin (`base.ts`). Everything else — most
 * importantly the cross-origin Sanity reads behind the help centre — must never
 * receive our trace headers or any credentials.
 */
function tracePropagationTargets(): (string | RegExp)[] {
  const targets: (string | RegExp)[] = [/^\/api\//]
  const apiOrigin = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')
  if (apiOrigin) targets.push(apiOrigin)
  return targets
}

/** Clamp the env-supplied head sample rate to [0, 1], defaulting to 0.1 (D3). */
function parseSampleRate(raw: string | undefined): number {
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 0.1
}

/**
 * Public endpoints whose capability token is a *path* segment rather than a
 * query parameter, so stripping the query string alone would still ship it.
 * The segment after each prefix is replaced with `:token`.
 */
const PATH_TOKEN_PREFIXES = [
  '/api/invitations/accept/',
  '/api/security/login-alerts/',
]

/**
 * A URL — or a span description such as `GET /api/…` — with its query string
 * dropped and any path-borne token replaced by `:token`.
 */
function redactUrl(url: string): string {
  const q = url.indexOf('?')
  let out = q === -1 ? url : url.slice(0, q)
  for (const prefix of PATH_TOKEN_PREFIXES) {
    const at = out.indexOf(prefix)
    if (at === -1) continue
    const start = at + prefix.length
    const end = out.indexOf('/', start)
    out = out.slice(0, start) + ':token' + (end === -1 ? '' : out.slice(end))
  }
  return out
}

/** Span attributes the fetch/XHR instrumentation fills with the request URL. */
const SPAN_URL_KEYS = ['url', 'http.url', 'url.full'] as const

/**
 * Removes anything that could carry a token or PII from an event in place:
 * query strings and path-borne tokens (the emailed links carry one or the
 * other), request bodies, and cookies — across the request, the breadcrumbs
 * and a transaction's spans. The route template, status and stable ids are
 * what remain — enough to group and correlate, nothing to leak (D3).
 *
 * Exported for its unit test; not called directly outside this module.
 */
export function redactEvent(event: Sentry.Event): void {
  if (event.request?.url) {
    event.request.url = redactUrl(event.request.url)
  }
  for (const crumb of event.breadcrumbs ?? []) {
    for (const key of ['url', 'to', 'from'] as const) {
      const value = crumb.data?.[key]
      if (typeof value === 'string') crumb.data![key] = redactUrl(value)
    }
  }
  for (const span of event.spans ?? []) {
    if (span.description) span.description = redactUrl(span.description)
    const data = span.data as Record<string, unknown> | undefined
    if (!data) continue
    for (const key of SPAN_URL_KEYS) {
      const value = data[key]
      if (typeof value === 'string') data[key] = redactUrl(value)
    }
    delete data['http.query']
  }
  if (event.request) {
    delete event.request.data
    delete event.request.cookies
  }
}

/**
 * `beforeSend` — scrub, and drop the errors the app already handles.
 *
 * `ServerUnavailableError` is control flow: the root guard catches it and shows
 * the outage page. An `ApiError` below 500 is an expected answer the user has
 * already seen as a toast (a 401 triggers session recovery, a 422 is a
 * validation message). Both are noise here. A 5xx `ApiError` is kept — an
 * unexpected server failure is worth a breadcrumb on the UI side, and the
 * linked trace reaches the server's own capture of it.
 */
export function beforeSend(
  event: Sentry.ErrorEvent,
  hint: Sentry.EventHint,
): Sentry.ErrorEvent | null {
  const error = hint.originalException
  if (error instanceof ServerUnavailableError) return null
  if (error instanceof ApiError && error.status < 500) return null
  redactEvent(event)
  return event
}

/** `beforeSendTransaction` — same URL/body scrubbing, no drop rules. */
export function beforeSendTransaction(
  event: TransactionEvent,
): TransactionEvent {
  redactEvent(event)
  return event
}

/**
 * Attach non-PII identity to every event and keep it in step with the session.
 *
 * The auth store is the one seam: the root guard refreshes it on every page
 * load (`setUser`/`clearUser`) and logout clears it, so a single subscription
 * covers login, logout and cross-tab session expiry without touching any of
 * those call sites. Only the stable id and tenant tag are sent — never email,
 * name or content.
 */
function bindIdentity(): void {
  const apply = (user: User | null): void => {
    Sentry.setUser(user ? { id: user.id } : null)
    Sentry.setTag('tenant_id', user?.tenant?.id)
  }
  apply(useAuthStore.getState().user)
  useAuthStore.subscribe((state) => apply(state.user))
}

/**
 * Initialise telemetry once, at bootstrap, before render. A no-op when no DSN
 * is configured (D4). Takes the router so the browser-tracing integration names
 * transactions by route template rather than raw URL — which is both more
 * useful and less to scrub.
 */
export function initTelemetry(router: AnyRouter): void {
  if (!isTelemetryEnabled()) return

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? 'development',
    release: import.meta.env.VITE_APP_RELEASE || undefined,
    // No `replayIntegration` — session replay is off by design (D3).
    integrations: [Sentry.tanstackRouterBrowserTracingIntegration(router)],
    tracesSampleRate: parseSampleRate(
      import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE,
    ),
    tracePropagationTargets: tracePropagationTargets(),
    beforeSend,
    beforeSendTransaction,
  })

  bindIdentity()
}
