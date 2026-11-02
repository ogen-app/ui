import { useTranslation } from 'react-i18next'
import { cn } from '@/lib'
import { dimensionLabel } from '@/lib/postQuality.ts'
import type { QualitySuggestion } from '@/types/quality'
import { SEVERITY_CLASS } from './tokens.ts'

/**
 * Every suggestion from the four dimensions in one list, most severe first
 * (CON-438, CON-440). The only things in the panel a user can act on, so they
 * come before the reasons rather than after them.
 *
 * Shown whole: the server caps a post at five, so there is nothing to page
 * through, and a "show more" would hide the most actionable part of the panel
 * behind a click. Each item quotes the span first and the advice under it —
 * the quote is what makes "move the number up" into something the reader can
 * find in the post, so it is what they should see before what to do with it.
 */
export function FixFirstList({
  suggestions,
}: {
  /** Already ordered — `postSuggestions`. */
  suggestions: QualitySuggestion[]
}) {
  const { t } = useTranslation()

  return (
    <section className="flex flex-col gap-1">
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-foreground">
          {t('posts.quality.fixFirst.title')}
          {suggestions.length > 0 && (
            <span className="ml-1.5 font-normal text-tertiary-foreground tabular-nums">
              {suggestions.length}
            </span>
          )}
        </h3>
        {suggestions.length > 1 && (
          <span className="text-xs text-tertiary-foreground">
            {t('posts.quality.fixFirst.order')}
          </span>
        )}
      </header>

      {suggestions.length === 0 ? (
        <p className="py-2 text-sm text-secondary-foreground">
          {t('posts.quality.fixFirst.none')}
        </p>
      ) : (
        <ol className="flex flex-col">
          {suggestions.map((s, i) => {
            const severity = s.severity in SEVERITY_CLASS ? s.severity : 'low'
            return (
              <li
                key={i}
                className="flex flex-col gap-1.5 border-b border-border py-4 last:border-b-0"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      'px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]',
                      SEVERITY_CLASS[severity],
                    )}
                  >
                    {t(`posts.quality.severity.${severity}`)}
                  </span>
                  <span className="text-xs text-secondary-foreground">
                    {dimensionLabel(t, s.dimension)}
                  </span>
                </div>
                {/* A wash rather than a rule down the side: it is a
                    quotation, not an alert. `<q>` so the quotation marks are
                    the language's own. */}
                {s.span && (
                  <p className="bg-tertiary px-2.5 py-1.5 text-[13px]/[1.45] text-foreground italic">
                    <q>{s.span}</q>
                  </p>
                )}
                {s.advice && (
                  <p className="text-sm/[1.5] text-foreground">{s.advice}</p>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
