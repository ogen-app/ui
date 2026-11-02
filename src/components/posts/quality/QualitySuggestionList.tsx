import { useTranslation } from 'react-i18next'
import { cn } from '@/lib'
import { QUALITY_DIMENSIONS } from '@/lib/postQuality.ts'
import type { QualitySeverity, QualitySuggestion } from '@/types/quality'

/**
 * Severity reads as a tag — the severity colour over a tenth-opacity wash of
 * itself. Matches the assistant's review findings, which use the same
 * high/medium/low vocabulary; they should not look like two different scales.
 */
const SEVERITY_CLASS: Record<QualitySeverity, string> = {
  high: 'bg-destructive/10 text-destructive',
  medium: 'bg-warning/10 text-warning',
  low: 'bg-tertiary-foreground/10 text-tertiary-foreground',
}

/**
 * The post's suggestions as one short list, most severe first (CON-438).
 *
 * At most five, so it is shown open: there is nothing to page through, and a
 * disclosure would hide the most actionable part of the panel behind a click.
 * Each item quotes the span first and the advice under it — the quote is what
 * makes "move the number up" into something the reader can find in the post,
 * so it is what they should see before they read what to do with it.
 */
export function QualitySuggestionList({
  suggestions,
}: {
  /** Already ordered — `postSuggestions`. */
  suggestions: QualitySuggestion[]
}) {
  const { t } = useTranslation()
  if (suggestions.length === 0) return null

  return (
    <section className="flex flex-col gap-2">
      {/* The app's section-label recipe, as in the post preview's "NOTES". */}
      <h3 className="text-[11px] font-semibold tracking-[0.05em] text-tertiary-foreground">
        {t('posts.quality.suggestionsHeading')}
      </h3>
      <ul className="flex flex-col gap-3">
        {suggestions.map((suggestion, i) => {
          const dimension = QUALITY_DIMENSIONS.find(
            (meta) => meta.key === suggestion.dimension,
          )
          const severity =
            suggestion.severity in SEVERITY_CLASS ? suggestion.severity : 'low'
          return (
            <li key={i} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'shrink-0 px-[3px] py-[2px] text-[10px] font-semibold uppercase tracking-[0.08em]',
                    SEVERITY_CLASS[severity],
                  )}
                >
                  {t(`posts.quality.severity.${severity}`)}
                </span>
                {dimension && (
                  <span className="text-xs text-tertiary-foreground">
                    {dimension.label}
                  </span>
                )}
              </div>
              {suggestion.span && (
                <p className="border-l-2 border-quinary pl-2 text-xs/[1.5] italic text-tertiary-foreground">
                  {suggestion.span}
                </p>
              )}
              {suggestion.advice && (
                <p className="text-sm/[1.5] text-foreground">
                  {suggestion.advice}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
