import {
  ASSET_KINDS,
  UPDATED_PRESETS,
  boundStart,
  dayOf,
  isPreset,
  type ValueFilter,
} from '@/lib/assetFilter'
import type { FieldKind, FilterModel, SmartToken } from '@/lib/smartFilter'

/**
 * What the Ideas list is narrowed to (CON-388 §4), and the one shape it
 * travels in: the URL — the Assets rule (`lib/assetFilter`), for ideas.
 *
 * **The URL is the query.** Every key is a parameter of `GET /api/ideas`
 * (CON-389) under the same name, so a link asks the server exactly what the
 * sender's screen asked, and a smart group (`/api/saved-views`) is that same
 * string saved. A preset date is kept as the preset (`created=7d`), never as
 * an instant, so a link and a group mean the same *words* tomorrow; the server
 * reads presets and `YYYY-MM-DD` days in the viewer's time zone (`tz`).
 *
 * Unlike Assets, the **pile, the sort and the grouping are in the address
 * too**: a smart group stores its grouping and sort (§5), and the pile is
 * where you are. The server drops the pile from a saved group by itself.
 *
 * Nothing here filters, counts or sorts anything. It only says what to ask.
 */

/** The fields of the filter bar, in the order a row reads. */
export const IDEA_FILTER_FIELDS = [
  'text',
  'origin',
  'source_asset',
  'kind',
  'campaign_id',
  'fit',
  'phase',
  'author',
  'created',
] as const

export type IdeaFilterField = (typeof IDEA_FILTER_FIELDS)[number]

/** The fields that choose from a list of values, several at once. */
export const IDEA_CHOICE_FIELDS = [
  'origin',
  'source_asset',
  'kind',
  'campaign_id',
  'fit',
  'phase',
  'author',
] as const satisfies readonly IdeaFilterField[]

export type IdeaChoiceField = (typeof IDEA_CHOICE_FIELDS)[number]

export const IDEA_ORIGINS = ['asset_analysis', 'manual'] as const
export const FIT_BANDS = ['high', 'medium', 'low', 'unscored'] as const

/** The value `source_asset` and `campaign_id` take for "none". */
export const NONE = 'none'

/** The piles, in tab order; `waiting` is the undecided one. */
export const IDEA_PILES = ['waiting', 'yes', 'later', 'no'] as const
export type IdeaPile = (typeof IDEA_PILES)[number]

/**
 * The orders the Sort menu offers (§4). Waiting longest is the default, as
 * the page has always read: best fit would bury a just-written idea under
 * the scored ones (an open question on CON-388).
 */
export const IDEA_SORTS = ['waiting', 'fit', 'created_desc'] as const
export type IdeaSort = (typeof IDEA_SORTS)[number]
export const DEFAULT_IDEA_SORT: IdeaSort = 'waiting'

/** What the list can be grouped by — the server's `group` values. */
export const IDEA_GROUPS = [
  'source',
  'campaign',
  'fit',
  'origin',
  'author',
  'created',
] as const
export type IdeaGroup = (typeof IDEA_GROUPS)[number]
export type IdeaGrouping = IdeaGroup | 'none'

/**
 * Grouped by when ideas were added unless chosen otherwise — Today, Past 7
 * days, Past month, Earlier — as the Assets list is, so the bands are always
 * there. `none` is the choice not to group, kept in the address as such.
 */
export const DEFAULT_IDEA_GROUP: IdeaGrouping = 'created'
const GROUPINGS = [...IDEA_GROUPS, 'none'] as const

/** The longest `text` the server takes. */
export const IDEA_TEXT_MAX = 200

export type IdeaFilter = Record<IdeaChoiceField, ValueFilter> & {
  /** A preset or a `YYYY-MM-DD` day; inclusive. */
  createdAfter: string | null
  /** A preset or a `YYYY-MM-DD` day; exclusive, as the endpoint reads it. */
  createdBefore: string | null
  /** In the title or the note. */
  text: string
}

export const EMPTY_IDEA_FILTER: IdeaFilter = {
  origin: { any: [], not: [] },
  source_asset: { any: [], not: [] },
  kind: { any: [], not: [] },
  campaign_id: { any: [], not: [] },
  fit: { any: [], not: [] },
  phase: { any: [], not: [] },
  author: { any: [], not: [] },
  createdAfter: null,
  createdBefore: null,
  text: '',
}

/** The Ideas page's search params — the endpoint's own names, comma-joined. */
export type IdeaListSearch = Partial<
  Record<
    | IdeaChoiceField
    | `${IdeaChoiceField}_not`
    | 'created'
    | 'created_after'
    | 'created_before'
    | 'text'
    | 'pile'
    | 'sort'
    | 'group'
    | 'view',
    string
  >
>

const DAY = /^\d{4}-\d{2}-\d{2}$/

/** The values a choice field may take, or null for ids and names. */
function allowedValues(field: IdeaChoiceField): readonly string[] | null {
  switch (field) {
    case 'origin':
      return IDEA_ORIGINS
    case 'kind':
      return ASSET_KINDS
    case 'fit':
      return FIT_BANDS
    default:
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

function oneOf<T extends string>(
  raw: unknown,
  allowed: readonly T[],
): T | undefined {
  return allowed.includes(raw as T) ? (raw as T) : undefined
}

/**
 * The router's `validateSearch` for both Ideas pages: keeps what the filter
 * understands and drops the rest, including values the endpoint would refuse
 * — a stale link should narrow less, never fail.
 */
export function parseIdeaListSearch(
  raw: Record<string, unknown>,
): IdeaListSearch {
  const out: IdeaListSearch = {}
  for (const field of IDEA_CHOICE_FIELDS) {
    const allowed = allowedValues(field)
    for (const key of [field, `${field}_not`] as const) {
      const values = splitValues(raw[key]).filter(
        (v) => !allowed || allowed.includes(v),
      )
      if (values.length) out[key] = values.join(',')
    }
  }
  const created = raw.created === undefined ? '' : String(raw.created)
  if (isPreset(created)) out.created = created
  else
    for (const key of ['created_after', 'created_before'] as const) {
      const value = raw[key] === undefined ? '' : String(raw[key]).trim()
      if (DAY.test(value)) out[key] = value
    }
  if (out.created) {
    const before =
      raw.created_before === undefined ? '' : String(raw.created_before)
    if (DAY.test(before)) out.created_before = before
  }
  const text = raw.text === undefined ? '' : String(raw.text).trim()
  if (text) out.text = text.slice(0, IDEA_TEXT_MAX)
  const pile = oneOf(raw.pile, IDEA_PILES)
  if (pile && pile !== 'waiting') out.pile = pile
  const sort = oneOf(raw.sort, IDEA_SORTS)
  if (sort && sort !== DEFAULT_IDEA_SORT) out.sort = sort
  const group = oneOf(raw.group, GROUPINGS)
  if (group && group !== DEFAULT_IDEA_GROUP) out.group = group
  // The smart group open, by id — ours, never sent to the list endpoint.
  if (typeof raw.view === 'string' && raw.view.trim())
    out.view = raw.view.trim()
  return out
}

export function ideaFilterFromSearch(search: IdeaListSearch): IdeaFilter {
  const pair = (key: IdeaChoiceField): ValueFilter => ({
    any: splitValues(search[key]),
    not: splitValues(search[`${key}_not`]),
  })
  return {
    origin: pair('origin'),
    source_asset: pair('source_asset'),
    kind: pair('kind'),
    campaign_id: pair('campaign_id'),
    fit: pair('fit'),
    phase: pair('phase'),
    author: pair('author'),
    createdAfter: search.created ?? search.created_after ?? null,
    createdBefore: search.created_before ?? null,
    text: search.text ?? '',
  }
}

/** The filter's half of the search params; the pile, sort and grouping are kept apart. */
export function searchFromIdeaFilter(filter: IdeaFilter): IdeaListSearch {
  const out: IdeaListSearch = {}
  for (const key of IDEA_CHOICE_FIELDS) {
    if (filter[key].any.length) out[key] = filter[key].any.join(',')
    if (filter[key].not.length) out[`${key}_not`] = filter[key].not.join(',')
  }
  if (filter.createdAfter) {
    if (isPreset(filter.createdAfter)) out.created = filter.createdAfter
    else out.created_after = filter.createdAfter
  }
  if (filter.createdBefore) out.created_before = filter.createdBefore
  if (filter.text) out.text = filter.text
  return out
}

/** The pile, sort and grouping a search names, with their defaults. */
export function ideaViewFromSearch(search: IdeaListSearch): {
  pile: IdeaPile
  sort: IdeaSort
  group: IdeaGrouping
} {
  return {
    pile: oneOf(search.pile, IDEA_PILES) ?? 'waiting',
    sort: oneOf(search.sort, IDEA_SORTS) ?? DEFAULT_IDEA_SORT,
    group: oneOf(search.group, GROUPINGS) ?? DEFAULT_IDEA_GROUP,
  }
}

export function isIdeaFilterActive(filter: IdeaFilter): boolean {
  return ideaTokensOf(filter).length > 0
}

// ---------------------------------------------------------------------------
// Tokens — the filter as the bar reads it.

export type IdeaToken = SmartToken<IdeaFilterField>

export function ideaTokensOf(filter: IdeaFilter): IdeaToken[] {
  const tokens: IdeaToken[] = []
  for (const field of IDEA_FILTER_FIELDS) {
    if (field === 'created') {
      const { createdAfter: after, createdBefore: before } = filter
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

function wasRange(filter: IdeaFilter): boolean {
  return (
    !!filter.createdAfter &&
    !!filter.createdBefore &&
    DAY.test(filter.createdAfter) &&
    DAY.test(filter.createdBefore)
  )
}

function clone(filter: IdeaFilter): IdeaFilter {
  const next = { ...filter }
  for (const key of IDEA_CHOICE_FIELDS) next[key] = { ...filter[key] }
  return next
}

export function withIdeaToken(
  filter: IdeaFilter,
  token: IdeaToken,
): IdeaFilter {
  const next = clone(filter)
  const { field, negated, values } = token
  if (field === 'created') {
    // A range is one token holding both bounds, so replacing either half of
    // it with a single bound replaces the whole range.
    const range = wasRange(filter)
    if (values.length === 2) {
      next.createdAfter = values[0]
      next.createdBefore = values[1]
    } else if (negated) {
      next.createdBefore = values[0] ?? null
      if (range) next.createdAfter = null
    } else {
      next.createdAfter = values[0] ?? null
      if (range) next.createdBefore = null
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

export function withoutIdeaToken(
  filter: IdeaFilter,
  token: Pick<IdeaToken, 'field' | 'negated' | 'values'>,
): IdeaFilter {
  const next = clone(filter)
  const { field, negated } = token
  if (field === 'created') {
    if (token.values.length === 2) {
      next.createdAfter = null
      next.createdBefore = null
    } else if (negated) next.createdBefore = null
    else next.createdAfter = null
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

function kindOf(field: IdeaFilterField): FieldKind {
  if (field === 'text') return 'search'
  if (field === 'created') return 'date'
  return 'choice'
}

/** The Ideas filter as the sentence reads it (`lib/smartFilter`). */
export const IDEA_FILTER_MODEL: FilterModel<IdeaFilter, IdeaFilterField> = {
  kindOf,
  tokensOf: ideaTokensOf,
  withToken: withIdeaToken,
  withoutToken: withoutIdeaToken,
  freeText: ['text'],
  searchMin: 1,
  textMax: IDEA_TEXT_MAX,
}

// ---------------------------------------------------------------------------
// The request.

export type IdeaQueryParams = Record<string, string>

export type IdeaRequestContext = {
  /** The campaign whose page this is; null on the workspace's. */
  scopeCampaign: string | null
  pile: IdeaPile
  sort: IdeaSort
  group: IdeaGrouping
  now: Date
  timeZone: string
}

/**
 * The filter as query parameters, in a stable key order — the same object is
 * the Query key, so two reads of one filter are one cache entry.
 */
export function toIdeaRequestParams(
  filter: IdeaFilter,
  ctx: IdeaRequestContext,
): IdeaQueryParams {
  const out: IdeaQueryParams = {}
  for (const key of IDEA_CHOICE_FIELDS) {
    // On a campaign's page the campaign is the scope, never a filter.
    if (key === 'campaign_id' && ctx.scopeCampaign) continue
    if (filter[key].any.length) out[key] = filter[key].any.join(',')
    if (filter[key].not.length) out[`${key}_not`] = filter[key].not.join(',')
  }
  if (filter.createdAfter) {
    if (isPreset(filter.createdAfter)) out.created = filter.createdAfter
    else out.created_after = filter.createdAfter
  }
  if (filter.createdBefore)
    // "Before last 7 days" means before the day that window starts on.
    out.created_before = isPreset(filter.createdBefore)
      ? dayOf(boundStart(filter.createdBefore, ctx.now))
      : filter.createdBefore
  if (filter.text) out.text = filter.text
  if (ctx.scopeCampaign) out.scope_campaign = ctx.scopeCampaign
  out.pile = ctx.pile
  out.sort = ctx.sort
  if (ctx.group !== 'none') out.group = ctx.group
  out.tz = ctx.timeZone
  return out
}

/** The facets the bar counts with, on a page in this scope. */
export function ideaFacetsFor(scopeCampaign: string | null): string[] {
  return [
    'origin',
    'source_asset',
    'kind',
    ...(scopeCampaign ? [] : ['campaign_id']),
    'fit',
    'phase',
    'author',
    'created',
  ]
}

/** The date presets, as the server names them. */
export const CREATED_PRESETS = UPDATED_PRESETS

// ---------------------------------------------------------------------------
// Smart groups (CON-388 §5) — the address saved.

/** The parts of a search a smart group stores: the filter, the sort, the grouping. */
const VIEW_KEYS = (search: IdeaListSearch): IdeaListSearch => {
  const { pile: _pile, view: _view, ...rest } = search
  return rest
}

/**
 * What a smart group saves of the address: the filter, the sort and the
 * grouping — never the pile, which is where you are, nor the open group — in
 * the canonical form the server stores (keys sorted, values sorted and
 * comma-joined), so two addresses that ask the same thing read the same.
 */
export function ideaViewQuery(search: IdeaListSearch): string {
  const parsed = parseIdeaListSearch(VIEW_KEYS(search))
  // The grouping is stored as what it is rather than as this build's
  // default: `group=created` when grouped by date, nothing when not grouped
  // (`none` is ours; the endpoint knows no such value).
  delete parsed.group
  const { group } = ideaViewFromSearch(search)
  if (group !== 'none') parsed.group = group
  return Object.keys(parsed)
    .sort()
    .map((key) => {
      const raw = parsed[key as keyof IdeaListSearch] ?? ''
      const values = key === 'text' ? [raw] : raw.split(',').sort()
      return `${encodeURIComponent(key)}=${values.map(encodeURIComponent).join(',')}`
    })
    .join('&')
}

/** A stored group's query as the address it opens: its filter, sort and grouping. */
export function searchFromViewQuery(query: string): IdeaListSearch {
  const raw: Record<string, string> = {}
  for (const [key, value] of new URLSearchParams(query)) raw[key] = value
  // A group stored without a grouping is one that does not group.
  if (!raw.group) raw.group = 'none'
  return VIEW_KEYS(parseIdeaListSearch(raw))
}

/** Whether the address asks what the stored group does — "edited" when not. */
export function matchesView(search: IdeaListSearch, query: string): boolean {
  return ideaViewQuery(search) === ideaViewQuery(searchFromViewQuery(query))
}
