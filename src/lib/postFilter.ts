import type { ValueFilter } from '@/lib/assetFilter'
import type { FieldKind, FilterModel, SmartToken } from '@/lib/smartFilter'
import type { PostStatus } from '@/types/posts'

/**
 * What a campaign's posts are narrowed to (CON-472), on its posts list and
 * its calendar — the Ideas and Assets rule (`lib/ideaFilter`), for posts.
 *
 * **The URL is the query.** Every key is a parameter of `GET
 * /api/campaigns/:id/posts` under the same name, so the assistant's
 * `set_filter` lands as the address, and "select all matching" is that same
 * string resolved by the server. Dates are `YYYY-MM-DD` days, read in the
 * viewer's zone (`tz`) — the endpoint takes no presets.
 *
 * The endpoint answers with the whole match, unpaged and uncounted, so the
 * filter has no facets and the table still sorts on the client.
 *
 * Nothing here filters anything. It only says what to ask.
 */

/** The fields of the sentence, in the order its clauses read. */
export const POST_FILTER_FIELDS = [
  'status',
  'platform',
  'post_type',
  'scheduled',
  'date',
] as const

export type PostFilterField = (typeof POST_FILTER_FIELDS)[number]

/** The fields that choose from a list of values, several at once. */
const CHOICE_FIELDS = ['status', 'platform', 'post_type'] as const
type ChoiceField = (typeof CHOICE_FIELDS)[number]

/** Every status, in the order a post moves through them — the server's. */
export const POST_STATUSES: readonly PostStatus[] = [
  'planned',
  'draft',
  'ready_for_publish',
  'scheduled',
  'scheduled_for_manual_publishing',
  'failed',
  'published',
  'not_published',
]

/**
 * Whether a post has a date at all. Two values, each the other's complement,
 * so the clause has no "not": an excluded one is asked as the other.
 */
export const POST_SCHEDULED = ['yes', 'no'] as const
export type PostScheduled = (typeof POST_SCHEDULED)[number]

export type PostFilter = Record<ChoiceField, ValueFilter> & {
  scheduled: PostScheduled | null
  /** A `YYYY-MM-DD` day; inclusive. */
  after: string | null
  /** A `YYYY-MM-DD` day; exclusive, as the endpoint reads it. */
  before: string | null
}

export const EMPTY_POST_FILTER: PostFilter = {
  status: { any: [], not: [] },
  platform: { any: [], not: [] },
  post_type: { any: [], not: [] },
  scheduled: null,
  after: null,
  before: null,
}

/** The posts pages' search params — the endpoint's own names, comma-joined. */
export type PostListSearch = Partial<
  Record<
    | ChoiceField
    | `${ChoiceField}_not`
    | 'scheduled'
    | 'scheduled_after'
    | 'scheduled_before',
    string
  >
>

const DAY = /^\d{4}-\d{2}-\d{2}$/

function splitValues(raw: unknown): string[] {
  if (raw === undefined || raw === null) return []
  const out: string[] = []
  for (const part of String(raw).split(',')) {
    const value = part.trim()
    if (value && !out.includes(value)) out.push(value)
  }
  return out
}

function day(raw: unknown): string | undefined {
  const value = raw === undefined ? '' : String(raw).trim()
  return DAY.test(value) ? value : undefined
}

/**
 * The router's `validateSearch` for the posts list and the calendar: keeps
 * what the filter understands and drops the rest — a stale link should narrow
 * less, never fail. Statuses are the server's list; platforms and types are
 * ids it checks itself.
 */
export function parsePostListSearch(
  raw: Record<string, unknown>,
): PostListSearch {
  const out: PostListSearch = {}
  for (const field of CHOICE_FIELDS) {
    for (const key of [field, `${field}_not`] as const) {
      const values = splitValues(raw[key]).filter(
        (v) => field !== 'status' || (POST_STATUSES as string[]).includes(v),
      )
      if (values.length) out[key] = values.join(',')
    }
  }
  const scheduled = splitValues(raw.scheduled)
  if (scheduled.length === 1 && scheduled[0] === 'yes') out.scheduled = 'yes'
  if (scheduled.length === 1 && scheduled[0] === 'no') out.scheduled = 'no'
  // The endpoint refuses "no date" with a date range; the range wins.
  const after = day(raw.scheduled_after)
  const before = day(raw.scheduled_before)
  if (after) out.scheduled_after = after
  if (before) out.scheduled_before = before
  if ((after || before) && out.scheduled === 'no') delete out.scheduled
  return out
}

export function postFilterFromSearch(search: PostListSearch): PostFilter {
  const pair = (key: ChoiceField): ValueFilter => ({
    any: splitValues(search[key]),
    not: splitValues(search[`${key}_not`]),
  })
  return {
    status: pair('status'),
    platform: pair('platform'),
    post_type: pair('post_type'),
    scheduled:
      search.scheduled === 'yes' || search.scheduled === 'no'
        ? search.scheduled
        : null,
    after: search.scheduled_after ?? null,
    before: search.scheduled_before ?? null,
  }
}

export function searchFromPostFilter(filter: PostFilter): PostListSearch {
  const out: PostListSearch = {}
  for (const key of CHOICE_FIELDS) {
    if (filter[key].any.length) out[key] = filter[key].any.join(',')
    if (filter[key].not.length) out[`${key}_not`] = filter[key].not.join(',')
  }
  if (filter.scheduled) out.scheduled = filter.scheduled
  if (filter.after) out.scheduled_after = filter.after
  if (filter.before) out.scheduled_before = filter.before
  return out
}

/**
 * The filter as the endpoint's query, in a stable key order — the same object
 * is the Query key. `tz` goes with a date bound only, so an unfiltered read
 * asks exactly what it always did.
 */
export function postRequestParams(
  filter: PostFilter,
  timeZone: string,
): Record<string, string> {
  const out: Record<string, string> = { ...searchFromPostFilter(filter) }
  if (filter.after || filter.before) out.tz = timeZone
  return out
}

export function isPostFilterActive(filter: PostFilter): boolean {
  return postTokensOf(filter).length > 0
}

// ---------------------------------------------------------------------------
// Tokens — the filter as the sentence reads it.

export type PostToken = SmartToken<PostFilterField>

export function postTokensOf(filter: PostFilter): PostToken[] {
  const tokens: PostToken[] = []
  for (const field of POST_FILTER_FIELDS) {
    if (field === 'scheduled') {
      if (filter.scheduled)
        tokens.push({ field, negated: false, values: [filter.scheduled] })
      continue
    }
    if (field === 'date') {
      // A range is one token holding both bounds; a lone end is "before".
      const { after, before } = filter
      if (after && before)
        tokens.push({ field, negated: false, values: [after, before] })
      else if (after) tokens.push({ field, negated: false, values: [after] })
      else if (before) tokens.push({ field, negated: true, values: [before] })
      continue
    }
    const { any, not } = filter[field]
    if (any.length) tokens.push({ field, negated: false, values: any })
    if (not.length) tokens.push({ field, negated: true, values: not })
  }
  return tokens
}

function clone(filter: PostFilter): PostFilter {
  return {
    ...filter,
    status: { ...filter.status },
    platform: { ...filter.platform },
    post_type: { ...filter.post_type },
  }
}

export function withPostToken(
  filter: PostFilter,
  token: PostToken,
): PostFilter {
  const next = clone(filter)
  const { field, negated, values } = token
  if (field === 'scheduled') {
    // Both values are no filter at all; one is the answer.
    next.scheduled =
      values.length === 1 && (values[0] === 'yes' || values[0] === 'no')
        ? values[0]
        : null
    // "No date" and a date range can't both hold; the newer choice wins.
    if (next.scheduled === 'no') {
      next.after = null
      next.before = null
    }
    return next
  }
  if (field === 'date') {
    if (values.length === 2) {
      next.after = values[0]
      next.before = values[1]
    } else if (negated) {
      next.before = values[0] ?? null
      next.after = null
    } else {
      next.after = values[0] ?? null
      next.before = null
    }
    if (next.scheduled === 'no') next.scheduled = null
    return next
  }
  next[field] = negated
    ? { ...next[field], not: [...values] }
    : { ...next[field], any: [...values] }
  return next
}

export function withoutPostToken(
  filter: PostFilter,
  token: Pick<PostToken, 'field' | 'negated'>,
): PostFilter {
  const next = clone(filter)
  const { field, negated } = token
  if (field === 'scheduled') {
    next.scheduled = null
    return next
  }
  if (field === 'date') {
    next.after = null
    next.before = null
    return next
  }
  next[field] = negated
    ? { ...next[field], not: [] }
    : { ...next[field], any: [] }
  return next
}

function kindOf(field: PostFilterField): FieldKind {
  return field === 'date' ? 'date' : 'choice'
}

/** The posts filter as the sentence reads it (`lib/smartFilter`). */
export const POST_FILTER_MODEL: FilterModel<PostFilter, PostFilterField> = {
  kindOf,
  tokensOf: postTokensOf,
  withToken: withPostToken,
  withoutToken: withoutPostToken,
  // Text search on posts is CON-475.
  freeText: [],
  searchMin: 1,
  textMax: 200,
}
