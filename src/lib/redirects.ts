/**
 * Where the login screen is allowed to send you afterwards.
 *
 * The root guard writes `location.href` into `?redirect=`, so the value is
 * attacker-controllable — anyone can hand out a link to our own login page
 * carrying any destination they like. The check has to be that the target is
 * a path *on this app*, not merely that it looks path-shaped.
 *
 * `startsWith("/")` alone is not that check: `//evil.com` and `/\evil.com`
 * both pass it and both are protocol-relative URLs that browsers resolve to
 * another origin. A second character that is a slash or a backslash is what
 * separates "a path" from "an authority".
 */
const FALLBACK = '/'

export function safeRedirect(target: string | undefined): string {
  if (!target) return FALLBACK
  if (!target.startsWith('/')) return FALLBACK
  // "//host" and "/\host" — an authority, not a path.
  if (target[1] === '/' || target[1] === '\\') return FALLBACK
  return target
}
