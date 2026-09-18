import type {
  CampaignSeries,
  CampaignSeriesRun,
  ContentSeries,
  SeriesRhythm,
} from '@/components/series/types'
import { getActiveWorkspaceId } from '@/lib/activeWorkspace'

/**
 * Series' data layer — **a stub, with no server behind any of it** (CON-264).
 *
 * Written the way `services/api/brand.ts` was written for the length of
 * CON-227: the signatures are the ones the endpoints will have, and the bodies
 * are `localStorage` and a small delay. When the tables land, each body becomes
 * one `apiJson` call and **nothing above this file changes** — the hook, the
 * routes and the components are already written against these shapes. That is
 * the whole reason this is a plain module and not a service worker: a
 * fetch-level mock buys wire fidelity for a contract nobody has agreed, and
 * ends up inventing the API it is pretending to serve.
 *
 * ## The shapes are chosen to be right, not convenient
 *
 * **Attach and detach rather than a list you restate.** `attachSeries` and
 * `detachSeries` move one id, and there is deliberately no "save the campaign's
 * series" call that takes the whole set. The stub could trivially offer one;
 * the endpoint must not, for the reason CON-233 gives about `asset_ids` — a
 * form that restates a set from the snapshot it was built on will put a stale
 * copy back over an attach that landed a moment ago, and two people editing one
 * campaign will overwrite each other rather than converge. Writing the stub to
 * the harder shape is what stops a client getting built against the easy one.
 *
 * **A rhythm is its own write.** `setSeriesRhythm` touches one row, because
 * changing how often the digest runs must not restate which series the campaign
 * runs at all.
 *
 * ## What the fake costs, said out loud
 *
 * It is **per browser**, keyed by workspace. A colleague opening the same
 * workspace sees no series at all, and a rhythm set on a laptop plans nothing
 * for anybody else. That is fine for a feature being looked at and is not fine
 * shipped — which is what the flag is holding.
 *
 * Ids are minted here, and on the real thing they are the server's. A client
 * that mints ids makes "does this exist yet" a question with two answers and
 * the client's a guess (see `saveVoice` in `brand.ts`); an empty `id` is what
 * the editors hand back for something never stored, and that convention is
 * already what these signatures take.
 */

/** Long enough that the screens are exercised against a pending state. */
const DELAY_MS = 120

function settle<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), DELAY_MS))
}

type Store = {
  series: ContentSeries[]
  /** The campaign's runs, keyed by campaign id. */
  runs: Record<string, CampaignSeriesRun[]>
}

const EMPTY: Store = { series: [], runs: {} }

function storeKey(): string {
  return `ogen.series.${getActiveWorkspaceId() ?? 'default'}`
}

function read(): Store {
  try {
    const stored = localStorage.getItem(storeKey())
    if (stored) return { ...EMPTY, ...(JSON.parse(stored) as Store) }
  } catch {
    // An unreadable store answers as a workspace that has written no series,
    // which is the first-run state every screen here already draws.
  }
  return structuredClone(EMPTY)
}

function write(store: Store): void {
  try {
    localStorage.setItem(storeKey(), JSON.stringify(store))
  } catch {
    // Quota or private mode. Nothing is saved, and the screens redraw from
    // whatever the last successful write held.
  }
}

function mintId(): string {
  return `series-${crypto.randomUUID()}`
}

/**
 * Every series the workspace can see — both scopes, in one answer.
 *
 * The real thing will almost certainly split this: `GET /api/series` for the
 * library, and a campaign's own carried on the campaign. One call here because
 * the stub has one store and pretending otherwise would be inventing the API.
 * Callers already filter by `scope`, so the split costs them nothing.
 */
export function listSeries(): Promise<ContentSeries[]> {
  return settle(read().series)
}

/**
 * Create or replace one series — one function, because the editor makes one
 * gesture and hands back a whole series whether it started from nothing, from a
 * starter, or from an existing entry. `POST` vs `PUT` is a fact about the wire,
 * settled here and nowhere else.
 *
 * `usage` is server-owned: ignored on write, authoritative on the way back. The
 * stub preserves whatever it held so the editor can keep assembling a whole
 * entity without knowing which fields it is allowed to set.
 */
export function saveSeries(series: ContentSeries): Promise<ContentSeries> {
  const store = read()
  const at = store.series.findIndex((entry) => entry.id === series.id)
  const existing = at >= 0 ? store.series[at] : undefined

  const saved: ContentSeries = {
    ...series,
    id: series.id || mintId(),
    usage: existing?.usage ?? { drafts: 0, published: 0 },
    updatedAt: new Date().toISOString(),
  }

  const next = [...store.series]
  if (at >= 0) next[at] = saved
  else next.push(saved)
  write({ ...store, series: next })

  return settle(saved)
}

/**
 * Delete a series. Nothing cascades: a post already written keeps its text,
 * because the series was an input to writing it rather than a filter over it.
 *
 * Its runs go with it — a campaign cannot run a series that no longer exists,
 * and leaving the rows would make the plan count slots nothing can fill.
 */
export function deleteSeries(id: string): Promise<void> {
  const store = read()
  const runs: Record<string, CampaignSeriesRun[]> = {}
  for (const [campaignId, rows] of Object.entries(store.runs)) {
    runs[campaignId] = rows.filter((run) => run.seriesId !== id)
  }
  write({ series: store.series.filter((s) => s.id !== id), runs })
  return settle(undefined)
}

/**
 * Move a campaign's own series into the workspace library.
 *
 * The ordinary way the library fills. A series written inside a campaign is
 * bounded by it; promoting says it has proved it recurs, and from then on every
 * campaign can pick it up. Deliberately one-way — demoting a series that other
 * campaigns have already picked up would silently narrow it to one of them.
 */
export function promoteSeries(id: string): Promise<ContentSeries> {
  const store = read()
  const at = store.series.findIndex((entry) => entry.id === id)
  if (at < 0) return Promise.reject(new Error(`No series ${id}`))

  const promoted: ContentSeries = {
    ...store.series[at],
    scope: { kind: 'workspace' },
    updatedAt: new Date().toISOString(),
  }
  const next = [...store.series]
  next[at] = promoted
  write({ ...store, series: next })

  return settle(promoted)
}

/** Which series one campaign runs, and how often. */
export function getCampaignSeries(campaignId: string): Promise<CampaignSeries> {
  return settle({ campaignId, runs: read().runs[campaignId] ?? [] })
}

/**
 * Add one series to a campaign — a union, never a restatement.
 *
 * Idempotent: attaching one the campaign already runs answers with the campaign
 * unchanged rather than duplicating the row or resetting its rhythm. The rhythm
 * a new row starts at is the library's suggestion, which is why this reads the
 * series rather than taking a rhythm argument — a campaign picking something up
 * has not yet expressed an opinion about its rate.
 */
export function attachSeries(
  campaignId: string,
  seriesId: string,
): Promise<CampaignSeries> {
  const store = read()
  const rows = store.runs[campaignId] ?? []
  if (rows.some((run) => run.seriesId === seriesId)) {
    return settle({ campaignId, runs: rows })
  }

  const series = store.series.find((entry) => entry.id === seriesId)
  const next = [...rows, { seriesId, rhythm: series?.defaultRhythm ?? null }]
  write({ ...store, runs: { ...store.runs, [campaignId]: next } })

  return settle({ campaignId, runs: next })
}

/** Take one out. The series itself is untouched — this is the campaign's row. */
export function detachSeries(
  campaignId: string,
  seriesId: string,
): Promise<CampaignSeries> {
  const store = read()
  const next = (store.runs[campaignId] ?? []).filter(
    (run) => run.seriesId !== seriesId,
  )
  write({ ...store, runs: { ...store.runs, [campaignId]: next } })
  return settle({ campaignId, runs: next })
}

/**
 * How often this campaign runs one of its series. `null` is occasional — it
 * runs when there is something for it and claims no slots in the plan.
 *
 * A write of its own, touching one row, so changing a rate cannot restate the
 * set. Answers with the whole campaign because that is what the endpoint will
 * do and what the cache replaces.
 */
export function setSeriesRhythm(
  campaignId: string,
  seriesId: string,
  rhythm: SeriesRhythm | null,
): Promise<CampaignSeries> {
  const store = read()
  const next = (store.runs[campaignId] ?? []).map((run) =>
    run.seriesId === seriesId ? { ...run, rhythm } : run,
  )
  write({ ...store, runs: { ...store.runs, [campaignId]: next } })
  return settle({ campaignId, runs: next })
}
