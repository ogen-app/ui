import { Link } from '@tanstack/react-router'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { CaretRightIcon, CheckCircleIcon } from '@phosphor-icons/react'
import { NavIcon } from '@/components/layout/nav/NavIcon'
import { placeGlyph } from '@/components/layout/nav/placeGlyph'
import { cn } from '@/lib'
import type { DoorLine, DoorMark, OverviewDoor } from '@/lib/campaignDoors'
import { campaignSection } from '@/lib/campaignSections'
import { placeLink } from '@/lib/campaignScope'
import { counted, formatDate } from '@/lib/intl'

/**
 * The foot of the Overview: a door to every other place in the campaign,
 * each saying whether that part is set before it is opened.
 *
 * The cards above say where the campaign is in its time and what wants the
 * user today; neither says where everything else lives, and the rail's icons
 * don't say whether anything behind them is finished. A row of doors answers
 * both at once — read across, it is the campaign's checklist; clicked, it is
 * the menu. Settings rides on the heading's row: it is where the campaign is
 * renamed, archived or deleted, and the one place with nothing to finish. Each door is the rail's own glyph, hue and name, so the two are
 * visibly the same places.
 */
export function OverviewDoors({
  doors,
  campaignId,
}: {
  doors: OverviewDoor[]
  campaignId: string
}) {
  const { t } = useTranslation()
  // The six places the work happens in make an even grid; Settings has
  // nothing to finish, so it is a way in on the heading's row rather than a
  // seventh tile left alone on a line of its own.
  const work = doors.filter((door) => door.place !== 'settings')
  const settings = doors.find((door) => door.place === 'settings')
  return (
    <section
      aria-labelledby="overview-doors"
      className="@container flex flex-col gap-3"
    >
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id="overview-doors"
          className="font-display text-base font-medium tracking-tight"
        >
          {t('campaignOverview.doors.title')}
        </h2>
        {settings && (
          <Link
            to="/campaigns/$campaignId/settings"
            params={{ campaignId }}
            className="group flex min-w-0 items-center gap-1.5 rounded-sm text-sm text-secondary-foreground outline-none hover:text-primary-foreground focus-visible:inset-ring-2 focus-visible:inset-ring-ring"
          >
            <NavIcon icon={placeGlyph('settings').icon} size={16} />
            <span className="font-medium text-primary-foreground">
              {t(campaignSection('settings').labelKey)}
            </span>
            <span className="truncate">{doorLine(t, settings.line)}</span>
            <CaretRightIcon
              weight="bold"
              aria-hidden
              className="size-3.5 shrink-0 text-tertiary-foreground group-hover:text-primary-foreground"
            />
          </Link>
        )}
      </div>
      <ul className="grid grid-cols-1 gap-3 @min-[30rem]:grid-cols-2 @min-[48rem]:grid-cols-3">
        {work.map((door) => (
          <li key={door.place} className="min-w-0">
            <Door door={door} campaignId={campaignId} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function Door({
  door,
  campaignId,
}: {
  door: OverviewDoor
  campaignId: string
}) {
  const { t } = useTranslation()
  const { icon, tone } = placeGlyph(door.place)
  const link = placeLink(door.place, campaignId)
  return (
    <Link
      to={link.to}
      params={link.params}
      className={cn(
        'group flex h-full min-w-0 flex-col gap-1.5 rounded-md border border-border bg-primary px-4 py-3',
        'transition-shadow duration-150 hover:shadow-lg',
        'outline-none focus-visible:inset-ring-2 focus-visible:inset-ring-ring',
      )}
    >
      <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-primary-foreground">
        <NavIcon icon={icon} tone={tone} />
        <span className="truncate">
          {t(campaignSection(door.place).labelKey)}
        </span>
        <CaretRightIcon
          weight="bold"
          aria-hidden
          className="ml-auto size-3.5 shrink-0 text-tertiary-foreground group-hover:text-primary-foreground"
        />
      </span>
      <span
        className={cn(
          'flex min-w-0 items-start gap-2 text-sm/5',
          door.mark === 'todo'
            ? 'text-primary-foreground'
            : 'text-secondary-foreground',
        )}
      >
        <Mark mark={door.mark} />
        <span className="min-w-0">{doorLine(t, door.line)}</span>
      </span>
    </Link>
  )
}

/**
 * The door's verdict in the 18px slot under its glyph: the setup card's tick
 * for a part that is set, its hollow ring for one that isn't, nothing for a
 * place with nothing to finish. The line beside it says the rest.
 */
function Mark({ mark }: { mark: DoorMark }) {
  return (
    <span
      aria-hidden
      className="flex h-5 w-[18px] shrink-0 items-center justify-center"
    >
      {mark === 'set' ? (
        <CheckCircleIcon weight="fill" className="size-4 text-positive" />
      ) : mark === 'todo' ? (
        <span className="size-3 rounded-full border-[1.5px] border-warning" />
      ) : null}
    </span>
  )
}

function doorLine(t: TFunction, line: DoorLine): string {
  const key = `campaignOverview.doors.${line.key}` as const
  const count = counted(line.count ?? 0)
  if (line.key === 'posts.some' && line.drafts) {
    const drafts = t(
      'campaignOverview.doors.posts.drafts',
      counted(line.drafts),
    )
    return `${t(key, count)} · ${drafts}`
  }
  if (line.at) {
    const date = formatDate(line.at, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
    return t(key, { ...count, date })
  }
  return line.count === undefined ? t(key) : t(key, count)
}
