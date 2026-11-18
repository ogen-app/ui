import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { BrandOverview } from '@/components/brand/BrandOverview'
import { BrandPage } from '@/components/brand/detail'
import { CampaignTimeline } from '@/components/strategy/CampaignTimeline'
import { PageSection } from '@/components/page-primitives/PageSection'
import { useBrand } from '@/hooks/useBrand'
import { useFacts } from '@/hooks/useFacts'
import { useGuardrailsStance } from '@/hooks/useGuardrailsStance'
import { useSeriesLibrary } from '@/hooks/useSeries'
import { fetched } from '@/lib/fetched'

/**
 * `/foundation` — **Strategy for all campaigns**: the campaigns on one time
 * axis, then the Foundation's hub.
 *
 * Strategy and Foundation were two rows of the rail, one only for a campaign
 * and one only for the workspace, and they were one subject seen from the two
 * levels (`lib/campaignScope`). So this page is the Strategy row with no
 * campaign chosen, and a campaign's Strategy page is the same row narrowed.
 * The timeline comes first because it is one card and the hub is eight: under
 * them it would never be seen.
 *
 * Not a tab any more: it is what the sidebar points at, what the five sections
 * lead back to, and the only place that answers *what is in my brand* in one
 * read. That is also why it is the one Brand screen with no back caret —
 * there is nowhere above it.
 *
 * No flag guard: the parent layout (`brand.tsx`) owns it, so every screen is
 * gated once rather than six times.
 *
 * The Overview takes its query's state as a prop rather than sitting behind
 * `BrandDetail` like the sections do — see `Fetched`. It has a skeleton of its
 * own — cards whose shape is the page's shape — and swapping that for the app's
 * spinner would be a step down on the one screen where the wait is most
 * visible. There is no `PageError` either: a section that failed says so in its
 * own card, on a screen where the others are readable.
 *
 * It still borrows `BrandDetail`'s frame: the header goes *inside* the
 * scroller — and, being a document's, scrolls away with it, leaving its title
 * and the card being read to the bar above. See `BrandDetail`.
 */
export const Route = createFileRoute('/_authenticated/foundation/')({
  component: BrandOverviewPage,
})

function BrandOverviewPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const brand = useBrand()
  // Both are views over the brand the hub already has — neither adds a wait.
  const { facts } = useFacts()
  const stance = useGuardrailsStance()
  // Off: the Series card is not among the sections (`brandSections`), so this
  // query never runs and the hub is byte-for-byte what it was before CON-264.
  const { data: series } = useSeriesLibrary()

  return (
    <BrandPage>
      <div className="relative flex min-h-0 flex-1">
        <ScrollArea
          className="min-h-0 flex-1"
          type="scroll"
          scrollHideDelay={350}
        >
          <PageHeader title={t('nav.campaign.strategy')} scrollAway />
          {/* Two bands, as a campaign's Strategy has: the campaigns, then the
              Foundation they are all written under. */}
          <div className="flex flex-col gap-10 px-3 pb-10 pt-4 lg:px-6">
            <PageSection title={t('campaigns.strategy.bands.campaigns')}>
              <CampaignTimeline />
            </PageSection>
            <PageSection
              title={t('nav.foundation')}
              description={t('campaigns.strategy.bands.foundation')}
            >
              <BrandOverview
                brand={fetched(brand)}
                facts={facts}
                // The library only — a campaign's own series is bounded by it and
                // is not something another campaign can pick up, so listing one
                // on the workspace hub would overstate what is there.
                series={(series ?? []).filter(
                  (entry) => entry.scope.kind === 'workspace',
                )}
                stance={stance}
                onOpen={(id) => navigate({ to: `/foundation/${id}` })}
              />
            </PageSection>
          </div>
        </ScrollArea>
      </div>
    </BrandPage>
  )
}
