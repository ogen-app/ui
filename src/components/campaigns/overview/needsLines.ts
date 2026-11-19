import type { TFunction } from 'i18next'
import type { NeedsRow } from '@/lib/campaignOverview'
import { counted } from '@/lib/intl'

/** A stage's own to-do, worded from its kind — the server's rows bring theirs. */
export function stageTodoLabel(t: TFunction, todo: NeedsRow['todo']): string {
  switch (todo?.kind) {
    case 'first-post':
      return t('campaignOverview.needs.firstPost')
    case 'coverage-gaps':
      return t('campaignOverview.needs.coverageGaps', counted(todo.days))
    case 'read-results':
      return t('campaignOverview.needs.readResults')
    case 'archive':
      return t('campaignOverview.needs.archive')
    default:
      return ''
  }
}

/** One row of `NeedsPreview`: a mark and a sentence. */
export type NeedsLine = { id: string; mark: NeedsRow['mark']; label: string }

/** The model's list as `NeedsPreview` lines, worded as the Overview words them. */
export function needsLines(t: TFunction, rows: NeedsRow[]): NeedsLine[] {
  return rows.map((row) => ({
    id: row.id,
    mark: row.mark,
    label: row.label ?? stageTodoLabel(t, row.todo),
  }))
}
