import { useEffect, useState } from 'react'
import { CaretDownIcon, ClockIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { canEditScheduledAt } from '@/lib/postStatusMachine'
import { fromLocalParts, toLocalParts } from '@/lib/postSchedule'
import { formatDate } from '@/lib/intl'
import { cn } from '@/lib'
import type { Post } from '@/types/posts'
import { Dot, WarningHint } from './parts'

const SCHEDULED_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
}

const DAY_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
}

/**
 * The first half of the bar's top line: when this post publishes.
 *
 * It has two shapes rather than one, and the boundary between them is a rule
 * rather than a style: while `scheduled`/`published` the date is owned
 * elsewhere — the Zernio submission, or history — so it is *text*, the same as
 * the settings rail shows. Only before then is it an editor.
 */
export function SchedulingDetails({
  post,
  cancelling,
  onChange,
  onAddPostLink,
}: {
  post: Post
  cancelling: boolean
  onChange: (iso: string | null) => void
  onAddPostLink: () => void
}) {
  const editable = canEditScheduledAt(post.status) && !cancelling
  if (!editable) {
    const { text, warn } = schedulingDetails(post, cancelling)
    // Published, but nothing ties it to the post that actually went out — so
    // its analytics can never resolve. Offering the link here is the only
    // route back in: `published` is terminal, so the header shows no actions.
    const unlinked = post.status === 'published' && !post.publisher_post_id
    return (
      <span
        className={cn(
          'flex min-w-0 items-center gap-2.5 text-sm',
          warn ? 'text-primary-foreground' : 'text-secondary-foreground',
        )}
      >
        {/* The icon and the thing it labels are one unit at gap-1.5, matching
            the platform trigger below (icon + name). The row's own gap-2.5 is
            for what separates units — the Dot — so leaving the icon to inherit
            it made the same pairing read two different ways on two lines. */}
        <span className="flex min-w-0 items-center gap-1.5">
          {warn ? (
            <WarningCircleIcon weight="fill" className="size-4 shrink-0 text-warning" />
          ) : (
            <ClockIcon className="size-4 shrink-0" />
          )}
          <span className="truncate">{text}</span>
        </span>
        {unlinked && (
          <>
            <Dot />
            <Button
              variant="link"
              size="excluded"
              className="shrink-0 text-sm underline underline-offset-4"
              onClick={onAddPostLink}
            >
              Add post link
            </Button>
          </>
        )}
      </span>
    )
  }
  return <ScheduleEditor post={post} onChange={onChange} />
}

/**
 * The date and the time as two separate inline pickers. Splitting them is
 * what makes the empty state actionable: "Select publish date" opens a
 * calendar and reads as its own control. The time only appears once a date
 * is set — before that there is nothing for it to qualify.
 */
function ScheduleEditor({
  post,
  onChange,
}: {
  post: Post
  onChange: (iso: string | null) => void
}) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const { dateStr, timeStr } = toLocalParts(post.scheduled_at)
  const selected = post.scheduled_at ? new Date(post.scheduled_at) : null
  const valid = selected && !isNaN(selected.getTime())
  const inPast = valid ? selected.getTime() <= Date.now() : false

  return (
    <span className="flex min-w-0 items-center gap-2.5 text-sm">
      {/* Icon and date as one unit at gap-1.5 — see the note in
          `SchedulingDetails`. The row's gap-2.5 stays for the Dot that
          separates the date from the time. */}
      <span className="flex min-w-0 items-center gap-1.5">
        {!valid ? (
          <WarningHint
            focusable
            text="This post has no publish date, so it can't be scheduled. Pick a date and time to publish it."
          />
        ) : inPast ? (
          <WarningHint
            focusable
            text="The publish date is in the past. Scheduling needs a date in the future — pick a new one."
          />
        ) : (
          <ClockIcon className="size-4 shrink-0 text-secondary-foreground" />
        )}

        <DropdownMenu open={calendarOpen} onOpenChange={setCalendarOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="excluded"
              aria-label="Set publish date"
              className="gap-1.5 text-sm font-normal text-primary-foreground shrink-0"
            >
              {valid ? formatDate(selected, DAY_FORMAT) : 'Select publish date'}
              <CaretDownIcon className="size-3 text-tertiary-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="p-0">
            <Calendar
              mode="single"
              selected={valid ? selected : undefined}
              onSelect={(d) => {
                if (d) {
                  // Keep the time already chosen; fromLocalParts falls back to
                  // the default hour when there isn't one yet.
                  const [y, m, day] = [d.getFullYear(), d.getMonth() + 1, d.getDate()]
                  const next = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  onChange(fromLocalParts(next, timeStr))
                }
                setCalendarOpen(false)
              }}
              onClear={
                valid
                  ? () => {
                      onChange(null)
                      setCalendarOpen(false)
                    }
                  : undefined
              }
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </span>

      {valid && (
        <>
          <Dot />
          <TimeField dateStr={dateStr} timeStr={timeStr} onChange={onChange} />
        </>
      )}
    </span>
  )
}

/**
 * The time half of the schedule line. Only rendered once a date exists: a
 * time with no day to hang it on means nothing, and the calendar already
 * supplies DEFAULT_HOUR, so there is never a dated post without a time.
 */
function TimeField({
  dateStr,
  timeStr,
  onChange,
}: {
  dateStr: string
  timeStr: string
  onChange: (iso: string | null) => void
}) {
  // A half-typed time ("1" of "11:45") is an empty value on the element. A
  // plain controlled input would snap it back to the saved time on every
  // keystroke, so the draft is local and only re-syncs when the post's own
  // time changes underneath us — e.g. an edit in the settings rail.
  const [draft, setDraft] = useState(timeStr)
  useEffect(() => setDraft(timeStr), [timeStr])

  return (
    <input
      type="time"
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value)
        if (e.target.value) onChange(fromLocalParts(dateStr, e.target.value))
      }}
      aria-label="Publish time"
      // Bare input: the bar's own text styling, no chrome. The webkit
      // indicator is hidden because the field itself is the affordance.
      className={cn(
        // font-sans: inputs don't inherit the family, so without it the time
        // renders in the browser default and breaks the line's text style.
        'bg-transparent border-0 outline-none p-0 font-sans text-sm text-primary-foreground shrink-0 cursor-pointer',
        'focus-visible:underline underline-offset-4',
        '[&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none',
      )}
    />
  )
}

/**
 * What the line says once the date is no longer the user's to set — one
 * sentence per status, because "scheduled for Friday" and "was scheduled for
 * Friday" are the same date meaning opposite things.
 */
function schedulingDetails(
  post: Post,
  cancelling: boolean,
): { text: string; warn: boolean } {
  // The badge still reads `scheduled` until the worker confirms, so this
  // is the textual signal that an unschedule is in progress.
  if (cancelling) return { text: 'Unscheduling…', warn: false }
  const when = formatDate(post.scheduled_at, SCHEDULED_DATE_FORMAT)
  switch (post.status) {
    case 'scheduled':
      return { text: when ? `Auto-publishes ${when}` : 'No publish date set', warn: false }
    case 'scheduled_for_manual_publishing':
      return {
        text: when ? `Manual publish — reminder ${when}` : 'No publish date set',
        warn: false,
      }
    case 'published': {
      const at = formatDate(post.published_at, SCHEDULED_DATE_FORMAT)
      return { text: at ? `Published ${at}` : 'Published', warn: false }
    }
    case 'failed':
      return {
        text: when ? `Publish failed — was scheduled for ${when}` : 'Publish failed',
        warn: false,
      }
    case 'not_published':
      return {
        text: when ? `Not published — was planned for ${when}` : 'Not published',
        warn: false,
      }
    default:
      return { text: when ? `Planned for ${when}` : 'Not scheduled yet', warn: !when }
  }
}
