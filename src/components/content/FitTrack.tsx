import { useTranslation } from 'react-i18next'
import { fitPlace } from '@/lib/ideaFit'

/** The track's width and the pill's, in px: the pill's centre stays on it. */
const TRACK = 64
const PILL = 24

/**
 * An idea's fit score (CON-385) as a pill riding a short track: strong at the
 * left in pale sage, weak at the right in pale sand (`--fit-*`). The pill's
 * ring is the track's own colour at the point it sits, so the ring repeats
 * the reading the number gives. Down a list sorted best first, the pills step
 * rightwards, which is the ranking read without the figures.
 *
 * Unscored — a person's idea, or one read before the score existed — is an
 * empty dashed track: no score, which is not the same as a low one.
 */
export function FitTrack({ score }: { score: number | null | undefined }) {
  const { t } = useTranslation()

  if (score == null) {
    return (
      <span
        role="img"
        aria-label={t('content.list.fitUnscored')}
        className="flex h-5 w-16 shrink-0 items-center"
      >
        <span className="w-full border-t border-dashed border-quinary" />
      </span>
    )
  }

  const place = fitPlace(score)
  // The pill is kept whole on the track at the ends; its ring takes the
  // colour under its centre, not the score's unclamped place.
  const centre = Math.min(TRACK - PILL / 2, Math.max(PILL / 2, place * TRACK))
  const strong = Math.round((1 - centre / TRACK) * 1000) / 10

  return (
    <span
      role="img"
      aria-label={t('content.list.fitScore', { score: Math.round(score) })}
      className="relative block h-5 w-16 shrink-0"
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-2 h-1 rounded-full"
        style={{
          background:
            'linear-gradient(90deg in oklab, var(--fit-high), var(--fit-low))',
        }}
      />
      <span
        aria-hidden
        className="absolute top-0.5 h-4 w-6 rounded-full bg-primary text-center text-[10.5px]/4 font-semibold text-secondary-foreground tabular-nums"
        style={{
          left: centre - PILL / 2,
          boxShadow: `0 0 0 2px color-mix(in oklab, var(--fit-high) ${strong}%, var(--fit-low))`,
        }}
      >
        {Math.round(score)}
      </span>
    </span>
  )
}
