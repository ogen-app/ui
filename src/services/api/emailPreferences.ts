import { apiJson } from './http'

/**
 * The signed-in user's marketing-email subscription (CON-155).
 *
 * CON-154/CON-155 built the whole suppression engine server-side — signed
 * token, `List-Unsubscribe` headers, one-click, `email_suppressions`,
 * send-time gate, bounce/complaint webhook. But every endpoint it exposes is
 * **public and token-gated**: it verifies a signature lifted from an email
 * footer, not a session. None of them can answer "is the person looking at
 * this page subscribed?", which is the one thing a Profile toggle needs.
 *
 * ## The contract this file is written against
 *
 * Both routes sit behind the same `requireSelf` guard as `PUT`/`DELETE
 * /api/users/:id`, so they can only ever read or change your own subscription
 * (403 otherwise).
 *
 *     GET /api/users/:id/email-preferences
 *       200 {"marketing": true, "delivery_blocked": false}
 *
 *     PUT /api/users/:id/email-preferences   {"marketing": false}
 *       200 {"marketing": false, "delivery_blocked": false}
 *
 * `marketing: false` upserts `email_suppressions(email, scope='marketing',
 * reason='unsubscribe', source='user')`; `true` calls `RemoveMarketing(email)`.
 * Both already exist in `src/repository/email_suppressions.go`, so the handler
 * is thin. Keyed by the user's current address, like every other suppression —
 * which is also why changing the address on this same page silently starts
 * marketing mail again.
 *
 * `delivery_blocked` reports a `scope='all'` row, the one a hard bounce or a
 * spam complaint writes through the Resend webhook. It has to be reported
 * separately from `marketing`, because it is exactly the case where honouring
 * the toggle still sends nothing: `RemoveMarketing` does not touch an `all`
 * row, so someone who switched marketing back on would sit waiting for mail
 * that is being dropped for an unrelated reason. Only ops can clear it.
 *
 * **Not `/api/settings`.** That store is tenant-scoped and every key in it is
 * readable by the whole workspace (CLAUDE.md) — who has unsubscribed from what
 * is nobody else's business.
 */
export type EmailPreferences = {
  /** False once this address is suppressed from `kind=marketing` mail. */
  marketing: boolean
  /** A bounce or complaint is blocking *all* mail to this address. */
  deliveryBlocked: boolean
}

/** Wire shape, snake_case as the backend sends it. */
type EmailPreferencesBody = {
  marketing: boolean
  delivery_blocked: boolean
}

function preferencesPath(userId: string): string {
  return `/api/users/${userId}/email-preferences`
}

function fromWire(body: EmailPreferencesBody): EmailPreferences {
  return { marketing: body.marketing, deliveryBlocked: body.delivery_blocked }
}

export function getEmailPreferences(userId: string): Promise<EmailPreferences> {
  return apiJson<EmailPreferencesBody>(
    preferencesPath(userId),
    'Unable to read your email preferences',
  ).then(fromWire)
}

/**
 * The body carries `marketing` alone: `delivery_blocked` is the server's to
 * report and nobody's to set from here. The response is the new state rather
 * than an echo, so the caller can write it straight into the cache.
 */
export function setMarketingEmails(
  userId: string,
  marketing: boolean,
): Promise<EmailPreferences> {
  return apiJson<EmailPreferencesBody>(
    preferencesPath(userId),
    'Unable to update your email preferences',
    { method: 'PUT', body: { marketing } },
  ).then(fromWire)
}
