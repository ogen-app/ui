import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AssetAnalysis } from '@/types/assetAnalysis'
import { Section } from './InsightSection'
import { Bullets } from './MeetingNotes'
import { summaryHasMore } from '@/lib/assetAnalysis'
import { SummaryLead, SummaryText } from './SummaryText'
import { TextButton } from '@/components/ui/text-button'

/**
 * The reading (CON-369): the summary's lead, then the key points — and the
 * whole summary on request.
 *
 * It heads the page's main column, over the ideas, so it is folded to its
 * first paragraph: a summary runs to several, and unfolded it would push the
 * ideas off the screen. The key points are never folded away — they are the
 * summary at a glance.
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
  const [whole, setWhole] = useState(false)
  const hasSummary = lens.summary.trim() !== ''
  const more = hasSummary && summaryHasMore(lens.summary)

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-2">
        {whole || !more ? (
          <SummaryText text={lens.summary} />
        ) : (
          <p className="text-sm/6 text-foreground">
            <SummaryLead text={lens.summary} />
          </p>
        )}
        {more && (
          <TextButton
            className="text-sm"
            aria-expanded={whole}
            onClick={() => setWhole((w) => !w)}
          >
            {whole
              ? t('assetInsights.cards.readLess')
              : t('assetInsights.cards.readWhole')}
          </TextButton>
        )}
      </div>
      {note}
      {points}
    </div>
  )
}
