import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import folderEmptyImage from '@/assets/illustrations/folder-empty.webp'
import { formatNumber } from '@/lib/intl'
import type {
  CountQuery,
  FilterModel,
  SentenceVocabulary,
  SmartToken,
} from '@/lib/smartFilter'

/**
 * What a list says when the filters leave nothing (CON-371): which one token
 * is in the way, how many rows taking it off would bring back, and that
 * removal as the button. Clear all is the fallback beside it, not the first
 * suggestion — the other filters were deliberate.
 *
 * The figure is asked of the server, one count per token: a facet can't give
 * it for a field a row holds several values of, and every number on these
 * screens is the server's.
 *
 * State, not teaching, so it is not an `Explainer` and cannot be dismissed.
 *
 * Drawn the way an empty campaign is (`PostsEmptyState`): a washed-out sketch
 * of the list it stands in for, the folder illustration, then the words — so
 * it reads as this list with nothing left in it rather than as an error.
 * `columns` labels the sketch's header with the real list's own words, where
 * the list is a table.
 */
export function NoMatches<F, Field extends string>({
  title,
  filter,
  model,
  vocabulary: vocab,
  countQuery,
  onChange,
  columns,
}: {
  /** "No assets match these filters." */
  title: string
  /** The table's column headers, for the sketch behind; omitted, bars only. */
  columns?: readonly string[]
  filter: F
  model: FilterModel<F, Field>
  vocabulary: Pick<SentenceVocabulary<Field>, 'tokenText'>
  countQuery: CountQuery<F>
  onChange: (next: F) => void
}) {
  const { t, i18n } = useTranslation()
  const tokens = useMemo(() => model.tokensOf(filter), [model, filter])

  const counts = useQueries({
    queries: tokens.map((token) => ({
      ...countQuery(model.withoutToken(filter, token)),
      staleTime: 30_000,
    })),
  })

  // The removal that brings back the most; the later token on a tie, being
  // the one added last.
  let best: { token: SmartToken<Field>; count: number } | null = null
  tokens.forEach((token, i) => {
    const count = counts[i]?.data ?? 0
    if (count > 0 && (!best || count >= best.count)) best = { token, count }
  })
  const found = best as { token: SmartToken<Field>; count: number } | null

  const clearAll = () =>
    onChange(tokens.reduce((f, token) => model.withoutToken(f, token), filter))

  return (
    <div className="relative min-h-[420px] flex-1 overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 flex select-none flex-col gap-0.5"
      >
        {columns && (
          <div
            className="grid shrink-0 gap-px bg-table-header px-3 py-2"
            style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}
          >
            {columns.map((label) => (
              <span key={label} className="text-xs text-tertiary-foreground">
                {label}
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-1 flex-col gap-2 px-3 py-2">
          {GHOST_ROWS.map((width, i) => (
            <div
              key={i}
              className="flex h-[34px] shrink-0 items-center border-2 border-dashed border-border px-3"
            >
              <span className="h-2 rounded-full bg-border" style={{ width }} />
            </div>
          ))}
        </div>
      </div>
      {/* Wash the sketch back so the words stay the focal point. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-b from-background/60 via-background/85 to-background"
      />
      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div className="flex w-full max-w-[400px] flex-col items-center gap-2 text-center">
          <img
            src={folderEmptyImage}
            alt=""
            aria-hidden
            className="mb-4 h-auto w-32"
          />
          <p className="font-display text-2xl/8 font-medium text-foreground">
            {title}
          </p>
          {found && (
            <p className="text-secondary-foreground">
              {t('content.filter.empty.removing', {
                filter: vocab.tokenText(found.token),
                count: found.count,
                formatted: formatNumber(found.count, {}, i18n.language),
              })}
            </p>
          )}
          <div className="mt-4 flex items-center gap-3">
            {found && (
              <Button
                variant="defaultInverted"
                onClick={() =>
                  onChange(model.withoutToken(filter, found.token))
                }
              >
                {t('content.filter.empty.remove', {
                  filter: vocab.tokenText(found.token),
                })}
              </Button>
            )}
            <Button
              variant={found ? 'ghost' : 'defaultInverted'}
              className={found ? 'text-secondary-foreground' : undefined}
              onClick={clearAll}
            >
              {t('content.filter.empty.clearAll')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** The sketch's rows: a line of text each, at uneven lengths, as a list has. */
const GHOST_ROWS = ['38%', '24%', '46%', '31%', '19%', '42%', '28%', '35%']
