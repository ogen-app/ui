import { useTranslation } from 'react-i18next'
import { cn } from '@/lib'
import {
  QUALITY_DIMENSIONS,
  dimensionLabel,
  formatDelta,
  lowestDimension,
  overallBand,
  overallPct,
  postSuggestions,
  radarScore,
  scoreDelta,
  staleReason,
  suggestionCountLine,
} from '@/lib/postQuality.ts'
import type { PostEvaluation } from '@/types/quality'
import { Button } from '@/components/ui/button.tsx'
import { StatusBadge } from '@/components/ui/status-badge'
import { BandTag } from './BandTag.tsx'
import { CornerGlyph, QualityRadarMini } from './QualityRadar.tsx'

type Props = {
  assessment: PostEvaluation
  /** The run this one replaced while the post was open, if any (CON-440). */
  previous?: PostEvaluation | null
  onOpenPanel: () => void
}

/**
 * The quality score as it appears on the post editor's Checks tab (CON-183,
 * reworked in CON-440).
 *
 * Stacked for the side column: the overall beside the radar's shape, the four
 * scores — each with a glyph naming its corner of that shape — and how many
 * suggestions are waiting, with the way to them. A glance here says whether
 * there is work to do, not only how it went; the Quality tab says what the
 * work is.
 *
 * A digest, not a second panel. The verdicts and the suggestions themselves
 * stay on the Quality tab, which this links to.
 *
 * Only ever rendered against a stored assessment. The states around one —
 * never scored, running, failed, switched off — belong to the tab around it.
 */
export function QualityInlineSummary({
  assessment,
  previous = null,
  onOpenPanel,
}: Props) {
  const { t } = useTranslation()
  const pct = Math.round(overallPct(assessment))
  const band = overallBand(pct)
  const before = previous ? Math.round(overallPct(previous)) : null
  const stale = staleReason(assessment)
  const lowest = lowestDimension(assessment)
  const suggestions = postSuggestions(assessment)

  return (
    <section className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-y-5">
        <div className="flex items-center gap-4">
          <QualityRadarMini evaluation={assessment} previous={previous} />
          <div className="flex flex-col items-start gap-1.5">
            <p className="font-display text-[34px]/none font-medium tracking-[-0.03em] text-foreground tabular-nums">
              {pct}
            </p>
            <BandTag band={band} />
            {before !== null && before !== pct && (
              <p className="text-xs font-medium text-secondary-foreground tabular-nums">
                {formatDelta(pct - before)}
              </p>
            )}
          </div>
        </div>

        <ul className="flex flex-col justify-center gap-1.5">
          {QUALITY_DIMENSIONS.map((meta) => {
            const dimension = assessment.result?.[meta.key]
            // A dimension missing from the payload is a shape we don't
            // understand; drawing a zero would assert a score never given.
            if (!dimension) return null
            const delta = scoreDelta(assessment, previous, meta.key)
            const isLowest = lowest === meta.key
            return (
              <li key={meta.key} className="flex items-center gap-2 text-sm">
                <CornerGlyph corner={meta.corner} />
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-foreground',
                    isLowest && 'font-semibold',
                  )}
                >
                  {dimensionLabel(t, meta.key)}
                </span>
                <span className="shrink-0 text-xs tabular-nums">
                  <span
                    className={cn(
                      'font-display text-sm text-foreground',
                      isLowest ? 'font-bold' : 'font-medium',
                    )}
                  >
                    {radarScore(dimension.score)}
                  </span>
                  <span className="text-tertiary-foreground">
                    {t('posts.quality.outOfTen')}
                  </span>
                </span>
                <span className="w-6 shrink-0 text-right text-xs text-secondary-foreground tabular-nums">
                  {delta !== null && delta !== 0 ? formatDelta(delta) : null}
                </span>
              </li>
            )
          })}
        </ul>

        <div className="flex flex-col justify-center gap-1">
          {/* A count, not the advice itself (CON-443): quoted whole, two
              suggestions ran to eight lines each and made the bar taller than
              the editor area it summarises. This still says whether there is
              something to fix; the rail says what. */}
          {suggestions.length > 0 && (
            <p className="text-sm text-secondary-foreground">
              {suggestionCountLine(t, suggestions)}
            </p>
          )}
          {/* `-ml-3` cancels the ghost's own left padding so the label starts
              on the column's edge — the padding is there for the hover
              surface, not for indentation. */}
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onOpenPanel}
              className="-ml-3 uppercase"
            >
              {suggestions.length > 0
                ? t('posts.quality.inline.seeAll', {
                    count: suggestions.length,
                  })
                : t('posts.quality.seeBreakdown')}
            </Button>
          </div>
        </div>
      </div>

      {/* The badge and the reason, not the action: re-assessing is the
          bar's own link, one row up, and the rail's — a third copy here
          would be the same run offered twice in one glance. */}
      {stale && (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge tone="warn" label={t('posts.quality.stale.badge')} />
          <p className="text-sm/[1.5] text-secondary-foreground">
            {t(`posts.quality.stale.${stale}`)}
          </p>
        </div>
      )}
    </section>
  )
}
