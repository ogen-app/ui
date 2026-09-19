import { useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useFeatureFlag } from '@/config/featureFlags'
import { toast } from '@/stores/toastStore'
import {
  captureIdea,
  deleteIdea,
  editIdea,
  listIdeas,
  setIdeaVerdict,
  type IdeaEdit,
} from '@/services/api/ideas'
import {
  decideIdea,
  newIdea,
  returnToInbox,
  type Idea,
  type IdeaVerdict,
} from '@/lib/ideas'
import { awaiting } from '@/lib/fetched'

/**
 * Ideas' data layer — the list, and the five things you can do to it.
 *
 * **Every write here is optimistic, and that is the feature rather than a
 * polish pass.** Triage is a hundred one-key decisions in a row: a screen that
 * waits for a round trip between them is a screen nobody finishes a backlog
 * on, and the wait is what makes people stop answering honestly and start
 * answering whatever is quickest. So the cache moves first and the request
 * follows, and a failure puts the list back and says so.
 *
 * The rollback is the previous list rather than the inverse of the change: two
 * decisions can be in flight at once — that is the whole point of a keyboard
 * session — and undoing them one at a time in whatever order they fail is how
 * you arrive at a list nobody typed. Restoring the snapshot and refetching is
 * cruder and always right.
 *
 * What an idea *is* lives in `lib/ideas.ts`, pure and testable; this file only
 * moves it between the screen and the API. Which API is `services/api/ideas.ts`'s
 * business — today a `localStorage` stub, with the endpoints written out.
 */

export function ideasQueryKey(campaignId: string | null) {
  return ['ideas', campaignId ?? 'workspace'] as const
}

export function useIdeas(campaignId: string | null = null) {
  const enabled = useFeatureFlag('ideas')

  const query = useQuery({
    queryKey: ideasQueryKey(campaignId),
    queryFn: () => listIdeas(campaignId),
    enabled,
    staleTime: 30_000,
  })

  const ideas = useMemo(() => query.data ?? [], [query.data])
  // `awaiting`, not `isLoading` — see `lib/fetched`. It also answers the
  // `enabled &&` this used to carry: a query nobody switched on is idle, not
  // waiting.
  return {
    ideas,
    isLoading: awaiting(query),
    isError: enabled && query.isError,
  }
}

/**
 * The writes. Each one patches the cache, calls the API and restores the
 * snapshot if the call fails.
 */
export function useIdeaWriter(campaignId: string | null = null) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const key = ideasQueryKey(campaignId)

  /**
   * Patch, call, and put it back if the call fails.
   *
   * `cancelQueries` first, for the reason every optimistic write in this app
   * does it: a read already in flight would otherwise land its older list on
   * top of the patch and undo it a second before the server agrees.
   */
  const commit = useCallback(
    async (next: Idea[], send: () => Promise<unknown>) => {
      const previous = qc.getQueryData<Idea[]>(key) ?? []
      void qc.cancelQueries({ queryKey: key })
      qc.setQueryData(key, next)
      try {
        await send()
      } catch {
        qc.setQueryData(key, previous)
        toast.error(t('ideas.saveFailed'))
      } finally {
        void qc.invalidateQueries({ queryKey: key })
      }
    },
    [key, qc, t],
  )

  const current = useCallback(
    () => (qc.getQueryData<Idea[]>(key) ?? []).slice(),
    [key, qc],
  )

  /**
   * Capture. The optimistic row carries a temporary id, and the refetch at the
   * end of `commit` replaces it with the server's — which is why nothing may
   * hold an idea's id across a capture. Nothing does: the list is keyed by id
   * and the triage session works from the queue, not from a remembered row.
   */
  const capture = useCallback(
    (title: string, note = '') => {
      const trimmed = title.trim()
      if (!trimmed) return Promise.resolve()
      const optimistic = newIdea({
        id: `idea_pending_${crypto.randomUUID()}`,
        title: trimmed,
        note,
        campaignId,
        at: new Date(),
      })
      return commit([...current(), optimistic], () =>
        captureIdea({ title: trimmed, note, campaignId }),
      )
    },
    [campaignId, commit, current],
  )

  const decide = useCallback(
    (id: string, verdict: IdeaVerdict, remindAt: string | null = null) => {
      const now = new Date()
      const next = current().map((idea) =>
        idea.id === id
          ? decideIdea(idea, verdict, { at: now, remindAt })
          : idea,
      )
      return commit(next, () => setIdeaVerdict(id, verdict, remindAt))
    },
    [commit, current],
  )

  /** Back to being a question — the undo behind every verdict. */
  const undecide = useCallback(
    (id: string) => {
      const next = current().map((idea) =>
        idea.id === id ? returnToInbox(idea) : idea,
      )
      return commit(next, () => setIdeaVerdict(id, null))
    },
    [commit, current],
  )

  const edit = useCallback(
    (id: string, change: IdeaEdit) => {
      const next = current().map((idea) =>
        idea.id === id
          ? {
              ...idea,
              title: change.title !== undefined ? change.title : idea.title,
              note: change.note !== undefined ? change.note : idea.note,
              campaignId:
                change.campaign_id !== undefined
                  ? change.campaign_id
                  : idea.campaignId,
            }
          : idea,
      )
      return commit(next, () => editIdea(id, change))
    },
    [commit, current],
  )

  const remove = useCallback(
    (id: string) =>
      commit(
        current().filter((idea) => idea.id !== id),
        () => deleteIdea(id),
      ),
    [commit, current],
  )

  return { capture, decide, undecide, edit, remove }
}
