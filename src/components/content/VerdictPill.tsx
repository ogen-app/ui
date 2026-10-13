import { Link, type LinkProps } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib'
import {
  VERDICT_ORDER,
  verdictSentence,
  type VerdictKey,
} from '@/lib/assetList'
import type { IdeaCounts } from '@/lib/ideas'
import { VERDICT_ICON } from './verdictIcons'

/**
 * How an asset's ideas have been answered, as one pill (CON-370): a segment
 * per verdict, icon and count, always in the order Undecided · Yes · Not now
 * · No so each icon keeps its place. A verdict with no ideas is left out —
 * the table's rule for empty cells — so a fixed four-slot pill doesn't bring
 * the zeros back.
 *
 * Undecided leads and is the only teal: it is the figure someone acts on, so
 * a pill with no teal is an asset fully triaged. The tooltip spells it out
 * ("4 undecided · 2 yes · 1 not now") and is the legend; the same sentence is
 * the pill's name for a screen reader.
 *
 * Drawn at 1.2× the size it first had (CON-378): on the ideas-first list it is
 * the row's status, and the figure someone acts on deserves to be read first.
 *
 * Each segment opens the asset's Insights on that verdict. Ideas are never
 * answered here — one place to decide, not two.
 */
export function VerdictPill({
  counts,
  link,
}: {
  counts: IdeaCounts
  /** Where a segment goes: the asset's page, on that verdict. */
  link: (verdict: VerdictKey) => LinkProps
}) {
  const { t } = useTranslation()
  const shown = VERDICT_ORDER.filter((v) => counts[v] > 0)
  if (shown.length === 0) return null
  const sentence = verdictSentence(t, counts)

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <span
          role="group"
          aria-label={sentence}
          className="inline-flex h-[29px] items-stretch overflow-hidden rounded-full bg-tertiary text-[14.5px] tabular-nums"
        >
          {shown.map((verdict, i) => (
            <Link
              key={verdict}
              {...link(verdict)}
              aria-label={t(`content.list.verdict.${verdict}`, {
                count: counts[verdict],
              })}
              className={cn(
                'flex items-center gap-[5px] px-2.5 outline-none hover:bg-quaternary focus-visible:bg-quaternary focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset',
                i > 0 && 'border-l border-quaternary',
                verdict === 'waiting'
                  ? 'font-semibold text-accent'
                  : 'font-medium text-foreground',
              )}
            >
              <HugeiconsIcon
                icon={VERDICT_ICON[verdict]}
                size={17}
                strokeWidth={1.8}
                aria-hidden
                className={cn(
                  verdict === 'waiting' && 'text-accent',
                  verdict === 'yes' && 'text-positive',
                  (verdict === 'later' || verdict === 'no') &&
                    'text-secondary-foreground',
                )}
              />
              {counts[verdict]}
            </Link>
          ))}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{sentence}</TooltipContent>
    </Tooltip>
  )
}
