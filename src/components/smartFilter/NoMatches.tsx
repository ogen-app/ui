import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/lib/intl'
import type {
  FilterModel,
  SmartToken,
  SmartVocabulary,
} from '@/lib/smartFilter'
import type { CountQuery } from './SmartFilterBar'

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
 */
export function NoMatches<F, Field extends string>({
  title,
  filter,
  model,
  vocabulary: vocab,
  countQuery,
  onChange,
}: {
  /** "No assets match these filters." */
  title: string
  filter: F
  model: FilterModel<F, Field>
  vocabulary: SmartVocabulary<Field>
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
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="text-base font-medium text-foreground">{title}</p>
      {found && (
        <p className="text-sm text-secondary-foreground">
          {t('content.filter.empty.removing', {
            filter: vocab.tokenText(found.token),
            count: found.count,
            formatted: formatNumber(found.count, {}, i18n.language),
          })}
        </p>
      )}
      <div className="mt-3 flex items-center gap-3">
        {found && (
          <Button
            variant="outline"
            onClick={() => onChange(model.withoutToken(filter, found.token))}
          >
            {t('content.filter.empty.remove', {
              filter: vocab.tokenText(found.token),
            })}
          </Button>
        )}
        <Button
          variant={found ? 'ghost' : 'outline'}
          className={found ? 'text-secondary-foreground' : undefined}
          onClick={clearAll}
        >
          {t('content.filter.empty.clearAll')}
        </Button>
      </div>
    </div>
  )
}
