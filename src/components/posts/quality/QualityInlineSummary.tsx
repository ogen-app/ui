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
} from '@/lib/postQuality.ts'
import type { PostEvaluation } from '@/types/quality'
import { Button } from '@/components/ui/button.tsx'
import { StatusBadge } from '@/components/ui/status-badge'
import { BandTag } from './BandTag.tsx'
import { CornerGlyph, QualityRadarMini } from './QualityRadar.tsx'
import { SEVERITY_CLASS } from './tokens.ts'

type Props = {
  assessment: PostEvaluation
  /** The run this one replaced while the post was open, if any (CON-440). */
  previous?: PostEvaluation | null
  onOpenPanel: () => void
}

/** The checks bar has room for the start of the list, not the list. */
const FIXES_SHOWN = 2

/**
 * The quality score as it appears inside the expanded checks bar (CON-183,
 * reworked in CON-440).
 *
 * Three columns: the overall beside the radar's shape, the four scores — each
 * with a glyph naming its corner of that shape — and the first fixes from the
 * rail's list, word for word. A glance here says what to do next, not only how
 * it went.
 *
 * A digest, not a second panel. The verdicts and the rest of the list stay in
 * the rail, which this links to. Two full breakdowns would be two things to
 * keep in step and twice the height above the editor.
 *
 * Only ever rendered against a stored assessment. The states around one —
 * never scored, running, failed, switched off — belong to the bar's header,
 * where they stay reachable without expanding anything.
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
    // The rule and the space around it are what separate this from the
    // requirements list above — matching the `pt-5` that opens that one, so
    // both sections stand off their neighbours by the same amount.
    <section className="mt-5 flex flex-col gap-4 border-t border-border pt-5">
      {/* The app's section-label typography — `AppSidebar`'s `SectionLabel`
          recipe. This region sits inside a bar that is already about the post,
          so it needs to say which of the two questions it answers. */}
      <h3 className="font-grotesk text-xs/4 font-medium uppercase text-tertiary-foreground">
        {t('posts.quality.inlineHeading')}
      </h3>

      <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.3fr)]">
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

        <div className="flex flex-col gap-2 md:border-l md:border-border md:pl-8">
          {suggestions.length > 0 && (
            <>
              <span className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.06em] text-tertiary-foreground">
                {t('posts.quality.inline.fixFirst')}
              </span>
              <ol className="flex flex-col gap-1.5">
                {suggestions.slice(0, FIXES_SHOWN).map((s, i) => {
                  const severity =
                    s.severity in SEVERITY_CLASS ? s.severity : 'low'
                  return (
                    <li key={i} className="flex items-baseline gap-2 text-sm">
                      <span
                        className={cn(
                          'shrink-0 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]',
                          SEVERITY_CLASS[severity],
                        )}
                      >
                        {t(`posts.quality.severity.${severity}`)}
                      </span>
                      <span className="min-w-0 text-foreground">
                        {s.advice}
                      </span>
                    </li>
                  )
                })}
              </ol>
            </>
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
