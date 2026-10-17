import { useCallback, useMemo } from 'react'
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from '@/stores/toastStore'
import {
  bulkDeleteIdeas,
  captureIdea,
  editIdea,
  queryIdeas,
  setIdeaVerdict,
  type IdeaEdit,
  type IdeaListPage,
  type IdeaQueryParams,
} from '@/services/api/ideas'
import {
  decideIdea,
  newIdea,
  returnToInbox,
  type Idea,
  type IdeaVerdict,
} from '@/lib/ideas'
import { ASSET_LIST_KEY } from './useContent'

/**
 * The Ideas list as the server's answer to the address (CON-388/389), a page
 * at a time — `useAssetList`'s shape, for ideas.
 *
 * Every key sits under `['ideas']`, so the writes that invalidate that prefix
 * (here, the asset page's answers, the bulk delete) refresh every list.
 */
export const IDEA_LIST_KEY = ['ideas', 'list'] as const

/** How many rows a page brings in. */
export const IDEA_PAGE_SIZE = 50

type Pages = InfiniteData<IdeaListPage, string | null>

export function ideaCountQuery(params: IdeaQueryParams) {
  return {
    queryKey: [...IDEA_LIST_KEY, 'count', params] as const,
    queryFn: async () => (await queryIdeas({ ...params, limit: '1' })).total,
  }
}

/**
 * Facets are asked for on the first page only — they describe the whole
 * match, not a page of it. The previous answer stays on screen while the next
 * loads, so narrowing never flashes the list empty.
 */
export function useIdeaList(params: IdeaQueryParams, facets: string[]) {
  const query = useInfiniteQuery({
    queryKey: [...IDEA_LIST_KEY, params, facets],
    queryFn: ({ pageParam }) =>
      queryIdeas({
        ...params,
        limit: String(IDEA_PAGE_SIZE),
        ...(pageParam
          ? { cursor: pageParam }
          : facets.length
            ? { facets: facets.join(',') }
            : {}),
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
  const pages = query.data?.pages
  const rows = useMemo(
    () => pages?.flatMap((page) => page.ideas) ?? [],
    [pages],
  )
  const first = pages?.[0]
  return {
    query,
    rows,
    total: first?.total ?? 0,
    totalUnfiltered: first?.total_unfiltered ?? 0,
    piles: first?.piles ?? NO_PILES,
    facets: first?.facets ?? NO_FACETS,
    sourceLabels: first?.facet_labels?.source_asset ?? NO_LABELS,
    groups: first?.groups ?? NO_GROUPS,
  }
}

const NO_PILES: IdeaListPage['piles'] = { waiting: 0, yes: 0, later: 0, no: 0 }
const NO_FACETS: IdeaListPage['facets'] = {}
const NO_LABELS: NonNullable<
  NonNullable<IdeaListPage['facet_labels']>['source_asset']
> = []
const NO_GROUPS: NonNullable<IdeaListPage['groups']> = []

/**
 * How many ideas are still a question, workspace-wide — the rail's figure. A
 * one-row read of the undecided pile, under the list key so every write and
 * every `ideas.*` event refreshes it.
 */
export function useUndecidedIdeaCount(): number {
  const query = useQuery({
    ...ideaCountQuery({ pile: 'waiting' }),
    staleTime: 30_000,
  })
  return query.data ?? 0
}

/**
 * The writes, against every loaded list at once.
 *
 * **Every write is optimistic, and that is the feature rather than a polish
 * pass.** Triage is a hundred one-click decisions in a row: a screen that
 * waits for a round trip between them is a screen nobody finishes a backlog
 * on. So the cache moves first and the request follows, and a failure puts
 * every list back — the snapshot, restored whole — and says so.
 *
 * An answered row is patched where it stands rather than taken out of its
 * pile: the refetch that follows moves it, a beat later, so a row never
 * vanishes from under the pointer that answered it.
 */
export function useIdeaListWriter({
  campaignId,
}: {
  /** Captures made here are filed to it. */
  campaignId: string | null
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()

  const run = useCallback(
    async (
      /** Each loaded page of each list, with the request that list made. */
      patch: (ideas: Idea[], page: number, params: IdeaQueryParams) => Idea[],
      send: () => Promise<unknown>,
      { failure = t('ideas.saveFailed') }: { failure?: string } = {},
    ) => {
      void qc.cancelQueries({ queryKey: IDEA_LIST_KEY })
      const snapshot = qc.getQueriesData<Pages>({ queryKey: IDEA_LIST_KEY })
      for (const [key, data] of snapshot) {
        // The counts share the prefix and hold a number, not pages.
        if (!data?.pages) continue
        const params = (key[2] ?? {}) as IdeaQueryParams
        qc.setQueryData<Pages>(key, {
          ...data,
          pages: data.pages.map((page, i) => ({
            ...page,
            ideas: patch(page.ideas, i, params),
          })),
        })
      }
      try {
        return await send()
      } catch {
        for (const [key, data] of snapshot) qc.setQueryData(key, data)
        toast.error(failure)
        return undefined
      } finally {
        void qc.invalidateQueries({ queryKey: ['ideas'] })
        // An asset row counts its ideas per verdict (CON-374).
        void qc.invalidateQueries({ queryKey: ASSET_LIST_KEY })
      }
    },
    [qc, t],
  )

  const each = (id: string, change: (idea: Idea) => Idea) => (ideas: Idea[]) =>
    ideas.map((idea) => (idea.id === id ? change(idea) : idea))

  const decide = useCallback(
    (id: string, verdict: IdeaVerdict, remindAt: string | null = null) =>
      run(
        each(id, (idea) =>
          decideIdea(idea, verdict, { at: new Date(), remindAt }),
        ),
        () => setIdeaVerdict(id, verdict, remindAt),
      ),
    [run],
  )

  const undecide = useCallback(
    (id: string) =>
      run(each(id, returnToInbox), () => setIdeaVerdict(id, null)),
    [run],
  )

  const edit = useCallback(
    (id: string, change: IdeaEdit) =>
      run(
        each(id, (idea) => ({
          ...idea,
          title: change.title ?? idea.title,
          note: change.note ?? idea.note,
          campaignId:
            change.campaign_id !== undefined
              ? change.campaign_id
              : idea.campaignId,
        })),
        () => editIdea(id, change),
      ),
    [run],
  )

  /**
   * Capture: shown at once at the head of every loaded undecided pile, which
   * is where a new idea lands; in any other pile it would be a row the refetch
   * takes away again.
   */
  const capture = useCallback(
    (title: string) => {
      const trimmed = title.trim()
      if (!trimmed) return Promise.resolve()
      const optimistic = newIdea({
        id: `idea_pending_${crypto.randomUUID()}`,
        title: trimmed,
        campaignId,
        at: new Date(),
      })
      return run(
        // At the head of every loaded undecided pile, where a new idea
        // lands; a Yes or No list would only have it taken away again.
        (ideas, page, params) =>
          params.pile === 'waiting' && page === 0
            ? [optimistic, ...ideas]
            : ideas,
        () => captureIdea({ title: trimmed, campaignId }),
      )
    },
    [campaignId, run],
  )

  /**
   * Deletes a selection, 500 to a request (`bulkDeleteIdeas`), taking the
   * rows out first. Resolves with what the server says happened.
   */
  const removeMany = useCallback(
    async (ids: string[]) => {
      const gone = new Set(ids)
      const result = await run(
        (ideas) => ideas.filter((idea) => !gone.has(idea.id)),
        () => bulkDeleteIdeas(ids),
        { failure: t('ideas.bulk.failed') },
      )
      return (result as { deleted: number; failed: number } | undefined) ?? null
    },
    [run, t],
  )

  return { decide, undecide, edit, capture, removeMany }
}
