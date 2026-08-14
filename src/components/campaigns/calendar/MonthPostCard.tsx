import { memo } from 'react'
import { Link } from '@tanstack/react-router'
import type { Post } from '@/types/posts'
import { POST_STATUS_LABELS } from '@/types/posts'
import { cn, formatTitle } from '@/lib'
import { canEditScheduledAt } from '@/lib/postStatusMachine'
import { LockMark, isDateLocked } from './LockMark'
import { MONTH_RUNGS, type MonthRung } from './cardRungs'
import { STATUS_ACCENT_COLOR, STATUS_ICON, STATUS_TEXT_COLOR } from './status'

type Props = {
  post: Post
  /**
   * The row height this cell settled on. Chosen per cell by `MonthlyCalendar`
   * so every card in a day matches; defaults to the roomier of the two.
   */
  rung?: MonthRung
}

/**
 * A post in the month grid: status, time, title — on one line, or on two where
 * the cell has the height to spare.
 *
 * The week's `PostCard` cannot appear here — with its image and four rows it
 * is taller than a whole month cell, so this is a second representation of the
 * same object rather than a smaller version of that one. What survives the
 * cut is what a month is read for: *when* something goes out and *what* it is.
 * Platform, post type and the warning flag all drop, and the density summary
 * (`MonthDensity`) is what carries the platform mix once a day gets busy.
 *
 * Those two questions are also what the second line is for. On a quiet day the
 * cell has height going spare, and `cardRungs` spends it here: the time takes a
 * line of its own and the title gets the card's full width instead of what the
 * time leaves of it. It is the same card saying the same things, with the one
 * compromise the single line is built on — that *when* and *what* share a row
 * — taken back out. On a day quiet enough for it the title then gets a second
 * line and 13px as well, which is the only rung where it is set to be read
 * rather than recognised. Which rung this is arrives as a prop, because the
 * height has to be uniform across a cell and only the cell can see how many
 * posts are in it.
 *
 * Status stays, in all three of the ways the week card says it: the 2px left
 * accent, the leading glyph, and the padlock behind it on a date that can no
 * longer move — same tables, so the views never disagree about what colour a
 * draft is or what a locked one looks like. All three are read off
 * `post.status` alone, which is exactly why they survive the cut and the
 * warning doesn't: that one needs the account resolved, a hook per card.
 */
function MonthPostCardComponent({ post, rung = MONTH_RUNGS[0] }: Props) {
  const title = formatTitle(post.title)
  const timeSource = post.scheduled_at ?? post.published_at
  const time = timeSource
    ? new Date(timeSource).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : null
  const statusLabel = POST_STATUS_LABELS[post.status] ?? post.status

  // Same rule as the week card: dragging rewrites `scheduled_at`, which is
  // locked once the post is `scheduled` or `published`.
  const draggable = canEditScheduledAt(post.status)
  const Mark = STATUS_ICON[post.status]
  const locked = isDateLocked(post.status)

  // The two-line layout exists to give the time a line of its own, so a post
  // with no time has nothing to put on it. That card draws as the single-line
  // one at the taller rung's height — the row height is the cell's decision and
  // every card in a cell has to match it, but what goes *in* the row is this
  // card's, and a lone glyph over a title is a worse card than a centred one.
  const twoLine = rung.lines === 2 && time !== null

  return (
    <Link
      to="/campaigns/$campaignId/posts/$postId"
      params={{ campaignId: post.campaign_id, postId: post.id }}
      title={[statusLabel, time, title].filter(Boolean).join(' · ')}
      draggable={draggable}
      onDragStart={(e) => {
        if (!draggable) {
          e.preventDefault()
          return
        }
        e.dataTransfer.setData('text/plain', post.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className={cn(
        // `@container` so the single-line card's time can decide for itself
        // whether there is room for it — see below. Dropping it is a width
        // decision, which is why it is not one of the rungs.
        '@container flex shrink-0 border-l-2 bg-primary px-1.5',
        // The two-line heights are exact sums: 16 + 2 + 16 for `roomy`,
        // 16 + 2 + 2 × 17 for `generous`. No vertical padding, so nothing here
        // absorbs a mistake — see `MONTH_RUNGS` for why the 2px between a
        // card's own lines is not confusable with the 2px between cards.
        twoLine ? 'flex-col justify-center gap-0.5' : 'items-center gap-1.5',
        STATUS_ACCENT_COLOR[post.status] ?? 'border-l-border',
        rung.heightClass,
        rung.textClass,
        'min-w-0 cursor-pointer transition-shadow',
        // Same rule as the week card: flat at rest, and elevation reserved for
        // "you can move this", under the pointer only.
        draggable && 'hover:shadow-sm',
      )}
    >
      {twoLine ? (
        <>
          {/* Line 1 — *when*, with the line to itself. Everything the width
              rule below exists to arbitrate is settled here by having two
              lines instead of one: the time is never squeezed out, never
              truncated, and never taking width off the title, so the container
              query has nothing to decide and isn't asked. */}
          <span className="flex shrink-0 items-center gap-1 tabular-nums text-tertiary-foreground">
            <Mark
              weight="bold"
              className={cn('size-3 shrink-0', STATUS_TEXT_COLOR[post.status])}
              aria-hidden
            />
            {time}
            {/* Same corner as the week card's — top-right of the card, which on
                a two-line card is a corner rather than the end of a line. */}
            {locked && <LockMark className="ml-auto size-3" />}
          </span>
          {/* Line 2 — *what*, on the card's full width. This is what the extra
              height actually bought: a title that gets the whole line rather
              than whatever the time left of it, and at the tallest rung two of
              those lines at 13px — the first size in this view a title is read
              at rather than recognised at. `line-clamp` rather than `truncate`
              there, because the ellipsis has to land at the end of the second
              line and truncation only ever knows about the first. */}
          <span
            className={cn(
              rung.titleClass,
              rung.titleLines === 2 ? 'line-clamp-2' : 'truncate',
            )}
          >
            {title}
          </span>
        </>
      ) : (
        <>
          {time && (
            // Below ~112px the mark, the time and an ellipsis are the whole
            // card, and a row of times with no titles is a worse month than a
            // row of titles with no times. The cell keeps its own width, so
            // this is the card's call to make and it makes it in CSS. Only the
            // single-line card ever has to: on two lines nothing is sharing.
            //
            // 104px while the time stood alone. The mark and its gap cost 16 of
            // these, so holding the title's share where it was would have put
            // this at 120 — and 120 is past the ~118 of content a 132px cell
            // has, which is what the real grid gives a column on a small
            // laptop. A threshold the common case sits the wrong side of is a
            // feature that isn't there. So the title gives up 8px of its share
            // instead, and the mark arrives everywhere the time already was bar
            // the last 8px of range.
            //
            // The mark goes with the time rather than outliving it: the two are
            // one reading — *when*, and what kind of when — and a lone icon in
            // front of a title would be a thing to decode in a row that has
            // room for one.
            //
            // Same mark and the same table as the week card. The one rank it
            // can't carry is the warning: that needs the account resolved,
            // which is a hook per card, and a month grid of six rows will not
            // pay it. So a broken post reads here as an ordinary one — the flag
            // is the week's job, as the note above says, and this doesn't
            // change that.
            <span className="hidden shrink-0 items-center gap-1 tabular-nums text-tertiary-foreground @min-[112px]:inline-flex">
              <Mark
                weight="bold"
                className={cn('size-3 shrink-0', STATUS_TEXT_COLOR[post.status])}
                // The status is in the tooltip on the card itself; the glyph
                // would only repeat it.
                aria-hidden
              />
              {time}
            </span>
          )}
          <span className="truncate">{title}</span>
          {/* The lock, at the right edge of the line — the same place the week
              card puts it, for the same reason: it is a separate fact from the
              status, and the width of the row between them is what says so.

              Unlike the time it has no width threshold. A time that drops out
              leaves a card that says less; a lock that drops out leaves one
              that says something false — that this post can still be dragged.
              There is no cell narrow enough to make that a good trade, so it
              costs the title 18px at every width and keeps them. */}
          {locked && <LockMark className="ml-auto size-3" />}
        </>
      )}
    </Link>
  )
}

export const MonthPostCard = memo(MonthPostCardComponent)
