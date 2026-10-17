import { apiJson, apiVoid } from './http'
import type { FitBreakdown } from '@/lib/ideaFit'
import type { Idea, IdeaSourceAsset, IdeaVerdict } from '@/lib/ideas'
import type { AssetListKind } from '@/types/assetList'

/**
 * Ideas — the backlog of what a workspace could make, and the verdicts on it.
 *
 * The client was written against this contract before the server had one, off
 * a `localStorage` stub; CON-315 built the endpoints to it, and the stub is
 * gone. `ideas.test.ts` is the executable half of what follows.
 *
 * ## The contract
 *
 *     GET /api/ideas[?campaign_id=<id>|none]
 *
 * Workspace-scoped, like everything else behind `X-Workspace-Id`. Ideas are
 * shared: every member sees the same backlog, which is the point of keeping one.
 *
 *     200 {"ideas": [{
 *       "id": "k3Xz9QpL",
 *       "title": "A teardown of our own onboarding",
 *       "note": "",
 *       "campaign_id": null,
 *       "verdict": null,
 *       "created_at": "2026-09-17T08:00:00Z",
 *       "created_by": "Vo5fQRrMVdI",
 *       "decided_at": null,
 *       "decided_by": null,
 *       "remind_at": null
 *     }]}
 *
 * The server also sends `created_by_name`, the author as they were named at
 * capture, which outlives the membership when `created_by` goes `null`; and
 * `updated_at`, which nothing reads.
 *
 * Since CON-389 (ogen#225) an idea also says where it came from, and the
 * card (CON-388) is drawn from that:
 *
 *     "origin": "asset_analysis",
 *     "source_asset": {"id": "…", "title": "Beekeeping handbook",
 *                      "kind": "pdf", "page_count": 7, "duration_ms": null,
 *                      "domain": null,
 *                      "reading": {"campaign_id": "…", "campaign_name": "…"}},
 *     "angle": "…", "rationale": "…", "sources": ["p. 5", "p. 6"],
 *     "author": null
 *
 * `source_asset` is the asset the idea was distilled from. It outlives the
 * analysis that produced it and is absent once the asset is deleted.
 * `reading` is the campaign whose lens produced it, `null` for the workspace's.
 * `angle`, `rationale` and `sources` are the parts the note also carries as
 * text: `null` on a written idea and on an older analysed one whose note did
 * not split, where the card falls back to reading the note
 * (`lib/ideaSource.ideaParts`). `author` is a written idea's writer, with
 * `id: null` once they have left the workspace, and `null` on an analysed one.
 * Every one of these is optional here, so against an API that predates CON-389
 * the card degrades to what it has rather than breaking.
 *
 * `campaign_id` filters rather than scopes — the same rows, narrowed. The
 * campaign's Ideas page is this module with the filter on, and an idea moved
 * onto a campaign keeps its verdict and its history rather than becoming a new
 * row somewhere else. `none` narrows to the ideas no campaign holds; nothing
 * asks for that today. An idea whose campaign was deleted reads back with
 * `campaign_id: null`, and naming a campaign that is not live in the workspace
 * is a 400.
 *
 *     POST /api/ideas  {"title": "…", "note": "", "campaign_id": null}
 *
 * Answers `201` with the created idea. `title` is the only required field, and
 * the server assigns the id, `created_at` and `created_by` — capture has to
 * cost one line, so everything that can be defaulted is.
 *
 *     PATCH /api/ideas/:id  {"title"?: "…", "note"?: "…", "campaign_id"?: null}
 *
 * Presence-aware, like the asset PUT since CON-279: a field left out is left
 * alone, a field sent — including `""` and `null` — replaces what is stored. So
 * a screen sends what it owns and nothing else, and two people editing
 * different halves of the same idea do not overwrite each other. Any other key
 * — `verdict`, `remind_at`, `created_by` — and an empty body are a 400.
 *
 * **An analysed idea's words are read-only** (CON-389): a `title` or `note`
 * on one is a 409 `idea_read_only`, because its score was given to those
 * words. Its `campaign_id` stays editable. The card offers no field that would
 * be refused.
 *
 *     PUT /api/ideas/:id/verdict  {"verdict": "later"|"yes"|"no"|null,
 *                                  "remind_at": "2026-10-17T08:00:00Z"|null}
 *
 * **A verdict is its own endpoint and deliberately not a field on the PATCH**,
 * for the reason archiving a campaign is not a field on its PUT: a decision
 * must not be able to ride along with an edit. `null` returns the idea to the
 * inbox, which is how every decision here stays reversible. Both keys are
 * required on every call, and every call re-stamps `decided_at`/`decided_by` —
 * postponing again moves the decision as well as the wake-up.
 *
 * Two rules the server owns, because the client cannot be trusted with either:
 *
 * - **`remind_at` is required for `later` and must be cleared for anything
 *   else.** A surviving wake-up on an archived idea pulls it back out of the
 *   archive on a day nobody chose. `lib/ideas.decideIdea` does the same thing
 *   client-side; the server is what makes it true.
 * - **A woken idea is still `later` in the database.** "Back in the inbox" is
 *   `remind_at <= now`, derived at read time, never a fourth stored state —
 *   otherwise waking requires a sweep, and an idea's return depends on a job
 *   having run rather than on the date it was given.
 *
 *     DELETE /api/ideas/:id
 *
 * `204`. Final, and the only destructive thing in the module — which is why
 * saying *no* archives rather than deletes, and why deleting is not offered
 * from the triage session. Answering a hundred ideas quickly and destroying one
 * are not gestures that belong on the same screen.
 */

export type IdeaBody = {
  id: string
  title: string
  note: string
  campaign_id: string | null
  verdict: IdeaVerdict | null
  created_at: string
  created_by: string | null
  decided_at: string | null
  decided_by: string | null
  remind_at: string | null
  /** `''` for an idea a person wrote, `'asset_analysis'` for a distilled one (CON-364). */
  origin?: '' | 'asset_analysis'
  asset_analysis_id?: string | null
  source_asset?: IdeaSourceAssetBody | null
  created_by_name?: string
  /** A written idea's writer (CON-389); `id` is `null` once they have left. */
  author?: { id: string | null; name: string } | null
  /** An analysed idea's parts (CON-389); `null` where the note did not split. */
  angle?: string | null
  rationale?: string | null
  sources?: string[] | null
  /**
   * How well the idea fits the reading it came from, 10–100 (CON-385): the
   * campaign's brief on a campaign's reading, the workspace's otherwise. `null`
   * for an idea a person wrote and for one from a reading before the score
   * existed — never scored, rather than scored low.
   */
  fit_score?: number | null
  /** Why it scored that, criterion by criterion (CON-385); `null` when unscored. */
  fit_breakdown?: FitBreakdown | null
}

export type IdeaSourceAssetBody = {
  id: string
  title: string
  kind?: AssetListKind
  page_count?: number | null
  duration_ms?: number | null
  domain?: string | null
  reading?: { campaign_id: string; campaign_name: string } | null
}

/** What a screen may change about an idea. The verdict is deliberately not in here. */
export type IdeaEdit = {
  title?: string
  note?: string
  campaign_id?: string | null
}

export function ideaFromWire(body: IdeaBody): Idea {
  return {
    id: body.id,
    title: body.title,
    note: body.note ?? '',
    campaignId: body.campaign_id,
    verdict: body.verdict,
    createdAt: body.created_at,
    createdBy: body.created_by,
    decidedAt: body.decided_at,
    decidedBy: body.decided_by,
    remindAt: body.remind_at,
    origin: body.origin === 'asset_analysis' ? 'asset_analysis' : 'manual',
    assetAnalysisId: body.asset_analysis_id ?? null,
    sourceAsset: body.source_asset
      ? sourceAssetFromWire(body.source_asset)
      : null,
    authorName:
      body.origin === 'asset_analysis'
        ? null
        : body.author?.name || body.created_by_name || null,
    angle: body.angle ?? undefined,
    rationale: body.rationale ?? undefined,
    sources: body.sources ?? undefined,
    fitScore: body.fit_score ?? undefined,
    fitBreakdown: body.fit_breakdown ?? undefined,
  }
}

function sourceAssetFromWire(body: IdeaSourceAssetBody): IdeaSourceAsset {
  return {
    id: body.id,
    title: body.title,
    kind: body.kind ?? null,
    pageCount: body.page_count ?? null,
    durationMs: body.duration_ms ?? null,
    domain: body.domain ?? null,
    reading: body.reading
      ? {
          campaignId: body.reading.campaign_id,
          campaignName: body.reading.campaign_name,
        }
      : null,
  }
}

export async function listIdeas(campaignId?: string | null): Promise<Idea[]> {
  const { ideas } = await apiJson<{ ideas: IdeaBody[] }>(
    campaignId
      ? `/api/ideas?campaign_id=${encodeURIComponent(campaignId)}`
      : '/api/ideas',
    'Unable to fetch ideas',
  )
  return ideas.map(ideaFromWire)
}

export async function captureIdea(fields: {
  title: string
  note?: string
  campaignId?: string | null
}): Promise<Idea> {
  const payload = {
    title: fields.title,
    note: fields.note ?? '',
    campaign_id: fields.campaignId ?? null,
  }
  const body = await apiJson<IdeaBody>(
    '/api/ideas',
    'Unable to save the idea',
    {
      method: 'POST',
      body: payload,
    },
  )
  return ideaFromWire(body)
}

export async function editIdea(id: string, edit: IdeaEdit): Promise<Idea> {
  const body = await apiJson<IdeaBody>(
    `/api/ideas/${id}`,
    'Unable to save the idea',
    {
      method: 'PATCH',
      body: edit,
    },
  )
  return ideaFromWire(body)
}

/** `null` sends the idea back to the inbox — see the contract above. */
export async function setIdeaVerdict(
  id: string,
  verdict: IdeaVerdict | null,
  remindAt: string | null = null,
): Promise<Idea> {
  const body = await apiJson<IdeaBody>(
    `/api/ideas/${id}/verdict`,
    'Unable to save the decision',
    { method: 'PUT', body: { verdict, remind_at: remindAt } },
  )
  return ideaFromWire(body)
}

export async function deleteIdea(id: string): Promise<void> {
  await apiVoid(`/api/ideas/${id}`, 'Unable to delete the idea', {
    method: 'DELETE',
  })
}
