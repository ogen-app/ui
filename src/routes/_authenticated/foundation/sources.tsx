import { createFileRoute } from '@tanstack/react-router'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { ContentPage } from '@/components/content/ContentPage'

export const Route = createFileRoute('/_authenticated/foundation/sources')({
  component: Sources,
})

/**
 * `/foundation/sources` — the workspace's documents, all of them (CON-211).
 *
 * **Brand's sixth section**, and it was `/content-bank` until it became one.
 * The move is an admission the module list had been making for a while: a
 * document is not a place you go to work, it is material the app writes from —
 * which is the sentence that defines every other thing in Brand. A voice says
 * how it sounds, an audience who it is to, guardrails what may be claimed, and
 * these are what there is to say. Four answers to one question belong on one
 * screen, and they were spread across a module row and a hub.
 *
 * It is still the campaign Content page with no campaign, deliberately: same
 * header, same rows, same three ways in. `ContentPage` carries the differences.
 * A document no campaign holds was in the database and shown nowhere, and most
 * of them are — that is why the bank exists at all, and none of it changes by
 * being reached from Brand.
 *
 * No flag guard: the parent layout (`brand.tsx`) owns it, so every screen under
 * Brand is gated once rather than six times.
 */
function Sources() {
  // The same shell the campaign layout puts around its Content section: the
  // page owns its header and is one big drop target, so all it wants from
  // outside is a full-height column that doesn't scroll. The shell fades in
  // once, on arrival — the list below plays its own fade when the fetch lands.
  return (
    <PageContainer variant="fullFlex" className="page-content-motion">
      <ContentPage campaign={null} />
    </PageContainer>
  )
}
