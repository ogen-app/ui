import { useTranslation } from 'react-i18next'
import type { ReviewFindingRef } from '@/types/assistant'
import { StatusWord } from './blocks'

/**
 * A post thread's message sent from a review finding (CON-495, board 7): in
 * place of the bubble, the finding it was asked to fix — the post's own words
 * when the finding is about some of them, then what is wrong with them. The
 * instruction under it is ours, so it isn't shown; the finding is what the
 * user asked about. Live and reloaded alike, from the turn's view context.
 */
export function FromReview({ finding }: { finding: ReviewFindingRef }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-1 bg-assistant-bubble px-4 py-3 text-assistant-bubble-foreground">
      <StatusWord>{t('assistant.repair.review.fromReview')}</StatusWord>
      <p className="text-sm/[1.5]">
        {finding.quote
          ? t('assistant.repair.review.fromReviewQuoted', {
              quote: finding.quote,
              issue: finding.issue,
            })
          : finding.issue}
      </p>
    </div>
  )
}
