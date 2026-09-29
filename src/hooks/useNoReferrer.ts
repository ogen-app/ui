import { useEffect } from 'react'

/**
 * Sends no `Referer` from this page while it is mounted.
 *
 * For screens whose URL is a credential — an emailed `?token=` — so that no
 * image, font or third-party request made from here can carry it off. The
 * browser's default (`strict-origin-when-cross-origin`) already trims a
 * cross-origin referrer to the origin; this closes the same-origin case and
 * does not depend on the default.
 *
 * The meta tag is consulted per request, so setting it on mount covers every
 * request the page makes from then on. Whatever was there before is restored
 * on unmount, so the rest of the app keeps its own policy.
 *
 * It cannot cover what happened before mount: the scripts and favicon
 * `index.html` asks for are requested first. A page reached from an email
 * therefore also needs a `Referrer-Policy` header on the document itself —
 * see the `Caddyfile` — and this hook is the second layer, not the only one.
 */
export function useNoReferrer(): void {
  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="referrer"]')
    const previous = meta?.content ?? null
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'referrer'
      document.head.appendChild(meta)
    }
    meta.content = 'no-referrer'
    const tag = meta
    return () => {
      if (previous === null) tag.remove()
      else tag.content = previous
    }
  }, [])
}
