import { useTranslation } from 'react-i18next'
import { cn } from '@/lib'
import {
  QUALITY_DIMENSIONS,
  dimensionLabel,
  lowestDimension,
  radarScore,
  reasonRowId,
} from '@/lib/postQuality.ts'
import type { PostEvaluation } from '@/types/quality'

/**
 * "Why these scores": each dimension's name, score and the model's verdict on
 * it (CON-440). Shown open — the verdict is at most two sentences (CON-438),
 * short enough that a disclosure would only add a click in front of it.
 *
 * Each row carries an id and takes focus, so a radar corner can bring its
 * reason into view and hand it to a screen reader.
 */
export function ScoreReasons({ evaluation }: { evaluation: PostEvaluation }) {
  const { t } = useTranslation()
  const lowest = lowestDimension(evaluation)

  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-[15px] font-semibold text-foreground">
        {t('posts.quality.reasons.title')}
      </h3>
      <ul className="flex flex-col">
        {QUALITY_DIMENSIONS.map((meta) => {
          const d = evaluation.result?.[meta.key]
          // A dimension missing from the payload is a shape we don't
          // understand; drawing a zero would assert a score never given.
          if (!d) return null
          const isLowest = lowest === meta.key
          return (
            <li
              key={meta.key}
              id={reasonRowId(meta.key)}
              tabIndex={-1}
              className="flex scroll-mt-4 flex-col gap-0.5 border-b border-border py-3 last:border-b-0 focus-visible:outline-2 focus-visible:outline-border-primary"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className={cn(
                    'text-sm text-foreground',
                    isLowest ? 'font-semibold' : 'font-medium',
                  )}
                >
                  {dimensionLabel(t, meta.key)}
                </span>
                <span className="text-sm text-foreground tabular-nums">
                  <span className={isLowest ? 'font-bold' : undefined}>
                    {radarScore(d.score)}
                  </span>
                  <span className="text-tertiary-foreground">
                    {t('posts.quality.outOfTen')}
                  </span>
                </span>
              </div>
              {d.verdict && (
                <p className="text-[13px]/[1.5] text-secondary-foreground">
                  {d.verdict}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
