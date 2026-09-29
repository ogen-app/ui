import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PageError } from '@/components/page-primitives/PageError'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import {
  BrandBackButton,
  BrandColumn,
  BrandPage,
} from '@/components/brand/detail'
import { BrandIntro } from '@/components/brand/shell'
import { useSeriesLibrary } from '@/hooks/useSeries'
import { brandSection, brandSectionCopy } from '@/lib/brandSections'
import type { ContentSeries } from './types'

/**
 * `/foundation/series` — the same screen shape every other Foundation section
 * has, gated on its own query instead of `useBrand` (CON-264).
 *
 * A near-copy of `BrandDetail`, and the duplication is deliberate rather than
 * lazy. `BrandDetail`'s whole value is that **the body never runs without
 * data**: five routes used to write the same three branches, and a section that
 * reads `data?.voices` can quietly draw an empty library while the fetch is
 * still in flight — which is the one lie this module is built to avoid. Series
 * needs exactly that guarantee over a different query. The alternatives were to
 * widen `BrandDetail` with a second optional data source, which makes every
 * existing section carry a parameter about a section it knows nothing about, or
 * to put series on `BrandData`, which would be a claim that `/api/brand` sends
 * them. It does not, and will not — series will be a table of its own.
 *
 * The chrome itself is imported rather than re-implemented, so the two screens
 * cannot drift: same page frame, same back caret, same column rhythm, same
 * intro card read out of the section table.
 *
 * When `/api/series` lands, the honest move is to fold this back into
 * `BrandDetail` behind one render-prop that takes both queries — not before,
 * because until then the second query is the thing being designed.
 */
export function SeriesDetail({
  children,
}: {
  children: (series: ContentSeries[]) => ReactNode
}) {
  return (
    <BrandPage>
      <div className="relative flex min-h-0 flex-1">
        <ScrollArea
          className="min-h-0 flex-1"
          type="scroll"
          scrollHideDelay={350}
        >
          <PageHeader back={<BrandBackButton />} />
          <div className="px-3 pb-10 lg:px-6">
            <SeriesDetailBody>{children}</SeriesDetailBody>
          </div>
        </ScrollArea>
      </div>
    </BrandPage>
  )
}

function SeriesDetailBody({
  children,
}: {
  children: (series: ContentSeries[]) => ReactNode
}) {
  const { t } = useTranslation()
  const { data, isPending, isError } = useSeriesLibrary()

  if (isPending) return <PageLoader />
  if (isError || !data) {
    return (
      <PageError
        header={t('brand.detail.errorHeader')}
        message={t('brand.detail.errorMessage')}
      />
    )
  }

  // The workspace library, not every scope: a campaign's own series is bounded
  // by that campaign and belongs on its page, not in the list other campaigns
  // pick from. Promotion is the one way across (`promoteSeries`).
  const library = data.filter((entry) => entry.scope.kind === 'workspace')
  const info = brandSection('series')
  const copy = brandSectionCopy(t, 'series')

  return (
    <BrandColumn>
      <BrandIntro
        icon={info.icon}
        tone={info.tone}
        title={copy.label}
        body={copy.description}
        missing={library.length === 0 ? copy.whenEmpty : undefined}
        readBy={info.readBy}
      />
      {children(library)}
    </BrandColumn>
  )
}
