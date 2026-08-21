/**
 * What a pasted link has to look like before it is worth sending (CON-222).
 *
 * The backend refuses anything that isn't `http(s)` with a host, and it refuses
 * it after a round trip. Checking here is not about trusting the client — the
 * server still normalises and still runs its own SSRF resolution — it is about
 * the two mistakes people actually make in a URL field, and answering both
 * without a request: nothing pasted, and a bare host with no scheme.
 */

export type PageUrlCheck =
  | { ok: true; url: string }
  | { ok: false; error: string }

/**
 * The URL to submit, or why this one can't be.
 *
 * A missing scheme is completed rather than rejected: `example.com/article` is
 * what a copied address bar hands over on some browsers, and `url.Parse` reads
 * it as a *path*, so the server would answer "only http(s) urls are supported"
 * about a link that is fine. Everything else is left exactly as typed —
 * canonicalising is the backend's job, and it dedupes on its own normal form.
 */
export function checkPageUrl(input: string): PageUrlCheck {
  const trimmed = input.trim()
  if (trimmed === '') return { ok: false, error: 'Paste a link first.' }

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`

  let parsed: URL
  try {
    parsed = new URL(withScheme)
  } catch {
    return { ok: false, error: "That doesn't look like a web address." }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Only http and https links can be read.' }
  }
  // A host with no dot is either a typo or something on this machine's own
  // network, which the backend refuses anyway (`netguard`).
  if (!parsed.hostname.includes('.')) {
    return { ok: false, error: "That doesn't look like a web address." }
  }

  return { ok: true, url: parsed.href }
}

/**
 * The bit of a URL worth showing in a row: host without `www.`, then the path.
 *
 * Provenance, not a link — it sits under a title that is already the page's
 * own, so the scheme and the query string are noise. Falls back to the raw
 * string if it can't be parsed, because a document that came from somewhere
 * should never look like it came from nowhere.
 */
export function pageUrlLabel(url: string): string {
  try {
    const { hostname, pathname } = new URL(url)
    const host = hostname.replace(/^www\./, '')
    return pathname === '/' || pathname === '' ? host : `${host}${pathname}`
  } catch {
    return url
  }
}
