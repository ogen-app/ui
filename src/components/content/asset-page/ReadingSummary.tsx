import { useTranslation } from 'react-i18next'
import type { AssetAnalysis } from '@/types/assetAnalysis'
import { Section } from './InsightSection'
import { Bullets } from './MeetingNotes'
import { SummaryText } from './SummaryText'

/**
 * The reading in full (CON-369): the whole summary, then the key points.
 *
 * It has the Summary tab to itself, so nothing is folded: the Overview quotes
 * its opening lines and opens this tab for the rest. The tab scrolls as one —
 * there is no box scrolling inside it for the wheel to get caught in.
 */
export function ReadingSummary({
  lens,
}: {
  lens: Pick<
    AssetAnalysis,
    'summary' | 'key_points' | 'partial_source' | 'truncated'
  >
}) {
  const { t } = useTranslation()
  const hasSummary = lens.summary.trim() !== ''

  const note = (lens.partial_source || lens.truncated) && (
    <p className="text-xs text-warning">
      {lens.partial_source
        ? t('assetInsights.partialSource')
        : t('assetInsights.truncated')}
    </p>
  )
  const points = lens.key_points.length > 0 && (
    <Section title={t('assetInsights.keyPoints')}>
      <Bullets items={lens.key_points} />
    </Section>
  )

  if (!hasSummary) return points || null

  return (
    <Section title={t('assetInsights.summary')}>
      <div className="flex flex-col gap-6">
        <SummaryText text={lens.summary} />
        {note}
        {points}
      </div>
    </Section>
  )
}
