import type { QueryClient } from '@tanstack/react-query'
import { postKey } from '@/hooks/usePost'
import { campaignKey } from '@/hooks/useCampaigns'
import { ASSET_LIST_KEY, ASSETS_KEY, assetKey } from '@/hooks/useContent'
import { BRAND_KEY } from '@/hooks/useBrand'
import {
  CAMPAIGN_SUMMARIES_KEY,
  WORKSPACE_POSTS_KEY,
  postNotesKey,
  postVersionsKey,
} from '@/lib/queryKeys'
import type { ThreadSubject, Touched } from '@/types/assistant'

/**
 * Refreshes what an assistant turn changed (CON-450). The `complete` event
 * lists each entity kind it touched — with an id, or without one for "every
 * entity of this kind" — and this maps them to the caches that show them.
 *
 * The turn's own writes land server-side, and `beginLocalRun` mutes the
 * broadcast copy for the tab that ran it, so this is the only refresh the
 * person who asked will get. Resolves once the refetches settle, so streamed
 * placeholders can be dropped without the posts blinking out first.
 */
export async function refreshTouched(
  qc: QueryClient,
  touched: Touched[],
): Promise<void> {
  const work: Promise<unknown>[] = []
  const invalidate = (queryKey: readonly unknown[]) =>
    work.push(qc.invalidateQueries({ queryKey }))

  for (const { kind, id } of touched) {
    switch (kind) {
      case 'post':
        if (id) {
          invalidate(postKey(id))
          // An edited post leaves a version and may leave notes the editor's
          // panels don't know about.
          invalidate(postVersionsKey(id))
          invalidate(postNotesKey(id))
        } else {
          invalidate(['post'])
        }
        // A post's campaign isn't on the touch, so every campaign's post list
        // is marked stale, plus the two lists that hold the same rows under
        // other roots.
        work.push(
          qc.invalidateQueries({
            predicate: (q) =>
              q.queryKey[0] === 'campaigns' && q.queryKey[2] === 'posts',
          }),
        )
        invalidate(CAMPAIGN_SUMMARIES_KEY)
        invalidate(WORKSPACE_POSTS_KEY)
        break
      case 'campaign':
        // The campaign's posts and phases nest under its key.
        invalidate(id ? campaignKey(id) : ['campaigns'])
        break
      case 'idea':
        // Every idea list, count and saved view sits under `['ideas']`.
        invalidate(['ideas'])
        break
      case 'asset':
        if (id) invalidate(assetKey(id))
        invalidate(id ? ASSET_LIST_KEY : ASSETS_KEY)
        break
      case 'fact':
        invalidate(BRAND_KEY)
        break
      case 'note':
        invalidate(['postNotes'])
        break
      // A kind this build predates changes nothing it can show.
    }
  }

  await Promise.all(work)
}

/**
 * What to refresh when a turn ended without saying what it touched — stopped,
 * or failed after some tools had already written. Errs wide: anything the
 * subject's own page shows.
 */
export function subjectTouches(subject: ThreadSubject): Touched[] {
  switch (subject.kind) {
    case 'post':
      return [{ kind: 'post', id: subject.postId }, { kind: 'note' }]
    case 'campaign':
      return [{ kind: 'campaign', id: subject.campaignId }, { kind: 'idea' }]
    case 'workspace':
      return [{ kind: 'idea' }, { kind: 'post' }, { kind: 'asset' }]
  }
}
