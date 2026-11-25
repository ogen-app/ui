import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BuildingsIcon,
  HashIcon,
  MapPinIcon,
  PackageIcon,
  ShapesIcon,
  TableIcon,
  UserIcon,
  type Icon,
} from '@phosphor-icons/react'
import { SettingList, SettingRow } from '@/components/posts/quickBar/parts'
import {
  coversAnything,
  groupMentions,
  type MentionGroup,
} from '@/lib/assetAnalysis'
import { formatNumber } from '@/lib/intl'
import type { SheetSummary } from '@/lib/sheetChunks'
import type { AssetAnalysis } from '@/types/assetAnalysis'
import { ValueLine, ValueLines } from './ValueLines'
import { TextButton } from '@/components/ui/text-button'

/** How many mentions show before "+N more". */
const FIRST_MENTIONS = 12

const KIND_ICON: Record<MentionGroup['kind'], Icon> = {
  org: BuildingsIcon,
  product: PackageIcon,
  person: UserIcon,
  place: MapPinIcon,
  other: ShapesIcon,
}

/**
 * What the asset is about, in the side column (CON-369) under the caller's
 * heading, in About's two columns: its topics, the things it mentions grouped
 * by kind — the kind written out, not hidden in a tooltip — and, for a
 * spreadsheet, the sheets it read.
 *
 * One item a line, each with its kind's mark: a run of words joined by dots
 * wrapped mid-item and read as one long sentence, and pills would read as
 * controls, which none of these are.
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
      <SettingList>
        {lens.topics.length > 0 && (
          <SettingRow label={t('assetInsights.topics')}>
            <ValueLines>
              {lens.topics.map((topic) => (
                <ValueLine key={topic} mark={<HashIcon />}>
                  {topic}
                </ValueLine>
              ))}
            </ValueLines>
          </SettingRow>
        )}
        {shown.map((group) => {
          const KindIcon = KIND_ICON[group.kind]
          return (
            <SettingRow
              key={group.kind}
              label={t(`assetInsights.mentionKind.${group.kind}`)}
            >
              <ValueLines>
                {group.names.map((name) => (
                  <ValueLine key={name} mark={<KindIcon />}>
                    {name}
                  </ValueLine>
                ))}
              </ValueLines>
            </SettingRow>
          )
        })}
        {hasSheets && (
          <SettingRow label={t('assetInsights.sheet.fact')}>
            <ValueLines>
              {sheets.map((sheet) => (
                <ValueLine key={sheet.name} mark={<TableIcon />}>
                  {sheet.rows === null
                    ? sheet.name
                    : t('assetInsights.sheet.chip', {
                        name: sheet.name,
                        count: sheet.rows,
                        formatted: formatNumber(sheet.rows, {}, i18n.language),
                      })}
                </ValueLine>
              ))}
            </ValueLines>
          </SettingRow>
        )}
      </SettingList>
      {hidden > 0 && (
        // Under the values, where the next one would have started.
        <TextButton
          className="ml-[calc(6.5rem+1rem+1.375rem)] self-start text-sm"
          onClick={() => setShowAll(true)}
        >
          {t('assetInsights.moreMentions', { count: hidden })}
        </TextButton>
      )}
    </div>
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
