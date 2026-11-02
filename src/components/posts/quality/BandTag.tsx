import { useTranslation } from 'react-i18next'
import { cn } from '@/lib'
import { bandLabel, type QualityBand } from '@/lib/postQuality.ts'
import { BAND_SWATCH, BAND_WASH } from './tokens.ts'

/**
 * The band as a word: "Workable" on a wash of its hue, led by a solid square.
 * The word is what carries the verdict — the colour only repeats it, so the
 * chip reads the same to someone who can't tell orange from green.
 */
export function BandTag({ band }: { band: QualityBand }) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground',
        BAND_WASH[band],
      )}
    >
      <span aria-hidden className={cn('size-2 shrink-0', BAND_SWATCH[band])} />
      {bandLabel(t, band)}
    </span>
  )
}
