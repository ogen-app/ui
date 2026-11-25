import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { PageError } from '@/components/page-primitives/PageError'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { BrandSectionFrame } from '@/components/brand/detail'
import { BrandSectionAside } from '@/components/brand/sectionAside'
import { useSeriesLibrary } from '@/hooks/useSeries'
import type { ContentSeries } from '@/types/series'

/**
 * `/foundation/series` — the frame every other Foundation section has
 * (`BrandSectionFrame`), gated on its own query instead of `useBrand`
 * (CON-264): series are not on `BrandData` and never will be, so the gate is
 * this file's and the chrome is imported, so the two cannot drift.
 *
 * The body never runs without data, for `BrandDetail`'s reason: a library
 * drawn while the fetch is in flight is an empty library that is a lie.
 *
 * Its cards go without the "Chosen by" line voices and audiences print —
 * see `useUsedBy` for why.
 */
export function SeriesDetail({
  children,
}: {
  children: (series: ContentSeries[]) => ReactNode
}) {
  const { t } = useTranslation()
  const { data, isPending, isError } = useSeriesLibrary()
  // The workspace library, not every scope: a campaign's own series is bounded
  // by that campaign and belongs on its page, not in the list other campaigns
  // pick from. Promotion is the one way across (`promoteSeries`).
  const library = data?.filter((entry) => entry.scope.kind === 'workspace')

  return (
    <BrandSectionFrame
      section="series"
      aside={
        <BrandSectionAside
          section="series"
          empty={library !== undefined && library.length === 0}
        />
      }
    >
      {isPending ? (
        <PageLoader />
      ) : isError || !library ? (
        <PageError
          header={t('brand.detail.errorHeader')}
          message={t('brand.detail.errorMessage')}
        />
      ) : (
        children(library)
      )}
    </BrandSectionFrame>
  )
}
