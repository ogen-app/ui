import { useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { ContentPage } from '@/components/content/ContentPage'
import { parseAssetListSearch, type AssetListSearch } from '@/lib/assetFilter'
import { parseAddSource, type AddSourceOpen } from '@/lib/assistantUiActions'

type AssetsSearch = AssetListSearch & {
  /** The assistant asking for a source (`open_add_source`, CON-484). */
  add?: AddSourceOpen
}

export const Route = createFileRoute('/_authenticated/assets/')({
  component: Assets,
  // The list's filter — the same keys the Assets query takes, so the
  // address is the request and a link reopens the same list (CON-371). Per
  // tab, never `/api/settings`. `add` is the assistant's, as on a
  // campaign's Assets: it opens the way in once and goes.
  validateSearch: (raw: Record<string, unknown>): AssetsSearch => ({
    ...parseAssetListSearch(raw),
    ...(parseAddSource(raw.add) ? { add: parseAddSource(raw.add) } : {}),
  }),
})

/**
 * `/assets` — the workspace's documents, all of them.
 *
 * **A module of its own, which it was not before.** It was `/content-bank`,
 * then Brand's sixth section at `/foundation/sources`, on the argument that a
 * document is material the app writes from and so belongs beside the voices
 * and the guardrails. True about what a document *is*, and wrong about what
 * the screen *does*: the other Foundation sections are short forms somebody
 * fills in once and revisits rarely, and this is a working list — uploads land
 * in it, a scrape fills one in a minute later, rows are tagged and deleted in
 * bulk, and it is the one screen in Foundation anybody had open all day. A hub
 * of five cards with one of them a filing cabinet made the cabinet two clicks
 * deep and the hub uneven.
 *
 * So it is a level-0 destination now, above Campaigns — the material comes
 * before the work made from it, which is the order the rail already uses for
 * Ideas. Its campaign-scoped twin is `/campaigns/:id/assets`, and the pairing
 * is the campaign filter's to choose (see `lib/campaignScope`).
 *
 * **No flag.** Nothing here is new: the same `ContentPage` against the same
 * endpoints, reached by a shorter path. It also stops the bank disappearing
 * with `brand-materials` off, which was a side effect of living under a gated
 * layout rather than anything anyone decided.
 */
function Assets() {
  const { add, ...search } = Route.useSearch()
  const navigate = Route.useNavigate()
  const onAddSourceOpened = useCallback(
    () =>
      void navigate({
        search: ({ add: _add, ...rest }: AssetsSearch) => rest,
        replace: true,
      }),
    [navigate],
  )
  // Replaced, not pushed: each token is not a page of history, and Back
  // should leave the list rather than undo it one filter at a time.
  const onSearchChange = useCallback(
    (next: AssetListSearch) => void navigate({ search: next, replace: true }),
    [navigate],
  )
  // The same shell the campaign layout puts around its own Assets section: the
  // page owns its header and is one big drop target, so all it wants from
  // outside is a full-height column that doesn't scroll. The shell fades in
  // once, on arrival — the list below plays its own fade when the fetch lands.
  return (
    <PageContainer variant="fullFlex" className="page-content-motion">
      <ContentPage
        campaign={null}
        search={search}
        onSearchChange={onSearchChange}
        addSource={add}
        onAddSourceOpened={onAddSourceOpened}
      />
    </PageContainer>
  )
}
