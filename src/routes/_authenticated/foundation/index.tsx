import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { BrandOverview } from '@/components/brand/BrandOverview'
import { BrandPage } from '@/components/brand/detail'
import { useBrand } from '@/hooks/useBrand'
import { useFacts } from '@/hooks/useFacts'
import { useGuardrailsStance } from '@/hooks/useGuardrailsStance'
import { useAssets } from '@/hooks/useContent'
import { useFeatureFlag } from '@/config/featureFlags'

/**
 * `/foundation` — the Overview, and **the main Brand screen**.
 *
 * Not a tab any more: it is what the sidebar points at, what the five sections
 * lead back to, and the only place that answers *what is in my brand* in one
 * read. That is also why it is the one Brand screen with no back caret —
 * there is nowhere above it.
 *
 * No flag guard: the parent layout (`brand.tsx`) owns it, so every screen is
 * gated once rather than six times.
 *
 * The Overview takes its loading state as a prop rather than sitting behind
 * `BrandDetail` like the five sections do. It has a skeleton of its own — cards
 * whose shape is the page's shape — and swapping that for the app's spinner
 * would be a step down on the one screen where the wait is most visible.
 *
 * It still borrows `BrandDetail`'s frame: the header goes *inside* the
 * scroller, sticky and carrying the standard gradient, so the cards dissolve
 * under it rather than being cut off by it. See `BrandDetail`.
 */
export const Route = createFileRoute('/_authenticated/foundation/')({
  component: BrandOverviewPage,
})

function BrandOverviewPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data } = useBrand()
  // Sources is Brand's sixth section and the one `useBrand` knows nothing
  // about, so the hub waits on both: a card that renders "nothing to write
  // from" for the length of a second query is worse than a skeleton.
  const { data: assets } = useAssets()
  // Both of these are views over data the hub already has, or over storage
  // that answers instantly — neither adds a wait to the screen. See
  // `services/api/brandLocal` for what the second one is standing in for.
  const { facts } = useFacts()
  const { data: stance } = useGuardrailsStance()
  // Off: the Facts card is not among the sections (`brandSections`), and the
  // guardrails card must not read a stance one browser decided for itself.
  const ledger = useFeatureFlag('facts-ledger')

  return (
    <BrandPage>
      <div className="relative flex min-h-0 flex-1">
        <ScrollArea
          className="min-h-0 flex-1"
          type="scroll"
          scrollHideDelay={350}
        >
          {/* `fadeOnScroll` because this header has a title. The section
              screens keep the static gradient (post-details style) — they are
              a bare caret, so there is nothing up there to collide with the
              cards passing under it. A title is: it would sit on top of the
              rows for the whole length of the page. Same treatment as Profile
              and Workspace Settings, which are the app's other titled
              scrollers. */}
          <PageHeader title={t('nav.foundation')} fadeOnScroll />
          <div className="px-3 pb-10 lg:px-6">
            <BrandOverview
              state={
                data && assets
                  ? { isPending: false, data }
                  : { isPending: true }
              }
              sources={assets}
              facts={ledger ? facts : []}
              stance={ledger ? stance : undefined}
              onOpen={(id) => navigate({ to: `/foundation/${id}` })}
            />
          </div>
        </ScrollArea>
      </div>
    </BrandPage>
  )
}
