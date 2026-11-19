import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar02Icon,
  Calendar03Icon,
  PlusSignIcon,
} from '@hugeicons/core-free-icons'
import { HeaderIcon } from './HeaderIcon'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  CalendarHeaderActions,
  WorkspaceCalendarHeaderActions,
} from './CalendarHeaderActions'
import {
  addDays,
  addMonths,
  formatAnchor,
  monthLabel,
  startOfWeek,
} from './date'
import { formatDate } from '@/lib/intl'
import { useCalendarSettings } from '@/hooks/useCalendarSettings'
import { useAddPost } from '@/hooks/usePosts'
import { UpgradeDialog } from '@/components/entitlements/UpgradeDialog'
import { useUpgradeGate } from '@/components/entitlements/useUpgradeGate'

type Granularity = 'week' | 'month'

function formatWeekRange(weekStart: Date, locale: string): string {
  const weekEnd = addDays(weekStart, 6)
  const startMonth = formatDate(weekStart, { month: 'long' }, locale)
  const endMonth = formatDate(weekEnd, { month: 'long' }, locale)
  const sameMonth =
    startMonth === endMonth && weekStart.getFullYear() === weekEnd.getFullYear()
  // En dash (–) for the date range, per typographic convention.
  if (sameMonth) {
    return `${weekStart.getDate()}–${weekEnd.getDate()} ${endMonth} ${weekEnd.getFullYear()}`
  }
  const sameYear = weekStart.getFullYear() === weekEnd.getFullYear()
  const startLabel = `${weekStart.getDate()} ${startMonth}${sameYear ? '' : ` ${weekStart.getFullYear()}`}`
  return `${startLabel} – ${weekEnd.getDate()} ${endMonth} ${weekEnd.getFullYear()}`
}

/**
 * The calendar's one header row, for both calendars: the range it is showing
 * as the heading — no "Calendar", the grid says that — then the controls — the week or month's arrows and
 * TODAY, the WEEK / MONTH switch, ADD POST on a campaign's, and the drawer's
 * two toggles last, settings then the unscheduled posts.
 *
 * It was two rows, the page header and a toolbar under it, and the toolbar's
 * left half was only the range. One row gives the grid that height back, and
 * the controls are the small size so six of them sit in a 40px header.
 *
 * `campaignId: null` is the workspace calendar: no ADD POST in the header — a
 * post needs a campaign, so a day's own add asks which (`AddPostButton`).
 */
export function CalendarHeader({
  campaignId,
  view,
  anchor,
  onAnchorChange,
}: {
  campaignId: string | null
  view: Granularity
  anchor: Date
  onAnchorChange: (anchor: Date) => void
}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  // Never called on the workspace calendar; hooks don't take a branch.
  const addPost = useAddPost(campaignId ?? '')
  // ADD POST is where a post allowance is answered. A day's add is left
  // ungated: it is a gesture rather than a button, and the server's own
  // refusal already arrives as a sentence under the action's name (CON-295).
  const gate = useUpgradeGate('posts_total')
  const { firstDayOfWeek, isPending: settingsPending } = useCalendarSettings()

  const handleViewSelect = (next: Granularity) => {
    if (next === view) return
    // The anchor is granularity-free by design (see `calendar/date.ts`), so
    // switching views keeps the day you were looking at and only re-derives
    // the range around it.
    const nextAnchor = formatAnchor(anchor)
    if (campaignId === null) {
      navigate({
        to: '/calendar/$anchor/$view',
        params: { anchor: nextAnchor, view: next },
      })
    } else {
      navigate({
        to: '/campaigns/$campaignId/calendar/$anchor/$view',
        params: { campaignId, anchor: nextAnchor, view: next },
        // The filter is the same posts at either granularity (CON-472).
        search: true,
      })
    }
  }

  // Built per render so the names come from whichever language is loaded now.
  const views = [
    // A week's rows, a month's grid of days.
    { value: 'week', icon: Calendar02Icon, label: t('calendar.viewWeek') },
    { value: 'month', icon: Calendar03Icon, label: t('calendar.viewMonth') },
  ] as const

  /** One step of whatever the view shows — a week, or a month. */
  const step = (direction: 1 | -1) =>
    onAnchorChange(
      view === 'month'
        ? addMonths(anchor, direction)
        : addDays(anchor, direction * 7),
    )

  // The week's range starts on the user's first day of the week, so it waits
  // for that setting — a Monday–Sunday label that turns into Sunday–Saturday
  // is worse than a beat of nothing. The month's label doesn't depend on it.
  const range =
    view === 'month'
      ? monthLabel(anchor, i18n.language)
      : settingsPending
        ? null
        : formatWeekRange(startOfWeek(anchor, firstDayOfWeek), i18n.language)

  return (
    <>
      <PageHeader
        // The dates are the heading: the grid already says it is a calendar,
        // and the rail's highlighted row names the place.
        title={range ?? undefined}
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-0.5">
              <Button
                variant="default"
                size="smIcon"
                onClick={() => step(-1)}
                aria-label={t(
                  view === 'month'
                    ? 'calendar.previousMonth'
                    : 'calendar.previousWeek',
                )}
                // The calendar binds the arrow keys to these two buttons;
                // saying so here is what puts the shortcut in front of a
                // screen-reader user.
                aria-keyshortcuts="ArrowLeft"
              >
                <HeaderIcon icon={ArrowLeft01Icon} />
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => onAnchorChange(new Date())}
              >
                {t('calendar.today')}
              </Button>
              <Button
                variant="default"
                size="smIcon"
                onClick={() => step(1)}
                aria-label={t(
                  view === 'month' ? 'calendar.nextMonth' : 'calendar.nextWeek',
                )}
                aria-keyshortcuts="ArrowRight"
              >
                <HeaderIcon icon={ArrowRight01Icon} />
              </Button>
            </div>
            <Tabs value={view}>
              <TabsList
                variant="segmented"
                size="excluded"
                className="h-8 gap-0.5 p-0.5"
              >
                {views.map(({ value, icon, label }) => (
                  <Tooltip key={value}>
                    {/* The span is the tooltip's trigger, not the tab: both
                        primitives write `data-state`, and merged onto one
                        element the tooltip's wins and the selected segment
                        loses its fill. `presentation` keeps the tab a child of
                        the tablist. */}
                    <TooltipTrigger asChild>
                      <span role="presentation" className="inline-flex">
                        <TabsTrigger
                          variant="segmented"
                          size="icon"
                          value={value}
                          aria-label={label}
                          onClick={() => handleViewSelect(value)}
                          className="h-7 w-7"
                        >
                          <HeaderIcon icon={icon} />
                        </TabsTrigger>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{label}</TooltipContent>
                  </Tooltip>
                ))}
              </TabsList>
            </Tabs>
            {campaignId !== null && (
              <Button
                variant="default"
                size="sm"
                onClick={gate.intent(() => addPost())}
              >
                <HeaderIcon icon={PlusSignIcon} />
                <span>{t('calendar.addPost')}</span>
              </Button>
            )}
            <div className="ml-1">
              {campaignId === null ? (
                <WorkspaceCalendarHeaderActions />
              ) : (
                <CalendarHeaderActions campaignId={campaignId} />
              )}
            </div>
          </div>
        }
      />
      <UpgradeDialog gate={gate} />
    </>
  )
}
