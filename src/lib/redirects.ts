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
  // URL parsers strip ASCII tab, LF and CR *before* interpreting the string,
  // so "/\t/evil.com" reaches the browser as "//evil.com" — an authority
  // again. Strip every ASCII control character first so the shape checks
  // below see what the parser will see.
  // Matching control characters is the entire point: they are what the URL
  // parser strips, so the shape checks below have to see the string without
  // them.
  // eslint-disable-next-line no-control-regex
  const cleaned = target.replace(/[\u0000-\u001F\u007F]/g, '')
  if (!cleaned.startsWith('/')) return FALLBACK
  // "//host" and "/\host" — an authority, not a path.
  if (cleaned[1] === '/' || cleaned[1] === '\\') return FALLBACK
  return cleaned
}
