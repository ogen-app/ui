import { getActiveWorkspaceId } from '@/lib/activeWorkspace'
import {
  normalizeContentFormat,
  type ContentFormatId,
} from '@/lib/contentFormats'

/**
 * The one thing a post now records that `/api/posts` has no column for: which
 * shape it takes (CON-264).
 *
 * Kept here, in one file, so the day `content_format` exists is a deletion
 * rather than a refactor — the same arrangement `brandLocal.ts` uses for the
 * facts ledger's metadata, and for the same reason.
 *
 * ## What is faked
 *
 * All of it. A format is not a field on the post, not part of `PostPayload`,
 * and nothing on the server reads it. Note what that means for the two rules
 * that usually govern writes here: a format cannot ride the post PUT, so none
 * of the presence-aware reasoning in `postToPayload` applies, and nothing an
 * autosave does can clobber it. It is also outside CON-251's content lock,
 * which is not a decision so much as an unavoidable consequence — the server
 * cannot refuse a write it never sees. **Once the column lands it belongs
 * inside the lock**, because the shape a published post took is a fact about
 * what went out rather than an input to the next generation.
 *
 * ## What the fake costs, said out loud
 *
 * It is **per browser**. A colleague opening the same post sees no format, and
 * the grouping that is the whole argument for the field — *our explainers land,
 * our listicles do not* — is computed over one laptop's filing. That is
 * acceptable for a screen being designed and is not acceptable shipped: a
 * measurement one browser wide is worse than none, because it looks like an
 * answer. The column has to exist before anybody outside the team sees this.
 */

type Store = {
  /** Format id, keyed by post id. Absent means the post has no format. */
  formats: Record<string, ContentFormatId>
}

const EMPTY: Store = { formats: {} }

function storeKey(): string {
  return `ogen.content.local.${getActiveWorkspaceId() ?? 'default'}`
}

function read(): Store {
  try {
    const stored = localStorage.getItem(storeKey())
    if (stored) return { ...EMPTY, ...(JSON.parse(stored) as Store) }
  } catch {
    // Unreadable reads as a workspace where nothing has been filed, which is
    // what every post looked like before this existed.
  }
  return structuredClone(EMPTY)
}

function write(store: Store): void {
  try {
    localStorage.setItem(storeKey(), JSON.stringify(store))
  } catch {
    // Quota or private mode. The post is still saved; its format is not.
  }
}

/**
 * The format filed against a post, or `null`.
 *
 * Narrowed on the way out rather than cast: a value written by a build that
 * knew a format this one does not lands as *no format*, which is a state every
 * screen draws, instead of as a picker whose value matches none of its options.
 */
export function readPostFormat(postId: string): ContentFormatId | null {
  return normalizeContentFormat(read().formats[postId])
}

/** Every filing at once — what a list groups by without a read per row. */
export function readPostFormats(): Record<string, ContentFormatId> {
  const { formats } = read()
  const out: Record<string, ContentFormatId> = {}
  for (const [postId, value] of Object.entries(formats)) {
    const format = normalizeContentFormat(value)
    if (format) out[postId] = format
  }
  return out
}

/** File a post under a format, or `null` to clear it. */
export function writePostFormat(
  postId: string,
  format: ContentFormatId | null,
): void {
  const store = read()
  const formats = { ...store.formats }
  if (format) formats[postId] = format
  else delete formats[postId]
  write({ ...store, formats })
}
