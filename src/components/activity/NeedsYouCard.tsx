import { useState } from 'react'
import { Alert02Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { LineItem } from '@/components/ui/line-item'
import { SectionLink } from '@/components/campaigns/overview/OverviewCard'
import { useWorkspaceWarnings } from '@/hooks/useWorkspaceWarnings'
import { counted, formatList, formatNumber } from '@/lib/intl'
import type { WorkspaceWarning } from '@/lib/workspaceWarnings'

/** Rows shown before the rest fold behind SHOW MORE. */
const SHOWN = 5

type Row = WorkspaceWarning & { campaignNames: string[] }

/**
 * One row per problem, not per campaign it shows up in. A warning fixed in
 * Workspace Settings — an inactive account, a channel with nothing connected —
 * is about the workspace, and every campaign using that account reports it, so
 * the same "Facebook's account is inactive" arrived once per campaign. Those
 * fold into one row naming them all; one reconnect clears it everywhere. A
 * warning fixed inside a campaign stays its own row, since its link goes there.
 * The first occurrence keeps its place, so the list stays worst first.
 */
function mergeWorkspaceFixes(warnings: WorkspaceWarning[]): Row[] {
  const rows: Row[] = []
  const byProblem = new Map<string, Row>()
  for (const w of warnings) {
    const key =
      w.item.fix === 'workspace-settings'
        ? `${w.item.id}|${w.item.label}`
        : null
    const existing = key ? byProblem.get(key) : undefined
    if (existing) {
      existing.campaignNames.push(w.campaignName)
      continue
    }
    const row = { ...w, campaignNames: [w.campaignName] }
    rows.push(row)
    if (key) byProblem.set(key, row)
  }
  return rows
}

/**
 * Activity's second column: what is wrong now, beside the record of what
 * happened.
 *
 * **Live conditions, not unread notifications.** The feed marks a row read as
 * soon as it is on screen, so "unread failures" would empty itself the moment
 * the page opened — and a failure that was read is no more fixed than one that
 * wasn't. These are `workspaceWarnings`, the same scoring the campaign
 * Overview's rail runs: true while true, gone the moment the post is
 * rescheduled or the account reconnected. Only the two severities that are
 * about now — `alert` (already wrong) and `risk` (wrong soon, on a clock); the
 * gaps and hygiene nudges stay on each campaign's Overview, where they are
 * worked through, rather than in a column held beside a history.
 *
 * Kept when empty and saying so, for the rail's reason: a card that vanishes
 * reads as "not loaded", and the all-clear is news.
 */
export function NeedsYouCard() {
  const { t } = useTranslation()
  const { warnings, isLoading } = useWorkspaceWarnings()
  const [expanded, setExpanded] = useState(false)

  if (isLoading) return null

  const urgent = mergeWorkspaceFixes(
    warnings.filter((w) => w.severity === 'alert' || w.severity === 'risk'),
  )

  if (urgent.length === 0) {
    return (
      <Card
        capped
        icon={CheckmarkCircle02Icon}
        tone="var(--positive)"
        title={t('activity.needsYou.allSet')}
      >
        <p className="text-sm">{t('activity.needsYou.allSetBody')}</p>
      </Card>
    )
  }

  // Hiding one row behind a button that costs a row saves nothing.
  const collapsible = urgent.length > SHOWN + 1
  const shown = expanded || !collapsible ? urgent : urgent.slice(0, SHOWN)
  const hidden = urgent.length - shown.length

  return (
    <Card
      capped
      icon={Alert02Icon}
      tone="var(--warning)"
      title={t('activity.needsYou.title')}
      status={{ label: formatNumber(urgent.length), tone: 'warn' }}
    >
      <ul className="flex flex-col">
        {shown.map((w) => (
          <li key={w.id}>
            <LineItem
              asChild
              indicator={{
                kind: 'notification',
                tone: w.severity === 'alert' ? 'alert' : 'warning',
              }}
              label={w.item.label}
              // Several campaigns share this list, and the label is written
              // for a screen that is already inside one.
              details={formatList(w.campaignNames)}
              trailing={
                <span className="group-hover:text-primary-foreground">
                  {w.item.actionLabel}
                </span>
              }
            >
              <SectionLink target={w.item.fix} campaignId={w.campaignId} />
            </LineItem>
          </li>
        ))}
        {hidden > 0 && (
          <li>
            <Button
              variant="ghost"
              size="excluded"
              className="-mx-2 flex h-10 w-full items-center justify-start gap-3 px-2"
              onClick={() => setExpanded(true)}
            >
              <span className="w-4 shrink-0" aria-hidden />
              <span>{t('activity.needsYou.showMore', counted(hidden))}</span>
            </Button>
          </li>
        )}
      </ul>
    </Card>
  )
}
