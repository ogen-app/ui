import { normalizeContentFormat } from '@/lib/contentFormats'
import { normalizeGoalCadence } from '@/lib/postGoal'
import {
  MAX_RHYTHM_EVERY,
  SERIES_WEEKDAYS,
  type CampaignSeries,
  type ContentSeries,
  type SeriesRhythm,
  type SeriesSupply,
  type SeriesWeekday,
} from '@/types/series'
import { apiJson, apiVoid } from './http'
import { isRecord } from './json'

/**
 * Series' data layer (CON-264, CON-496): `/api/series` for the workspace's
 * series — the library and each campaign's own — and a campaign's
 * `/series` for the ones it runs.
 *
 * ## The shapes are chosen to be right, not convenient
 *
 * **Attach and detach rather than a list you restate.** `attachSeries` and
 * `detachSeries` move one id, and there is no "save the campaign's series"
 * call, for the reason CON-233 gives about `asset_ids` — a form that restates
 * a set from the snapshot it was built on puts a stale copy back over an
 * attach that landed a moment ago.
 *
 * **A rhythm is its own write.** `setSeriesRhythm` touches one row, so
 * changing how often the digest runs can't restate which series the campaign
 * runs at all.
 *
 * The client keeps its own model (`types/series`) and the wire is mapped here,
 * both ways, so nothing above this file knows the server's field names.
 */

/** A series as the server sends it. */
type SeriesBody = {
  id: string
  name: string
  promise: string
  recipe: string
  supply: string
  content_format: string | null
  default_rhythm: unknown
  campaign_id: string | null
  usage?: { drafts?: number; published?: number }
  updated_at: string
}

type CampaignSeriesBody = {
  campaign_id: string
  runs: { series_id: string; rhythm: unknown }[] | null
}

/**
 * A rhythm off the wire, or `null` — occasional — for none, and for one this
 * build can't read. The one parser: the assistant's series cards read theirs
 * through it too.
 */
export function seriesRhythm(value: unknown): SeriesRhythm | null {
  if (!isRecord(value)) return null
  const times = typeof value.times === 'number' ? value.times : 0
  if (times < 1 || (value.per !== 'week' && value.per !== 'month')) return null
  const rhythm: SeriesRhythm = { times, per: normalizeGoalCadence(value.per) }
  // `every: 1` is the server's absent: it never comes back.
  if (
    typeof value.every === 'number' &&
    value.every > 1 &&
    value.every <= MAX_RHYTHM_EVERY
  )
    rhythm.every = value.every
  if (SERIES_WEEKDAYS.includes(value.weekday as SeriesWeekday))
    rhythm.weekday = value.weekday as SeriesWeekday
  return rhythm
}

/** A rhythm as the server takes it: `every` only past one. */
function rhythmBody(rhythm: SeriesRhythm | null) {
  if (!rhythm) return null
  return {
    times: rhythm.times,
    per: rhythm.per,
    ...(rhythm.every && rhythm.every > 1 ? { every: rhythm.every } : {}),
    ...(rhythm.weekday ? { weekday: rhythm.weekday } : {}),
  }
}

function fromBody(body: SeriesBody): ContentSeries {
  return {
    id: body.id,
    name: body.name,
    promise: body.promise ?? '',
    recipe: body.recipe ?? '',
    supply: (body.supply === 'idea' ? 'idea' : 'self') as SeriesSupply,
    formatId: normalizeContentFormat(body.content_format),
    defaultRhythm: seriesRhythm(body.default_rhythm),
    scope: body.campaign_id
      ? { kind: 'campaign', campaignId: body.campaign_id }
      : { kind: 'workspace' },
    usage: {
      drafts: body.usage?.drafts ?? 0,
      published: body.usage?.published ?? 0,
    },
    updatedAt: body.updated_at,
  }
}

function campaignFromBody(body: CampaignSeriesBody): CampaignSeries {
  return {
    campaignId: body.campaign_id,
    runs: (body.runs ?? []).map((run) => ({
      seriesId: run.series_id,
      rhythm: seriesRhythm(run.rhythm),
    })),
  }
}

/** Every series the workspace can see, both scopes, oldest first. */
export async function listSeries(): Promise<ContentSeries[]> {
  const body = await apiJson<{ series: SeriesBody[] | null }>(
    '/api/series',
    'Unable to load the series',
  )
  return (body.series ?? []).map(fromBody)
}

/**
 * Create or replace one — one function, because the editor makes one gesture
 * and hands back a whole series whether it started from nothing, from a
 * starter, or from an existing entry. An empty `id` is one never stored.
 *
 * The PUT replaces every field it takes, so all of them are sent. A campaign's
 * own series is created inside that campaign, which also attaches it there;
 * its scope never changes after, except by promoting it. `usage` is the
 * server's and never sent.
 */
export async function saveSeries(
  series: ContentSeries,
): Promise<ContentSeries> {
  const fields = {
    name: series.name,
    promise: series.promise,
    recipe: series.recipe,
    supply: series.supply,
    content_format: series.formatId,
    default_rhythm: rhythmBody(series.defaultRhythm),
  }
  const body = series.id
    ? await apiJson<SeriesBody>(
        `/api/series/${encodeURIComponent(series.id)}`,
        'Unable to save the series',
        { method: 'PUT', body: fields },
      )
    : await apiJson<SeriesBody>('/api/series', 'Unable to save the series', {
        method: 'POST',
        body: {
          ...fields,
          campaign_id:
            series.scope.kind === 'campaign' ? series.scope.campaignId : null,
        },
      })
  return fromBody(body)
}

/**
 * Delete a series. Its runs go with it; posts it already produced keep their
 * text and their `series_id`.
 */
export function deleteSeries(id: string): Promise<void> {
  return apiVoid(
    `/api/series/${encodeURIComponent(id)}`,
    'Unable to delete the series',
    { method: 'DELETE' },
  )
}

/**
 * Move a campaign's own series into the workspace library. One-way: demoting
 * one other campaigns have picked up would narrow it to one of them.
 */
export async function promoteSeries(id: string): Promise<ContentSeries> {
  return fromBody(
    await apiJson<SeriesBody>(
      `/api/series/${encodeURIComponent(id)}/promote`,
      'Unable to move the series to the library',
      { method: 'POST' },
    ),
  )
}

/** Which series one campaign runs, and how often. */
export async function getCampaignSeries(
  campaignId: string,
): Promise<CampaignSeries> {
  return campaignFromBody(
    await apiJson<CampaignSeriesBody>(
      `/api/campaigns/${encodeURIComponent(campaignId)}/series`,
      'Unable to load the campaign’s series',
    ),
  )
}

/**
 * Add one series to a campaign — a union, never a restatement. Idempotent: one
 * it already runs keeps its rhythm, and a new one starts at the series'
 * suggestion.
 */
export async function attachSeries(
  campaignId: string,
  seriesId: string,
): Promise<CampaignSeries> {
  return campaignFromBody(
    await apiJson<CampaignSeriesBody>(
      `/api/campaigns/${encodeURIComponent(campaignId)}/series`,
      'Unable to add the series',
      { method: 'POST', body: { series_id: seriesId } },
    ),
  )
}

/** Take one out. The series itself is untouched — this is the campaign's row. */
export async function detachSeries(
  campaignId: string,
  seriesId: string,
): Promise<CampaignSeries> {
  return campaignFromBody(
    await apiJson<CampaignSeriesBody>(
      `/api/campaigns/${encodeURIComponent(campaignId)}/series/${encodeURIComponent(seriesId)}`,
      'Unable to remove the series',
      { method: 'DELETE' },
    ),
  )
}

/**
 * How often this campaign runs one of its series. `null` is occasional — it
 * runs when there is something for it and claims no slots in the plan.
 */
export async function setSeriesRhythm(
  campaignId: string,
  seriesId: string,
  rhythm: SeriesRhythm | null,
): Promise<CampaignSeries> {
  return campaignFromBody(
    await apiJson<CampaignSeriesBody>(
      `/api/campaigns/${encodeURIComponent(campaignId)}/series/${encodeURIComponent(seriesId)}`,
      'Unable to change how often the series runs',
      { method: 'PUT', body: { rhythm: rhythmBody(rhythm) } },
    ),
  )
}
