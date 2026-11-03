import { useEffect, useRef } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { cn } from '@/lib'
import { dimensionLabel } from '@/lib/postQuality.ts'
import type { SpanStatus } from '@/lib/qualityHighlights.ts'
import type { QualitySuggestion } from '@/types/quality'
import { EmphasisText } from './EmphasisText.tsx'
import { SEVERITY_CLASS, SEVERITY_SOLID, SEVERITY_SWATCH } from './tokens.ts'

/**
 * Where the list meets the post (CON-441): what each suggestion's span became
 * in the editor, which one is chosen, and how to choose one.
 */
export type FixFirstHighlight = {
  /** By the suggestion's index; `undefined` while the body is still looking. */
  statuses: (SpanStatus | undefined)[]
  chosen: number | null
  onToggle: (index: number) => void
}

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
 *
 * With `highlight`, the post is a map of the list (CON-441): each row's quote
 * and advice are one button that brings its span to full strength in the
 * editor. The chosen row is taped off — yellow stripes fading down from its
 * top edge, 2px tape edges in place of the rules — and the only patterned
 * surface in the panel, so it reads as picked up rather than boxed. All of it
 * is drawn inside the row's own padding, so choosing a row moves nothing.
 */
export function FixFirstList({
  suggestions,
  highlight,
}: {
  /** Already ordered — `postSuggestions`. */
  suggestions: QualitySuggestion[]
  highlight?: FixFirstHighlight
}) {
  const { t } = useTranslation()
  const chosen = highlight?.chosen ?? null
  const rows = useRef<(HTMLLIElement | null)[]>([])

  // A span clicked in the post brings its row into view, so the advice for it
  // is on screen beside it.
  useEffect(() => {
    if (chosen === null) return
    const reduce = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches
    rows.current[chosen]?.scrollIntoView?.({
      block: 'nearest',
      behavior: reduce ? 'auto' : 'smooth',
    })
  }, [chosen])

  const announced = chosen !== null ? suggestions[chosen] : undefined

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
            const status = highlight?.statuses[i]
            const picked = chosen === i
            const quote =
              status === 'whole' ? (
                <span className="block bg-tertiary px-2.5 py-1.5 text-[13px]/[1.45] text-foreground">
                  <Trans
                    i18nKey="posts.quality.fixFirst.wholePost"
                    components={{
                      muted: <span className="text-tertiary-foreground" />,
                    }}
                  />
                </span>
              ) : s.span ? (
                // A wash rather than a rule down the side: it is a quotation,
                // not an alert. `<q>` so the quotation marks are the
                // language's own.
                <span
                  className={cn(
                    'block px-2.5 py-1.5 text-[13px]/[1.45] text-foreground italic',
                    picked ? 'bg-primary' : 'bg-tertiary',
                  )}
                >
                  <q>{s.span}</q>
                </span>
              ) : null
            const advice = s.advice ? (
              <EmphasisText
                as={highlight ? 'span' : 'p'}
                text={s.advice}
                className="block text-sm/[1.5] text-foreground"
              />
            ) : null

            return (
              <li
                key={i}
                ref={(el) => {
                  rows.current[i] = el
                }}
                data-chosen={picked || undefined}
                className={cn(
                  'relative isolate flex flex-col gap-1.5 border-b border-border py-4 last:border-b-0',
                  // The tape edges stand in for the rules on either side.
                  '[&:has(+li[data-chosen])]:border-b-transparent',
                  // Out to the panel's edges, sideways only: the padding the
                  // tape needs above and below is every row's own.
                  picked && '-mx-3 border-b-transparent px-3 lg:-mx-6 lg:px-6',
                )}
              >
                {picked && (
                  <>
                    <span
                      aria-hidden
                      className="quality-tape quality-tape--soft"
                    />
                    <span
                      aria-hidden
                      className="quality-tape quality-tape--sharp"
                    />
                    <span
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-0.5 bg-tape"
                    />
                    <span
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-0.5 bg-tape"
                    />
                    {/* Points at the editor from the panel's edge. */}
                    <span
                      aria-hidden
                      className="absolute top-1/2 left-0 size-0 -translate-y-1/2 border-y-[6px] border-r-[8px] border-y-transparent border-r-foreground"
                    />
                  </>
                )}
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      'px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]',
                      picked
                        ? SEVERITY_SOLID[severity]
                        : SEVERITY_CLASS[severity],
                    )}
                  >
                    {t(`posts.quality.severity.${severity}`)}
                  </span>
                  <span
                    className={cn(
                      'text-xs text-secondary-foreground',
                      // A halo of panel white, so no stripe runs through it.
                      picked &&
                        '[text-shadow:0_0_2px_var(--color-primary),0_0_4px_var(--color-primary)]',
                    )}
                  >
                    {dimensionLabel(t, s.dimension)}
                  </span>
                  {status === 'edited' && (
                    <span className="ml-auto flex items-center gap-1.5 text-xs text-tertiary-foreground">
                      <span
                        aria-hidden
                        className={cn(
                          'h-[1.5px] w-3',
                          SEVERITY_SWATCH[severity],
                        )}
                      />
                      {t('posts.quality.fixFirst.edited')}
                    </span>
                  )}
                </div>
                {highlight ? (
                  <button
                    type="button"
                    aria-pressed={picked}
                    onClick={() => highlight.onToggle(i)}
                    className="flex cursor-pointer flex-col gap-1.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-primary"
                  >
                    {quote}
                    {advice}
                  </button>
                ) : (
                  <>
                    {quote && <p>{quote}</p>}
                    {advice}
                  </>
                )}
              </li>
            )
          })}
        </ol>
      )}

      {highlight && (
        <p aria-live="polite" className="sr-only">
          {announced
            ? highlight.statuses[chosen ?? -1] === 'whole'
              ? t('posts.quality.fixFirst.announceWhole')
              : t('posts.quality.fixFirst.announce', { span: announced.span })
            : ''}
        </p>
      )}
    </section>
  )
}
