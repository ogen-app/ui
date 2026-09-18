/**
 * Per-browser feature-flag overrides — staging and local dev only.
 *
 * The problem: on staging one teammate needs to exercise a half-built feature
 * while everyone else keeps testing the app as it ships, and the copy team
 * seeing unfinished work costs a round of feedback nobody wanted. A flag is a
 * build-time constant (`featureFlags.ts`), so the only way to do that today is
 * a branch and a deploy of your own.
 *
 * An override therefore lives in **localStorage** — per browser, which is
 * exactly the grain the problem has. Deliberately *not* `/api/settings`: that
 * row is tenant-scoped and readable by the whole workspace, so a flag set
 * there would turn the feature on for the very people it is being kept from.
 * Not a cookie either — the server has no business in this.
 *
 * ## Why it cannot reach production
 *
 * `DEV_TOOLS` is a build-time constant. Vite substitutes both halves of it
 * before terser runs, so in a production build every branch below folds to a
 * literal `false` and collapses: `readFlagOverrides()` becomes `{}` and
 * nothing else here survives. Production ignores the storage key entirely —
 * writing it by hand does nothing — and *that*, rather than the absence of a
 * link, is what makes this safe to ship. An unlisted page is not a security
 * boundary and is not being asked to be one.
 *
 * On for `pnpm dev` always, and for any build made with `VITE_DEV_TOOLS=1`
 * (the staging image sets it — see the `Dockerfile`). Off by omission, which
 * is the direction a mistake here should fail in.
 *
 * ## Reading is a snapshot
 *
 * The overrides are read once, at module load, and kept in memory. Flags are
 * read from route `beforeLoad` guards, so a value that changed under a mounted
 * router would give you an app half-built against each answer; writing one
 * reloads the page instead (`FlagsPanel`). It also keeps `useFeatureFlag` a
 * property lookup rather than a `localStorage` hit per render.
 */

/** Whether the override machinery exists in this build at all. */
export const DEV_TOOLS =
  import.meta.env.DEV || import.meta.env.VITE_DEV_TOOLS === '1'

/** Device-local, like every other per-browser preference. */
const STORAGE_KEY = 'ogen.flagOverrides'

/**
 * `?ff=tasks,-activity` — a bare name forces a flag on, a leading `-` forces
 * it off, and `?ff=` alone clears every override.
 *
 * The parameter *merges* into what is already stored, so one bookmark per
 * feature composes rather than each link resetting the last. It is read and
 * stripped from the address bar before the router boots, for the same two
 * reasons `?lang=` is (`i18n/config.ts`): the routes' `validateSearch` schemas
 * would drop an unknown key on the next navigation anyway, and once stored the
 * parameter has no further job — it is an instruction, not state.
 *
 * This is the ergonomic half of the feature. The panel at `/flags` is for
 * seeing and undoing; a bookmarked link is how you actually turn one on.
 */
export const FLAG_QUERY_PARAM = 'ff'

export type FlagOverrides = Record<string, boolean>

/** localStorage throws in private-mode Safari and when storage is disabled. */
function readStored(): FlagOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    // Hand-edited or left over from an older shape: keep the booleans, drop
    // the rest, rather than letting one bad entry discard the whole set.
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        ([, value]) => typeof value === 'boolean',
      ),
    ) as FlagOverrides
  } catch {
    return {}
  }
}

function writeStored(next: FlagOverrides): void {
  try {
    if (Object.keys(next).length === 0) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // The change still applies to this page load; it just won't outlive it.
  }
}

let overrides: FlagOverrides = DEV_TOOLS ? readStored() : {}

/**
 * The overrides in force. `{}` in production, always — see the note above.
 *
 * `featureFlags.ts` is the only place that should consult this to *resolve* a
 * flag; everything else reads `useFeatureFlag`.
 */
export function readFlagOverrides(): FlagOverrides {
  if (!DEV_TOOLS) return {}
  return overrides
}

/** Force a flag on or off, or pass `null` to hand it back to the build. */
export function setFlagOverride(flag: string, value: boolean | null): void {
  if (!DEV_TOOLS) return
  const next = { ...overrides }
  if (value === null) delete next[flag]
  else next[flag] = value
  overrides = next
  writeStored(next)
}

/** Hand every flag back to the build's own values. */
export function clearFlagOverrides(): void {
  if (!DEV_TOOLS) return
  overrides = {}
  writeStored({})
}

/** The `?ff=` value that would reproduce the current set, for sharing. */
export function serializeFlagOverrides(source: FlagOverrides): string {
  return Object.entries(source)
    .map(([flag, on]) => (on ? flag : `-${flag}`))
    .join(',')
}

/**
 * Apply `?ff=` and strip it from the address bar.
 *
 * `known` is the build's flag ids: a name that isn't one is dropped with a
 * warning rather than stored, because a typo that silently does nothing is
 * the one failure this feature cannot afford — the whole point is that the
 * person using it is elsewhere, on staging, with no console open.
 *
 * The strip is a `replaceState`, not a navigation: it must not add a history
 * entry, or Back from the first in-app page would land on the same URL with
 * the parameter still on it.
 */
export function bootstrapFlagOverrides(known: readonly string[]): void {
  if (!DEV_TOOLS) return

  const url = new URL(window.location.href)
  const requested = url.searchParams.get(FLAG_QUERY_PARAM)
  if (requested === null) return

  url.searchParams.delete(FLAG_QUERY_PARAM)
  window.history.replaceState(window.history.state, '', url)

  if (requested.trim() === '') {
    clearFlagOverrides()
    return
  }

  const next = { ...overrides }
  for (const raw of requested.split(',')) {
    const token = raw.trim()
    if (token === '') continue
    const on = !token.startsWith('-')
    const flag = on ? token : token.slice(1)
    if (!known.includes(flag)) {
      console.warn(`[flags] ignoring "${flag}" — not a flag in this build`)
      continue
    }
    next[flag] = on
  }

  overrides = next
  writeStored(next)
}
