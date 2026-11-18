import { useTranslation } from 'react-i18next'
import type { LineRun } from '@/types/assistant'
import { ResultRow } from './blocks'

/**
 * The lines an edit rewrote (CON-495, board 7): each run on its own hairline,
 * the old lines struck through above the new ones. A run that only adds has
 * no struck half, one that only removes no new one; a blank line keeps its
 * height, so a removed paragraph break still reads as one.
 */
export function LineDiff({ runs }: { runs: LineRun[] }) {
  const { t } = useTranslation()
  return (
    <div
      className="flex flex-col"
      aria-label={t('assistant.repair.lines.label')}
    >
      {runs.map((run, i) => (
        <ResultRow key={i} className="flex flex-col gap-1 text-sm/[1.5]">
          {run.before.map((line, j) => (
            <del
              key={`b${j}`}
              className="min-h-[1.5em] whitespace-pre-wrap break-words text-secondary-foreground"
            >
              <span className="sr-only">
                {t('assistant.repair.lines.removed')}
              </span>
              {line}
            </del>
          ))}
          {run.after.map((line, j) => (
            <ins
              key={`a${j}`}
              className="min-h-[1.5em] whitespace-pre-wrap break-words text-foreground no-underline"
            >
              <span className="sr-only">
                {t('assistant.repair.lines.added')}
              </span>
              {line}
            </ins>
          ))}
        </ResultRow>
      ))}
    </div>
  )
}
