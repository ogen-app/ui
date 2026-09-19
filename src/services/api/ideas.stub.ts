import { getActiveWorkspaceId } from '@/lib/activeWorkspace'
import { parseIdeas } from '@/lib/ideas'
import type { IdeaBody, IdeaEdit } from './ideas'
import type { IdeaVerdict } from '@/lib/ideas'

/**
 * The ideas backlog, with no server behind it.
 *
 * **This whole file is scaffolding.** It exists so the capture box, the triage
 * session and the decided board can be built and *used* before `/api/ideas`
 * exists — and used is the operative word: a triage screen you cannot type a
 * real backlog into teaches you nothing about whether the triage works. Delete
 * it, and the `STUBBED` branches in `ideas.ts`, on the commit that wires the
 * real endpoints.
 *
 * `localStorage`, not a fetch-level mock: the request layer stays honest, so
 * nothing can pass a test against an interceptor and then fail against the
 * server. Same trade `tiers.stub.ts` makes.
 *
 * **There is no seed, and that is deliberate.** The other stub in this app
 * seeds a tier matrix, which is reference data somebody decided. An idea is a
 * person's own sentence, and inventing a backlog for a workspace would put
 * words in its mouth that read exactly like the ones its team wrote — the same
 * argument that keeps `?analytics=demo` off by default and announced while it
 * is on. A new workspace's ideas list starts empty, because it is.
 *
 * Three things it does that the real endpoint will do properly, and which are
 * worth naming because the prototype can mislead about all three:
 *
 * 1. **It is per browser.** `localStorage`, so the "shared backlog" this module
 *    is about is shared with nobody until the API lands. Two tabs on this
 *    machine agree; a colleague sees an empty list.
 * 2. **It is keyed by workspace** all the same, so switching workspaces does
 *    not pour one team's ideas into another's — the one multi-tenancy rule the
 *    stub can honour, and the one whose absence would be most confusing.
 * 3. **It ids rows itself.** `crypto.randomUUID`, prefixed so a stub row is
 *    recognisable in storage if one ever outlives this file.
 *
 * No artificial delay. A stub that resolves on the spot makes the loading state
 * hard to see; one that sleeps makes every test that touches it slow and
 * flaky, and the loading state is the cheaper of the two to check by hand.
 */

/** Flip to false to point the same call sites at the real API. */
export const STUBBED = true

/**
 * One row per workspace. The id can be `null` before the tab has pinned one —
 * the account's default is still resolving — and those ideas would then be
 * unreachable once it does, so that case gets its own bucket rather than
 * silently writing into a key that is about to change.
 */
function storageKey(): string {
  return `stub-ideas:${getActiveWorkspaceId() ?? 'unpinned'}`
}

/** localStorage throws in private-mode Safari and when storage is disabled. */
function read(): IdeaBody[] {
  try {
    const stored = localStorage.getItem(storageKey())
    if (!stored) return []
    // Through the same guard the real list goes through, then back out to wire
    // shape: a row an older build of this feature wrote is skipped rather than
    // thrown on, and the stub cannot hand the app an object the parser would
    // have rejected.
    return parseIdeas(JSON.parse(stored)).map(toBody)
  } catch {
    return []
  }
}

function write(ideas: IdeaBody[]): IdeaBody[] {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(ideas.map(toStored)))
  } catch {
    // Nothing to do about it and nothing to tell the user: this is a stub, and
    // what they typed still stands for the life of the tab.
  }
  return ideas
}

/** Stored in the client's own shape, which is what `parseIdeas` validates. */
function toStored(body: IdeaBody) {
  return {
    id: body.id,
    title: body.title,
    note: body.note,
    campaignId: body.campaign_id,
    verdict: body.verdict,
    createdAt: body.created_at,
    createdBy: body.created_by,
    decidedAt: body.decided_at,
    decidedBy: body.decided_by,
    remindAt: body.remind_at,
  }
}

function toBody(idea: ReturnType<typeof toStored>): IdeaBody {
  return {
    id: idea.id,
    title: idea.title,
    note: idea.note,
    campaign_id: idea.campaignId,
    verdict: idea.verdict,
    created_at: idea.createdAt,
    created_by: idea.createdBy,
    decided_at: idea.decidedAt,
    decided_by: idea.decidedBy,
    remind_at: idea.remindAt,
  }
}

export function stubListIdeas(campaignId: string | null): Promise<IdeaBody[]> {
  const all = read()
  return Promise.resolve(
    campaignId ? all.filter((idea) => idea.campaign_id === campaignId) : all,
  )
}

export function stubCaptureIdea(payload: {
  title: string
  note: string
  campaign_id: string | null
}): Promise<IdeaBody> {
  const idea: IdeaBody = {
    id: `idea_stub_${crypto.randomUUID()}`,
    title: payload.title,
    note: payload.note,
    campaign_id: payload.campaign_id,
    verdict: null,
    created_at: new Date().toISOString(),
    // The server fills this from the session. The stub cannot, and a fake id
    // here would be a membership that does not exist — so nobody wrote it.
    created_by: null,
    decided_at: null,
    decided_by: null,
    remind_at: null,
  }
  write([...read(), idea])
  return Promise.resolve(idea)
}

export function stubEditIdea(id: string, edit: IdeaEdit): Promise<IdeaBody> {
  return update(id, (idea) => ({
    ...idea,
    // Presence-aware, exactly as the contract says: `undefined` is "leave it",
    // `''` and `null` are values. A blanket `edit.title ?? idea.title` would
    // quietly make the two the same thing.
    title: edit.title !== undefined ? edit.title : idea.title,
    note: edit.note !== undefined ? edit.note : idea.note,
    campaign_id:
      edit.campaign_id !== undefined ? edit.campaign_id : idea.campaign_id,
  }))
}

export function stubSetVerdict(
  id: string,
  payload: { verdict: IdeaVerdict | null; remind_at: string | null },
): Promise<IdeaBody> {
  return update(id, (idea) => ({
    ...idea,
    verdict: payload.verdict,
    decided_at: payload.verdict ? new Date().toISOString() : null,
    decided_by: null,
    // The server-side half of the rule in `lib/ideas.decideIdea`: a wake-up
    // belongs to `later` and to nothing else, so every other verdict clears it.
    remind_at: payload.verdict === 'later' ? payload.remind_at : null,
  }))
}

export function stubDeleteIdea(id: string): Promise<void> {
  write(read().filter((idea) => idea.id !== id))
  return Promise.resolve()
}

function update(
  id: string,
  change: (idea: IdeaBody) => IdeaBody,
): Promise<IdeaBody> {
  const ideas = read()
  const found = ideas.find((idea) => idea.id === id)
  // The shape of a 404, which is what the real endpoint answers and therefore
  // what the hook's error path has to survive.
  if (!found) return Promise.reject(new Error(`No idea ${id}`))
  const next = change(found)
  write(ideas.map((idea) => (idea.id === id ? next : idea)))
  return Promise.resolve(next)
}
