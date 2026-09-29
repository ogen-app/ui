import { apiJson, apiVoid } from './http'
import type { Idea, IdeaVerdict } from '@/lib/ideas'

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
 * The server also sends `created_by_name` — the author as they were named at
 * capture, which outlives the membership when `created_by` goes `null` — and
 * `updated_at`. Nothing on screen reads either yet, so neither is typed here.
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
