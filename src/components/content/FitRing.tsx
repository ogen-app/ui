import { useTranslation } from 'react-i18next'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { fitPlace } from '@/lib/ideaFit'

const R = 8.5
const C = 2 * Math.PI * R

/**
 * An idea's fit score as one colour on the red → yellow → green scale
 * (`--fit-poor`, `--fit-fair`, `--fit-strong`), mixed in oklch: the two
 * stops either side of the score's place, in proportion.
 */
function fitColor(score: number): string {
  const t = 1 - fitPlace(score) // 0 at the scale's foot, 1 at its top
  return t < 0.5
    ? `color-mix(in oklch, var(--fit-fair) ${Math.round(t * 200)}%, var(--fit-poor))`
    : `color-mix(in oklch, var(--fit-strong) ${Math.round((t - 0.5) * 200)}%, var(--fit-fair))`
}

/**
 * An idea's fit score (CON-385) as a 20px ring on the row's title line: the
 * arc is the score, in one colour from `fitColor`, over a grey track. The
 * same size and shape as the writer's initials and the assistant's spark in
 * the same column, so the column reads as one family of marks. The number is
 * the ring's accessible name and shows on hover.
 *
 * Unscored — read before the score existed — is the track alone: no score,
 * which is not the same as a low one.
 */
export function FitRing({ score }: { score: number | null | undefined }) {
  const { t } = useTranslation()
  const label =
    score == null
      ? t('content.list.fitUnscored')
      : t('content.list.fitScore', { score: Math.round(score) })
  const arc = score == null ? 0 : (C * Math.max(0, Math.min(100, score))) / 100

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="img"
          aria-label={label}
          className="flex size-5 shrink-0 items-center justify-center"
        >
          <svg viewBox="0 0 20 20" className="size-5 -rotate-90" aria-hidden>
            <circle
              cx="10"
              cy="10"
              r={R}
              fill="none"
              strokeWidth="3"
              className="stroke-quaternary"
            />
            {score != null && (
              <circle
                cx="10"
                cy="10"
                r={R}
                fill="none"
                strokeWidth="3"
                stroke={fitColor(score)}
                strokeDasharray={`${arc} ${C}`}
              />
            )}
          </svg>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
