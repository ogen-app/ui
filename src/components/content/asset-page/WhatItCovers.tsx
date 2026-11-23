import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  coversAnything,
  groupMentions,
  type MentionGroup,
} from '@/lib/assetAnalysis'
import { formatList, formatNumber } from '@/lib/intl'
import type { SheetSummary } from '@/lib/sheetChunks'
import type { AssetAnalysis } from '@/types/assetAnalysis'

/** How many mentions show before "+N more". */
const FIRST_MENTIONS = 12

/**
 * What the asset is about, in the side column (CON-369) under the caller's
 * heading: its topics as one line
 * of text, the things it mentions grouped by kind — the kind written out, not
 * hidden in a tooltip — and, for a spreadsheet, the sheets it read.
 *
 * Text rather than pills on purpose. Thirty-odd rounded chips read as
 * controls, and none of them did anything; a line of words reads as what it
 * is, the context behind the ideas above.
 */
export function WhatItCovers({
  lens,
  sheets,
}: {
  lens: Pick<AssetAnalysis, 'topics' | 'entities'>
  sheets?: SheetSummary[]
}) {
  const { t, i18n } = useTranslation()
  const [showAll, setShowAll] = useState(false)
  const groups = groupMentions(lens.entities)
  const total = groups.reduce((sum, g) => sum + g.names.length, 0)

  const shown = showAll ? groups : capGroups(groups, FIRST_MENTIONS)
  const hidden = total - shown.reduce((sum, g) => sum + g.names.length, 0)

  const hasSheets = sheets !== undefined && sheets.length > 0
  if (!coversAnything(lens, sheets)) return null

  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-[112px_1fr] gap-x-4 gap-y-3 text-sm leading-6">
        {lens.topics.length > 0 && (
          <Row label={t('assetInsights.topics')}>{lens.topics.join(' · ')}</Row>
        )}
        {shown.map((group) => (
          <Row
            key={group.kind}
            label={t(`assetInsights.mentionKind.${group.kind}`)}
          >
            {formatList(group.names, 'conjunction', i18n.language)}
          </Row>
        ))}
        {hasSheets && (
          <Row label={t('assetInsights.sheet.fact')}>
            {formatList(
              sheets.map((sheet) =>
                sheet.rows === null
                  ? sheet.name
                  : t('assetInsights.sheet.chip', {
                      name: sheet.name,
                      count: sheet.rows,
                      formatted: formatNumber(sheet.rows, {}, i18n.language),
                    }),
              ),
              'conjunction',
              i18n.language,
            )}
          </Row>
        )}
      </dl>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="cursor-pointer self-start pl-[128px] text-sm font-medium text-accent hover:underline"
        >
          {t('assetInsights.moreMentions', { count: hidden })}
        </button>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="font-medium text-secondary-foreground">{label}</dt>
      <dd className="min-w-0 text-foreground">{children}</dd>
    </>
  )
}

/** The first `limit` names across groups, in order, so the first kinds stay whole. */
function capGroups(groups: MentionGroup[], limit: number): MentionGroup[] {
  const out: MentionGroup[] = []
  let left = limit
  for (const group of groups) {
    if (left <= 0) break
    const names = group.names.slice(0, left)
    left -= names.length
    out.push({ ...group, names })
  }
  return out
}
