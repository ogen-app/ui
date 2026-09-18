import { createFileRoute } from '@tanstack/react-router'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { ContentPage } from '@/components/content/ContentPage'

export const Route = createFileRoute('/_authenticated/assets/')({
  component: Assets,
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
 * is what the two levels are teaching (see `workspaceDestinations`).
 *
 * **No flag.** Nothing here is new: the same `ContentPage` against the same
 * endpoints, reached by a shorter path. It also stops the bank disappearing
 * with `brand-materials` off, which was a side effect of living under a gated
 * layout rather than anything anyone decided.
 */
function Assets() {
  // The same shell the campaign layout puts around its own Assets section: the
  // page owns its header and is one big drop target, so all it wants from
  // outside is a full-height column that doesn't scroll. The shell fades in
  // once, on arrival — the list below plays its own fade when the fetch lands.
  return (
    <PageContainer variant="fullFlex" className="page-content-motion">
      <ContentPage campaign={null} />
    </PageContainer>
  )
}
