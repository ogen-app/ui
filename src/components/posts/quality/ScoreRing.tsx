import { cn } from '@/lib'
import { overallBand, overallPct, type QualityBand } from '@/lib/postQuality.ts'
import type { PostEvaluation } from '@/types/quality'
import { BAND_FILL, BAND_TEXT } from './tokens.ts'

/**
 * The two ways the overall score is drawn, shared by the rail panel and the
 * checks bar (CON-183). They live apart from either so that neither owns the
 * other's copy of the ring — two drawings of one number that could disagree
 * about a band is exactly the bug worth designing out.
 */

export function ScoreRing({ pct, band }: { pct: number; band: QualityBand }) {
  const r = 26
  const circumference = 2 * Math.PI * r
  return (
    <div className="relative size-16 shrink-0">
      <svg viewBox="0 0 64 64" className="size-full -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="5" className="stroke-quinary" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="5"
          strokeLinecap="butt"
          // Via currentColor, so the arc and the number below it are painted
          // from one band class and can't disagree about the verdict.
          stroke="currentColor"
          className={BAND_TEXT[band]}
          strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
        />
      </svg>
      <p
        className={cn(
          'absolute inset-0 flex items-center justify-center text-lg font-display font-medium tabular-nums',
          BAND_TEXT[band],
        )}
      >
        {Math.round(pct)}
      </p>
    </div>
  )
}

/**
 * The overall as a bar, in the same band colour as the ring above it.
 *
 * It was four coloured slices — one per dimension's weighted contribution —
 * which read as a chart the four cards below already draw better, and put a
 * second colour scheme next to the one that means "good or bad". One solid
 * fill says the one thing the bar is for: how full the score is.
 */
export function CompositionBar({ evaluation }: { evaluation: PostEvaluation }) {
  const pct = overallPct(evaluation)
  return (
    <div className="h-2 w-full bg-quinary" aria-hidden>
      <div className={cn('h-full', BAND_FILL[overallBand(pct)])} style={{ width: `${pct}%` }} />
    </div>
  )
}
