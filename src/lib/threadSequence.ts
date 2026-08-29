/**
 * Thread sequences — a post that publishes as a *chain* of posts rather than
 * one (CON-196).
 *
 * X and Threads both take one: Zernio calls it `platformSpecificData.
 * threadItems`, "the first item is the root post and subsequent items become
 * replies in order" (docs.zernio.com/platforms/threads, /platforms/twitter).
 * Its two consequences are what this module exists to encode:
 *
 * 1. **Each item is a post on the platform**, so every per-post rule applies
 *    per *item* — the character ceiling, the image cap, the one-video cap.
 *    Measuring the whole body against a single limit, which is what the editor
 *    did before this, is wrong in both directions: it fails a sequence that is
 *    fine and stays silent about the one item that isn't.
 * 2. **The post's `content` stops being what publishes.** Zernio: "When
 *    `threadItems` is provided, the top-level `content` field is used only for
 *    display and search purposes, it is NOT published." So the body becomes a
 *    derived summary of the items (`contentFromItems`) — it is what the
 *    calendar card, the list and search keep reading, and it must never be the
 *    place the words are edited.
 *
 * Attachments stay **post-level rows**, exactly as they are. An item names the
 * ones it carries by id, which is why adding sequences needs no change to
 * `post_attachments` at all — see `attachmentsByItem` for the one rule that
 * makes that safe.
 */
import { charCount, splitThread } from '@/lib/socialText'
import { attachmentKind, type PostAttachment } from '@/types/attachments'

/**
 * The post-type slug a sequence publishes under. The same one X has always
 * had — this is the feature that makes it mean something.
 */
export const SEQUENCE_SLUG = 'thread'

/**
 * Zernio's ids for the networks that take `threadItems`. The overview table at
 * docs.zernio.com/platforms lists only X, but the Threads platform page
 * documents a "Thread Sequence" content type with the identical field, so both
 * are here. LinkedIn, Facebook, Instagram and YouTube have no equivalent.
 */
const SEQUENCE_NETWORKS: ReadonlySet<string> = new Set(['twitter', 'threads'])

/**
 * A ceiling of ours, not the platforms'. Zernio documents no maximum item
 * count for either network, and neither does Meta — but an unbounded list in a
 * key/value row is a way to lose a whole post to one bad paste, and nobody
 * writes a 26-post chain on purpose.
 */
export const MAX_SEQUENCE_ITEMS = 25

/**
 * One post of the chain.
 *
 * `id` is the **editor's** identity and not Zernio's: the wire shape is
 * `{content, mediaItems}` and carries no ids at all. It exists so a row keeps
 * its React identity — and therefore its cursor and its scroll — across an
 * insert or a drag, which index keys cannot do. Whatever endpoint eventually
 * stores these may keep it or drop it; nothing outside this module reads it.
 */
export type ThreadItem = {
  id: string
  content: string
  /**
   * The post's attachments this item carries, in the order it carries them.
   * Ids only — the rows live under the post, and an id here that no longer
   * exists is dropped by `reconcileItems` rather than trusted.
   */
  attachment_ids: string[]
}

export function supportsSequence(zernioId: string | undefined): boolean {
  return !!zernioId && SEQUENCE_NETWORKS.has(zernioId)
}

/** Whether this (platform, post type) pair publishes as a chain. */
export function isSequencePost(
  zernioId: string | undefined,
  postType: string,
): boolean {
  return postType === SEQUENCE_SLUG && supportsSequence(zernioId)
}

export function newThreadItem(
  content = '',
  attachmentIds: string[] = [],
): ThreadItem {
  return { id: crypto.randomUUID(), content, attachment_ids: attachmentIds }
}

/**
 * Seeds a sequence from a post that was written as one body — what happens the
 * first time a post's type is switched to a sequence.
 *
 * Splits at blank lines, which is the convention the preview card has drawn
 * since it learned about threads, so a post that already reads as a chain
 * arrives as one. A body with nothing in it seeds a single empty item: a
 * sequence always has at least one post, or there is nothing to publish.
 */
export function itemsFromContent(content: string): ThreadItem[] {
  const parts = splitThread(content ?? '').filter((p) => p.trim().length > 0)
  if (parts.length === 0) return [newThreadItem()]
  return parts.slice(0, MAX_SEQUENCE_ITEMS).map((part) => newThreadItem(part))
}

/**
 * The display copy for the post's `content` field — a rejoin of the items,
 * blank-line separated, which is the form `itemsFromContent` reads back.
 *
 * Not what publishes (see the module note). It is written back on every change
 * so the calendar, the posts table, search and the assistant keep seeing the
 * post's words in the field they already read, instead of an empty post beside
 * a sequence they know nothing about.
 */
export function contentFromItems(items: ThreadItem[]): string {
  return items
    .map((i) => i.content.trim())
    .filter((c) => c.length > 0)
    .join('\n\n')
}

/**
 * Parses the stored value, or `null` when there is nothing usable there.
 *
 * `null` means "seed from the body" rather than "empty sequence", so a
 * malformed row reads as never-written instead of wiping the post — the value
 * comes out of a workspace-wide key/value store that anything can write.
 */
export function parseThreadItems(raw: string | null): ThreadItem[] | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    const items = parsed.flatMap((entry): ThreadItem[] => {
      if (typeof entry !== 'object' || entry === null) return []
      const { id, content, attachment_ids: ids } = entry as Record<
        string,
        unknown
      >
      return [
        {
          id: typeof id === 'string' && id ? id : crypto.randomUUID(),
          content: typeof content === 'string' ? content : '',
          attachment_ids: Array.isArray(ids)
            ? ids.filter((v): v is string => typeof v === 'string')
            : [],
        },
      ]
    })
    return items.length > 0 ? items.slice(0, MAX_SEQUENCE_ITEMS) : null
  } catch {
    return null
  }
}

/**
 * Drops references to attachments that are no longer on the post, and any
 * duplicate that would put one file on two items.
 *
 * Runs on every read of the pair, because the two are stored apart: deleting a
 * file from the media card is an attachment mutation that knows nothing about
 * the sequence, so a stale id is the normal state rather than a corruption.
 */
export function reconcileItems(
  items: ThreadItem[],
  attachments: Pick<PostAttachment, 'id'>[],
): ThreadItem[] {
  const live = new Set(attachments.map((a) => a.id))
  const claimed = new Set<string>()
  let changed = false
  const next = items.map((item) => {
    const ids = item.attachment_ids.filter((id) => {
      if (!live.has(id) || claimed.has(id)) return false
      claimed.add(id)
      return true
    })
    if (ids.length === item.attachment_ids.length) return item
    changed = true
    return { ...item, attachment_ids: ids }
  })
  // The same array back when there was nothing to fix, which is the common
  // case: this runs on every render, and a fresh array would re-run every memo
  // downstream of it — including the one that evaluates the whole chain.
  return changed ? next : items
}

/**
 * The post's attachments bucketed by the item that carries them.
 *
 * **An attachment no item names rides the root.** That single rule is what
 * lets attachments stay post-level rows: uploading from the media card, from
 * the assistant, or from an API that predates this feature needs to know
 * nothing about sequences, and the file still publishes. It also matches what
 * the X preview card has always drawn — the lead post carries the media.
 *
 * Named ids keep the item's own order; the implicit ones keep the post's
 * (`position`, as the list endpoint sorts them).
 */
export function attachmentsByItem<T extends Pick<PostAttachment, 'id'>>(
  items: ThreadItem[],
  attachments: T[],
): T[][] {
  const byId = new Map(attachments.map((a) => [a.id, a]))
  const named = new Set<string>()
  const buckets = items.map((item) =>
    item.attachment_ids.flatMap((id) => {
      const found = byId.get(id)
      if (!found) return []
      named.add(id)
      return [found]
    }),
  )
  if (buckets.length === 0) return buckets
  buckets[0] = [
    ...attachments.filter((a) => !named.has(a.id)),
    ...buckets[0],
  ]
  return buckets
}

/** The index of the item carrying this attachment — the root when unnamed. */
export function ownerIndex(items: ThreadItem[], attachmentId: string): number {
  const found = items.findIndex((i) => i.attachment_ids.includes(attachmentId))
  return found === -1 ? 0 : found
}

/**
 * Moves one attachment onto an item, taking it off whichever item had it.
 *
 * Moving a file back onto the root *names* it there rather than unnaming it:
 * an explicit choice should survive a later upload, and an unnamed file is
 * only unnamed because nobody has had the conversation about it yet.
 */
export function assignAttachment(
  items: ThreadItem[],
  attachmentId: string,
  toIndex: number,
): ThreadItem[] {
  if (toIndex < 0 || toIndex >= items.length) return items
  return items.map((item, i) => {
    const has = item.attachment_ids.includes(attachmentId)
    if (i === toIndex) {
      return has
        ? item
        : { ...item, attachment_ids: [...item.attachment_ids, attachmentId] }
    }
    return has
      ? {
          ...item,
          attachment_ids: item.attachment_ids.filter(
            (id) => id !== attachmentId,
          ),
        }
      : item
  })
}

export function moveItem(
  items: ThreadItem[],
  from: number,
  to: number,
): ThreadItem[] {
  if (from === to || from < 0 || to < 0) return items
  if (from >= items.length || to >= items.length) return items
  const next = items.slice()
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/** Adds an empty post after `index`. At the cap, nothing happens. */
export function insertItemAfter(
  items: ThreadItem[],
  index: number,
): ThreadItem[] {
  if (items.length >= MAX_SEQUENCE_ITEMS) return items
  const next = items.slice()
  next.splice(Math.min(index + 1, items.length), 0, newThreadItem())
  return next
}

/**
 * Removes a post from the chain, handing its attachments to the item that
 * takes its place — deleting a paragraph must not silently delete the user's
 * uploads with it. Removing the last remaining item empties it instead: a
 * sequence with no posts is not a state the editor can render.
 */
export function removeItem(items: ThreadItem[], index: number): ThreadItem[] {
  if (index < 0 || index >= items.length) return items
  if (items.length === 1) return [{ ...items[0], content: '' }]
  const orphaned = items[index].attachment_ids
  const rest = items.filter((_, i) => i !== index)
  if (orphaned.length === 0) return rest
  const heir = Math.min(index, rest.length - 1)
  return rest.map((item, i) =>
    i === heir
      ? { ...item, attachment_ids: [...item.attachment_ids, ...orphaned] }
      : item,
  )
}

/** Why one post of the chain would not publish as written. */
export type SequenceIssue =
  | 'empty'
  | 'over-limit'
  | 'too-many-images'
  | 'too-many-videos'

export type SequenceItemReport = {
  item: ThreadItem
  /** 1-based, because the chain is counted the way the reader will read it. */
  position: number
  /** Code points, via `charCount` — the platforms' own unit. */
  count: number
  images: number
  videos: number
  issues: SequenceIssue[]
}

export type EvaluateSequenceInput = {
  items: ThreadItem[]
  attachments: Pick<PostAttachment, 'id' | 'mime_type'>[]
  /**
   * The platform's per-post character ceiling, which is per *item* here.
   * `null` or `undefined` while it loads — no verdict rather than a wrong one.
   */
  charLimit: number | null | undefined
  /** Images one post may carry: 4 on X, 10 on Threads. */
  imageCap: number | null | undefined
  /** Videos one post may carry — 1 on both, from the server's video rules. */
  videoCap: number | null | undefined
}

/**
 * Every item's verdict, in one pass.
 *
 * The editor's per-row marks and the preview's notes both read this, so "which
 * post is the problem" has exactly one answer — the same arrangement
 * `threadSegments` already gives the X card.
 */
export function evaluateSequence(
  input: EvaluateSequenceInput,
): SequenceItemReport[] {
  const { items, attachments, charLimit, imageCap, videoCap } = input
  const buckets = attachmentsByItem(items, attachments)

  return items.map((item, i) => {
    const carried = buckets[i] ?? []
    const images = carried.filter(
      (a) => attachmentKind(a.mime_type) === 'image',
    ).length
    const videos = carried.filter(
      (a) => attachmentKind(a.mime_type) === 'video',
    ).length
    const count = charCount(item.content)

    const issues: SequenceIssue[] = []
    // An item with no words is only a problem when it carries nothing either:
    // a post that is one image and no caption is legal on both networks.
    if (item.content.trim().length === 0 && carried.length === 0) {
      issues.push('empty')
    }
    if (charLimit != null && count > charLimit) issues.push('over-limit')
    if (imageCap != null && images > imageCap) issues.push('too-many-images')
    if (videoCap != null && videos > videoCap) issues.push('too-many-videos')

    return { item, position: i + 1, count, images, videos, issues }
  })
}

/** True when any post of the chain would be refused as written. */
export function sequenceHasIssues(reports: SequenceItemReport[]): boolean {
  return reports.some((r) => r.issues.length > 0)
}
