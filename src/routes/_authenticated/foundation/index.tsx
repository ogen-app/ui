import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PageColumns } from '@/components/page-primitives/PageColumns'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { BrandOverview } from '@/components/brand/BrandOverview'
import { BrandPage } from '@/components/brand/detail'
import { CampaignTimeline } from '@/components/strategy/CampaignTimeline'
import { useBrand } from '@/hooks/useBrand'
import { useFacts } from '@/hooks/useFacts'
import { useGuardrailsStance } from '@/hooks/useGuardrailsStance'
import { useSeriesLibrary } from '@/hooks/useSeries'
import { fetched } from '@/lib/fetched'

/**
 * `/foundation` — **Strategy for all campaigns**: the Foundation's hub in the
 * page's column, and the campaigns on one time axis in a fixed-width second
 * column beside it.
 *
 * Strategy and Foundation were two rows of the rail, one only for a campaign
 * and one only for the workspace, and they were one subject seen from the two
 * levels (`lib/campaignScope`). So this page is the Strategy row with no
 * campaign chosen, and a campaign's Strategy page is the same row narrowed.
 * The timeline sits beside the hub (`PageColumns`' second column) because it
 * is one card and the hub is eight; it goes under the hub only when the page
 * is too narrow for both.
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
 * to the bar above. See `BrandDetail`.
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
  const series = useSeriesLibrary()

  return (
    <BrandPage>
      <div className="relative flex min-h-0 flex-1">
        <ScrollArea
          className="min-h-0 flex-1"
          type="scroll"
          scrollHideDelay={350}
        >
          <PageHeader title={t('nav.campaign.strategy')} scrollAway />
          <PageColumns aside={<CampaignTimeline />}>
            <BrandOverview
              brand={fetched(brand)}
              facts={facts}
              // The library only — a campaign's own series is bounded by it and
              // is not something another campaign can pick up, so listing one
              // on the workspace hub would overstate what is there.
              series={fetched({
                data: series.data?.filter(
                  (entry) => entry.scope.kind === 'workspace',
                ),
                isError: series.isError,
              })}
              stance={stance}
              onOpen={(id) => navigate({ to: `/foundation/${id}` })}
            />
          </PageColumns>
        </ScrollArea>
      </div>
    </BrandPage>
  )
}
