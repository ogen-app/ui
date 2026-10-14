import type {
  AssetFacetField,
  AssetListKind,
  AssetQueryParams,
} from '@/types/assetList'

/**
 * What the Assets list is narrowed to (CON-371), and the one shape it travels
 * in: the URL.
 *
 * **The URL is the query.** Every key the page keeps in its address is a
 * parameter of `GET /api/content-bank/assets` (CON-374) under the same name —
 * `?kind=pdf&tag=<id>,<id>&ideas=undecided` — so a link a teammate opens asks
 * the server exactly what the sender's screen asked. Two values are kept in a
 * form the endpoint doesn't take, and both for the same reason: a link should
 * mean the same *words* when it is opened tomorrow. `updated_after=7d` is a
 * preset ("the last seven days") rather than a timestamp, and a custom range is
 * two days (`2026-10-01`) rather than two instants; both are turned into
 * absolute bounds in the viewer's time zone only when the request is made
 * (`toRequestParams`).
 *
 * Nothing here filters, counts or sorts anything. It only says what to ask.
 */

/** The fields of the filter bar, in the order a row reads. */
export const FILTER_FIELDS = [
  'title',
  'kind',
  'status',
  'campaign',
  'tag',
  'updated',
  'ideas',
  'text',
] as const

export type FilterField = (typeof FILTER_FIELDS)[number]

/** The fields that choose from a list of values, several at once. */
export const CHOICE_FIELDS = [
  'kind',
  'status',
  'campaign',
  'tag',
  'ideas',
] as const satisfies readonly FilterField[]

export type ChoiceField = (typeof CHOICE_FIELDS)[number]

export function isChoiceField(field: FilterField): field is ChoiceField {
  return (CHOICE_FIELDS as readonly FilterField[]).includes(field)
}

export const ASSET_KINDS: readonly AssetListKind[] = [
  'pdf',
  'web',
  'audio',
  'note',
  'image',
  'document',
  'spreadsheet',
  'csv',
  'presentation',
]

/**
 * The statuses the list filters by, problem states first — a failed or partial
 * asset is what somebody comes here to find. `pending` includes `processing`.
 */
export const FILTER_STATUSES = [
  'partial',
  'failed',
  'pending',
  'ready',
] as const

/**
 * The ideas values: the four verdicts of the row's pill (an asset with at least
 * one idea answered that way), then an analysed asset with none, then one not
 * read yet.
 */
export const IDEAS_VALUES = [
  'undecided',
  'yes',
  'later',
  'no',
  'none',
  'unread',
] as const

export type IdeasValue = (typeof IDEAS_VALUES)[number]

/** The `updated` facet's presets, in the server's vocabulary. */
export const UPDATED_PRESETS = ['1d', '7d', '30d', 'month'] as const

export type UpdatedPreset = (typeof UPDATED_PRESETS)[number]

/** The value `campaign` and `tag` take for "in none". */
export const NONE = 'none'

export const ASSET_SORTS = [
  '-ideas_undecided',
  '-updated_at',
  'updated_at',
  '-created_at',
  'created_at',
  'title',
  '-title',
  'relevance',
] as const

export type AssetSort = (typeof ASSET_SORTS)[number]

/**
 * Most undecided first (CON-378): the list is read for what is left to
 * answer, so the documents with work in them come up first — inside each
 * group, when the list is grouped.
 */
export const DEFAULT_SORT: AssetSort = '-ideas_undecided'

/**
 * What the list can be grouped by — the server's `group` values (CON-379),
 * in the order the menu offers them. The server orders by the group first and
 * counts each group over the whole match, so a group that spans pages still
 * says how many it holds. The server's `ideas` grouping is not offered: the
 * pill and the sort already say what is left to answer.
 */
export const ASSET_GROUPS = ['created', 'campaign', 'tag', 'kind'] as const

export type AssetGroup = (typeof ASSET_GROUPS)[number]

/** A grouping, or none — `none` is ours and is never sent. */
export type AssetGrouping = AssetGroup | 'none'

/**
 * Grouped by when documents were added unless the user chose otherwise:
 * Today, Past week, Past month, Earlier.
 */
export const DEFAULT_GROUP: AssetGrouping = 'created'

/**
 * A grouping read back from somewhere this build doesn't control — a
 * persisted preference from an older build, say — or null.
 */
export function isGrouping(value: unknown): value is AssetGrouping {
  return (
    value === 'none' || (ASSET_GROUPS as readonly unknown[]).includes(value)
  )
}

/** The longest `text` the server takes, and the shortest. */
export const TEXT_MIN = 2
export const TEXT_MAX = 200

/** One field's filter: any of `any` (or anything), none of `not`. */
export type ValueFilter = { any: string[]; not: string[] }

export type AssetFilter = Record<'title' | ChoiceField, ValueFilter> & {
  /** A preset or a `YYYY-MM-DD` day; inclusive. */
  updatedAfter: string | null
  /** A preset or a `YYYY-MM-DD` day; exclusive, as the endpoint reads it. */
  updatedBefore: string | null
  /** Searched inside the documents. */
  text: string
}

export const EMPTY_FILTER: AssetFilter = {
  title: { any: [], not: [] },
  kind: { any: [], not: [] },
  status: { any: [], not: [] },
  campaign: { any: [], not: [] },
  tag: { any: [], not: [] },
  ideas: { any: [], not: [] },
  updatedAfter: null,
  updatedBefore: null,
  text: '',
}

/**
 * The Assets page's search params. Every key is optional and a string: the
 * comma-joined values, exactly as the endpoint reads them.
 */
export type AssetListSearch = Partial<
  Record<
    | 'title'
    | 'title_not'
    | `${ChoiceField}`
    | `${ChoiceField}_not`
    | 'updated_after'
    | 'updated_before'
    | 'text',
    string
  >
> & { sort?: AssetSort }

const DAY = /^\d{4}-\d{2}-\d{2}$/

function isBound(value: string): boolean {
  return (
    (UPDATED_PRESETS as readonly string[]).includes(value) || DAY.test(value)
  )
}

/** The values a choice field may take, or null for ids (any string). */
function allowedValues(field: ChoiceField): readonly string[] | null {
  switch (field) {
    case 'kind':
      return ASSET_KINDS
    case 'status':
      return FILTER_STATUSES
    case 'ideas':
      return IDEAS_VALUES
    case 'campaign':
    case 'tag':
      return null
  }
}

/** A search value as a clean list: split, trimmed, deduplicated. */
function splitValues(raw: unknown): string[] {
  if (raw === undefined || raw === null) return []
  const text = Array.isArray(raw) ? raw.join(',') : String(raw)
  const out: string[] = []
  for (const part of text.split(',')) {
    const value = part.trim()
    if (value && !out.includes(value)) out.push(value)
  }
  return out
}

/**
 * The router's `validateSearch` for both Assets pages: keeps what the filter
 * understands and drops the rest, including values the endpoint would refuse
 * with a 400 — a stale link should narrow less, never fail.
 */
export function parseAssetListSearch(
  raw: Record<string, unknown>,
): AssetListSearch {
  const out: AssetListSearch = {}
  // The router parses `?title=2024` as a number; a title is text.
  for (const key of ['title', 'title_not'] as const) {
    const values = splitValues(raw[key])
    if (values.length) out[key] = values.join(',')
  }
  for (const field of CHOICE_FIELDS) {
    const allowed = allowedValues(field)
    for (const key of [field, `${field}_not`] as const) {
      const values = splitValues(raw[key]).filter(
        (v) => !allowed || allowed.includes(v),
      )
      if (values.length) out[key] = values.join(',')
    }
  }
  for (const key of ['updated_after', 'updated_before'] as const) {
    const value = raw[key] === undefined ? '' : String(raw[key]).trim()
    if (isBound(value)) out[key] = value
  }
  const text = raw.text === undefined ? '' : String(raw.text).trim()
  if (text.length >= TEXT_MIN) out.text = text.slice(0, TEXT_MAX)
  if ((ASSET_SORTS as readonly unknown[]).includes(raw.sort)) {
    const sort = raw.sort as AssetSort
    // Relevance means nothing without text, and the server refuses it.
    if (sort !== 'relevance' || out.text) out.sort = sort
  }
  return out
}

export function filterFromSearch(search: AssetListSearch): AssetFilter {
  const pair = (key: 'title' | ChoiceField): ValueFilter => ({
    any: splitValues(search[key]),
    not: splitValues(search[`${key}_not`]),
  })
  return {
    title: pair('title'),
    kind: pair('kind'),
    status: pair('status'),
    campaign: pair('campaign'),
    tag: pair('tag'),
    ideas: pair('ideas'),
    updatedAfter: search.updated_after ?? null,
    updatedBefore: search.updated_before ?? null,
    text: search.text ?? '',
  }
}

/** The search params for a filter and an explicitly chosen sort. */
export function searchFromFilter(
  filter: AssetFilter,
  sort?: AssetSort,
): AssetListSearch {
  const out: AssetListSearch = {}
  for (const key of ['title', ...CHOICE_FIELDS] as const) {
    if (filter[key].any.length) out[key] = filter[key].any.join(',')
    if (filter[key].not.length) out[`${key}_not`] = filter[key].not.join(',')
  }
  if (filter.updatedAfter) out.updated_after = filter.updatedAfter
  if (filter.updatedBefore) out.updated_before = filter.updatedBefore
  if (filter.text) out.text = filter.text
  if (sort && (sort !== 'relevance' || filter.text)) out.sort = sort
  return out
}

export function isFilterActive(filter: AssetFilter): boolean {
  return tokensOf(filter).length > 0
}

/**
 * The grouping the list is read in. It is a per-device preference
 * (`settingsStore.assetGrouping`), shared by the bank and every campaign's
 * page, not part of the address. A campaign's own page has no Campaign
 * grouping — every row is in that campaign — so a preference for one falls
 * back to the default there, and comes back in the bank.
 */
export function effectiveGroup(
  chosen: AssetGrouping | undefined,
  scopeCampaign: string | null,
): AssetGrouping {
  if (!chosen) return DEFAULT_GROUP
  if (chosen === 'campaign' && scopeCampaign) return DEFAULT_GROUP
  return chosen
}

/**
 * The order the list is read in: what was chosen, else relevance while
 * searching inside the documents, else most undecided first.
 */
export function effectiveSort(
  filter: AssetFilter,
  chosen: AssetSort | undefined,
): AssetSort {
  if (chosen && (chosen !== 'relevance' || filter.text)) return chosen
  return filter.text ? 'relevance' : DEFAULT_SORT
}

// ---------------------------------------------------------------------------
// Tokens — the filter as the bar shows it.

/**
 * One token in the bar: a field, its operator, and the values it names.
 *
 * Each field holds at most one token per operator, because that is all the
 * endpoint can say: values of one field are any-of (`tag=a,b` is "Gartner *or*
 * Finance"), so a second "Tag is" token could only ever mean the same as one
 * token naming both. Adding to a field therefore edits its token.
 *
 * `updated` is the exception in shape, not in rule: `negated` is "before", and
 * a custom range is one token with two bounds.
 */
export type FilterToken = {
  field: FilterField
  /** "is not", "doesn't contain", "has no", "before". */
  negated: boolean
  values: string[]
}

/** The tokens a filter shows, in field order. */
export function tokensOf(filter: AssetFilter): FilterToken[] {
  const tokens: FilterToken[] = []
  for (const field of FILTER_FIELDS) {
    if (field === 'updated') {
      const { updatedAfter: after, updatedBefore: before } = filter
      if (after && before && DAY.test(after) && DAY.test(before)) {
        tokens.push({ field, negated: false, values: [after, before] })
        continue
      }
      if (after) tokens.push({ field, negated: false, values: [after] })
      if (before) tokens.push({ field, negated: true, values: [before] })
      continue
    }
    if (field === 'text') {
      if (filter.text)
        tokens.push({ field, negated: false, values: [filter.text] })
      continue
    }
    const { any, not } = filter[field]
    if (any.length) tokens.push({ field, negated: false, values: any })
    if (not.length) tokens.push({ field, negated: true, values: not })
  }
  return tokens
}

/** The filter with this field and operator set to the token's values. */
export function withToken(
  filter: AssetFilter,
  token: FilterToken,
): AssetFilter {
  const next = cloneFilter(filter)
  const { field, negated, values } = token
  if (field === 'updated') {
    // A range is one token holding both bounds, so replacing either half of
    // it with a single bound replaces the whole range.
    const range = wasRange(filter)
    if (values.length === 2) {
      next.updatedAfter = values[0]
      next.updatedBefore = values[1]
    } else if (negated) {
      next.updatedBefore = values[0] ?? null
      if (range) next.updatedAfter = null
    } else {
      next.updatedAfter = values[0] ?? null
      if (range) next.updatedBefore = null
    }
    return next
  }
  if (field === 'text') {
    next.text = values[0] ?? ''
    return next
  }
  next[field] = negated
    ? { ...next[field], not: [...values] }
    : { ...next[field], any: [...values] }
  return next
}

/** The filter without the token's field and operator. */
export function withoutToken(
  filter: AssetFilter,
  token: Pick<FilterToken, 'field' | 'negated' | 'values'>,
): AssetFilter {
  const next = cloneFilter(filter)
  const { field, negated } = token
  if (field === 'updated') {
    if (token.values.length === 2) {
      next.updatedAfter = null
      next.updatedBefore = null
    } else if (negated) next.updatedBefore = null
    else next.updatedAfter = null
    return next
  }
  if (field === 'text') {
    next.text = ''
    return next
  }
  next[field] = negated
    ? { ...next[field], not: [] }
    : { ...next[field], any: [] }
  return next
}

/** The values a field's token already holds, for reopening its value step. */
export function tokenValues(
  filter: AssetFilter,
  field: FilterField,
  negated: boolean,
): string[] {
  return (
    tokensOf(filter).find(
      (t) => t.field === field && t.negated === negated && t.values.length,
    )?.values ?? []
  )
}

function wasRange(filter: AssetFilter): boolean {
  return (
    !!filter.updatedAfter &&
    !!filter.updatedBefore &&
    DAY.test(filter.updatedAfter) &&
    DAY.test(filter.updatedBefore)
  )
}

function cloneFilter(filter: AssetFilter): AssetFilter {
  return {
    title: { ...filter.title },
    kind: { ...filter.kind },
    status: { ...filter.status },
    campaign: { ...filter.campaign },
    tag: { ...filter.tag },
    ideas: { ...filter.ideas },
    updatedAfter: filter.updatedAfter,
    updatedBefore: filter.updatedBefore,
    text: filter.text,
  }
}

// ---------------------------------------------------------------------------
// Dates — presets and days, in the viewer's time zone.

/** `2026-10-07` for a local date. */
export function dayOf(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Local midnight at the start of a `YYYY-MM-DD` day. */
export function startOfDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** The day after, for turning an inclusive end into the endpoint's exclusive one. */
export function nextDay(day: string): string {
  const date = startOfDay(day)
  date.setDate(date.getDate() + 1)
  return dayOf(date)
}

export function previousDay(day: string): string {
  const date = startOfDay(day)
  date.setDate(date.getDate() - 1)
  return dayOf(date)
}

/**
 * Where a bound starts, as a local instant: a preset by the server's own rule
 * (`AssetUpdatedSince`) — the start of today, of the day six or twenty-nine
 * days ago, or of the month — and a day at its midnight.
 */
export function boundStart(bound: string, now: Date): Date {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (bound) {
    case '1d':
      return today
    case '7d':
      return new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 6,
      )
    case '30d':
      return new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 29,
      )
    case 'month':
      return new Date(today.getFullYear(), today.getMonth(), 1)
    default:
      return startOfDay(bound)
  }
}

export function isPreset(bound: string): bound is UpdatedPreset {
  return (UPDATED_PRESETS as readonly string[]).includes(bound)
}

/** The viewer's IANA time zone — what the `updated` presets are counted in. */
export function viewerTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

// ---------------------------------------------------------------------------
// The request.

export type RequestContext = {
  /** The campaign whose page this is; null in the workspace bank. */
  scopeCampaign: string | null
  sort: AssetSort
  /** Sent unless `none`; the default when omitted. */
  group?: AssetGrouping
  now: Date
  timeZone: string
}

/**
 * The filter as query parameters, in a stable key order — the same object is
 * the Query key, so two reads of one filter are one cache entry.
 */
export function toRequestParams(
  filter: AssetFilter,
  ctx: RequestContext,
): AssetQueryParams {
  const out: AssetQueryParams = {}
  for (const key of ['title', ...CHOICE_FIELDS] as const) {
    // On a campaign's page the campaign is the scope, never a filter.
    if (key === 'campaign' && ctx.scopeCampaign) continue
    if (filter[key].any.length) out[key] = filter[key].any.join(',')
    if (filter[key].not.length) out[`${key}_not`] = filter[key].not.join(',')
  }
  if (filter.updatedAfter)
    out.updated_after = boundStart(filter.updatedAfter, ctx.now).toISOString()
  if (filter.updatedBefore)
    out.updated_before = boundStart(filter.updatedBefore, ctx.now).toISOString()
  if (filter.text) out.text = filter.text
  if (ctx.scopeCampaign) out.scope_campaign = ctx.scopeCampaign
  out.sort = ctx.sort
  const group = ctx.group ?? DEFAULT_GROUP
  if (group !== 'none') out.group = group
  out.tz = ctx.timeZone
  return out
}

/** The facets the bar counts with, on a page in this scope. */
export function facetsFor(scopeCampaign: string | null): AssetFacetField[] {
  return scopeCampaign
    ? ['kind', 'status', 'tag', 'ideas', 'updated']
    : ['kind', 'status', 'campaign', 'tag', 'ideas', 'updated']
}

// ---------------------------------------------------------------------------
// Typing straight into the bar.

/** The words the old box understood, and a few more, as a way to jump to a value step. */
const FIELD_ALIASES: Record<string, FilterField> = {
  title: 'title',
  name: 'title',
  type: 'kind',
  kind: 'kind',
  status: 'status',
  statuses: 'status',
  campaign: 'campaign',
  tag: 'tag',
  tags: 'tag',
  updated: 'updated',
  ideas: 'ideas',
  idea: 'ideas',
  text: 'text',
  mentions: 'text',
}

/**
 * `tag:gar` → the Tag value step, narrowed by "gar"; `-tag:` → "is not". The
 * old box's syntax, kept as an accelerator for anyone who learned it — never
 * the only way in.
 */
export function parseFieldPrefix(
  input: string,
): { field: FilterField; negated: boolean; rest: string } | null {
  const match = /^(-?)([a-z]+):\s?(.*)$/i.exec(input)
  if (!match) return null
  const field = FIELD_ALIASES[match[2].toLowerCase()]
  if (!field) return null
  return { field, negated: match[1] === '-', rest: match[3] }
}
