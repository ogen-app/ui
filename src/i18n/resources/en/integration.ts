/** Failures the publishing provider reports as bare machine codes. */
export const integration = {
  rateLimited: 'Too many attempts — try again shortly.',
  rateLimitedIn: 'Too many attempts — try again in {{seconds}}s.',
  disabled: 'The publishing integration is not configured on this server.',
  degraded:
    'The publishing integration is temporarily unavailable. Try again in a moment.',
  alreadyDisconnected: 'This account is already disconnected.',
  /** The server stops before touching local state on an upstream failure, so
   *  "nothing changed" is a guarantee rather than a guess. */
  removalUnconfirmed:
    'The publishing provider didn’t confirm the removal, so nothing was changed. Try again in a moment.',
}
