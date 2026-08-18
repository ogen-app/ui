import { createFileRoute } from '@tanstack/react-router'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { ContentPage } from '@/components/content/ContentPage'

export const Route = createFileRoute('/_authenticated/content-bank/')({
  component: ContentBank,
})

/**
 * The workspace's documents, all of them (CON-211).
 *
 * Switched back on after CON-210 moved content inside campaigns and took this
 * with it. The reason it comes back is the one loss that change admitted to: a
 * document no campaign holds was still in the database and shown nowhere, and
 * most of them are — so the bank is where they are visible again.
 *
 * It is the campaign Content page with no campaign, deliberately: same header,
 * same rows, same three ways in. `ContentPage` carries the differences.
 */
function ContentBank() {
  // The same shell the campaign layout puts around its Content section: the
  // page owns its header and is one big drop target, so all it wants from
  // outside is a full-height column that doesn't scroll.
  return (
    <PageContainer variant="fullFlex">
      <ContentPage campaign={null} />
    </PageContainer>
  )
}
