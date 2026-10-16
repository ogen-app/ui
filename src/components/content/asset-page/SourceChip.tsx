import { useTranslation } from 'react-i18next'
import { PlayIcon, TableIcon } from '@phosphor-icons/react'
import { useAudioSeek } from '@/hooks/useAudioSeek'
import { useSheetCite } from '@/hooks/useSheetCite'
import { refLabel, timeLabelSeconds } from '@/lib/assetAnalysis'
import { parseSheetLabel, shortSheetLabel } from '@/lib/sheetChunks'

const CHIP =
  'inline-flex max-w-[220px] items-center gap-1 rounded-full border border-quaternary bg-primary px-2.5 py-0.5 text-xs tabular-nums'

/**
 * A source label as a chip, and where it can take you.
 *
 * A time ("12:03–12:47") on a page with a player plays from where it starts.
 * A sheet range (`Sheet "Pipeline" rows 10-24`) is shortened to
 * "Pipeline · rows 10–24" and, on a page with a sheet view, opens Source on
 * those rows. Anything else — a page, a slide, a time with no player — is a
 * plain label.
 */
export function SourceChip({
  label,
  citedBy = '',
  interactive = true,
}: {
  label: string
  /** What cites it — the idea's title, for the sheet view's banner. */
  citedBy?: string
  /** False where the chip sits inside another control. */
  interactive?: boolean
}) {
  const { t } = useTranslation()
  const player = useAudioSeek()
  const sheets = useSheetCite()
  const seconds = timeLabelSeconds(label)
  const sheetLabel = shortSheetLabel(label)

  if (interactive && player && seconds !== null) {
    const start = label.split(/[–-]/)[0]?.trim() || label
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          player.seek(seconds)
        }}
        aria-label={t('content.audio.playFrom', { time: label })}
        className={`${CHIP} cursor-pointer text-accent hover:bg-secondary`}
      >
        <PlayIcon weight="fill" className="size-3" aria-hidden />
        {start}
      </button>
    )
  }

  const parsed = parseSheetLabel(label)
  if (interactive && sheets && parsed?.part === 'rows') {
    return (
      <button
        type="button"
        title={label}
        onClick={(e) => {
          e.stopPropagation()
          sheets.cite(label, citedBy)
        }}
        aria-label={t('assetInsights.sheet.openRows', { label: sheetLabel })}
        className={`${CHIP} cursor-pointer text-accent hover:bg-secondary`}
      >
        <TableIcon className="size-3 shrink-0" aria-hidden />
        <span className="truncate">{sheetLabel}</span>
      </button>
    )
  }

  return (
    <span title={label} className={`${CHIP} text-secondary-foreground`}>
      <span className="truncate">{refLabel(label)}</span>
    </span>
  )
}
