import { useState } from 'react'
import { CheckCircleIcon, WarningIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { LineItem } from '@/components/ui/line-item'
import {
  OverviewCard,
  SectionLink,
} from '@/components/campaigns/overview/OverviewCard'
import { useWorkspaceWarnings } from '@/hooks/useWorkspaceWarnings'
import { counted, formatNumber } from '@/lib/intl'

/** Rows shown before the rest fold behind SHOW MORE. */
const SHOWN = 5

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

  const urgent = warnings.filter(
    (w) => w.severity === 'alert' || w.severity === 'risk',
  )

  if (urgent.length === 0) {
    return (
      <OverviewCard
        title={t('activity.needsYou.allSet')}
        icon={<CheckCircleIcon className="size-5 text-positive" aria-hidden />}
        className="gap-2"
      >
        <p className="text-sm text-secondary-foreground">
          {t('activity.needsYou.allSetBody')}
        </p>
      </OverviewCard>
    )
  }

  // Hiding one row behind a button that costs a row saves nothing.
  const collapsible = urgent.length > SHOWN + 1
  const shown = expanded || !collapsible ? urgent : urgent.slice(0, SHOWN)
  const hidden = urgent.length - shown.length

  return (
    <OverviewCard
      title={t('activity.needsYou.title')}
      icon={<WarningIcon className="size-5 text-warning" aria-hidden />}
      status={
        <span className="text-sm text-secondary-foreground">
          {formatNumber(urgent.length)}
        </span>
      }
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
              details={w.campaignName}
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
    </OverviewCard>
  )
}
