import { memo } from 'react'
import { Link } from '@tanstack/react-router'
import { CircleDashedIcon, UserCircleIcon, WarningIcon } from '@phosphor-icons/react'
import type { Post } from '@/types/posts'
import { POST_STATUS_LABELS } from '@/types/posts'
import { cn, formatTitle } from '@/lib'
import { getPlatformInfo, getPostTypeLabel } from '@/lib/platformDictionary'
import { canEditScheduledAt } from '@/lib/postStatusMachine'
import { hasVisibleProblem } from '@/lib/postValidation'
import { usePublishingAccount } from '@/hooks/usePublishingAccount'
import { DEFAULT_CARD_FIELDS, cardIsBare, type CardFields } from './cardFields'
import { WEEK_RUNGS, type WeekRung } from './cardRungs'
import { LockMark, isDateLocked } from './LockMark'
import { STATUS_ACCENT_COLOR, STATUS_ICON, STATUS_TEXT_COLOR } from './status'

type PostCardProps = {
  post: Post
  /**
   * How much of itself to show. Chosen per day by `WeeklyCalendar` from the
   * space the column has, so every card in a Tuesday matches. Defaults to the
   * roomiest for callers with space to spare.
   */
  rung?: WeekRung
  /**
   * Which rows the user allows at all — their calendar settings. The rung can
   * only take away from what this leaves; see `cardFields` for why the two are
   * separate decisions.
   */
  fields?: CardFields
}

/** `line-clamp-N` as static strings, so Tailwind can see them. */
const TITLE_CLAMP: Record<number, string> = {
  1: 'line-clamp-1',
  2: 'line-clamp-2',
  3: 'line-clamp-3',
}

/**
 * Where the picture stops being only a picture.
 *
 * Deliberately *not* the 108px the rows are pushed down by — 24px above it. The
 * two used to be the same number, on the reasoning that the band should be
 * whole picture and the fade should start where the rows do. What that actually
 * bought was a first row sitting on the one part of the ramp the curve leaves
 * near-clear, which on a pale photograph is 12px of grey on a highlight. Giving
 * the fade a 24px run-up costs the band nothing anyone can see and hands the
 * first row the same footing every other row has.
 */
const FADE_START = 84

/**
 * How opaque the fade ever gets. Short of 1 on purpose: the card's own fill
 * never quite arrives, so the bottom of a backed card keeps a tenth of the
 * photograph in it rather than ending as flat surface. The trade is a slightly
 * busier ground under the last row, and the reason to take it is that the card
 * stays a picture all the way down instead of being a picture with a panel
 * under it.
 */
const FADE_MAX = 0.97

/**
 * The halo behind the first row on a card that has a picture under it.
 *
 * That row is the one place the fade cannot help. It starts at 108px, and the
 * ramp is at its steepest between 84 and roughly 130 — so a 16px row sitting
 * there has its top half on something like half-strength fill however the curve
 * is drawn. Moving the ramp up far enough to finish before it would cost the
 * band its whole point, so the row is given its own footing instead.
 *
 * `drop-shadow` rather than `text-shadow` because the row is not only text: the
 * status mark and the padlock are SVG, and a text shadow goes straight past
 * them, leaving the two glyphs as the only unreadable things in a row that had
 * just been fixed. Three passes, tight and increasing, because one soft shadow
 * reads as a blur and one hard one reads as an outline — stacked, they build a
 * halo that is opaque against the letters and gone within a few pixels.
 *
 * The colour is the card's own fill, not white: on a photograph the effect is
 * the surface pushed out around the glyphs, which is the same material the rest
 * of the row is sitting on. White would be a second surface, and it would be
 * one that stops matching the moment the theme moves.
 */
const ROW_HALO = [2, 3, 5]
  .map((r) => `drop-shadow(0 0 ${r}px var(--color-primary))`)
  .join(' ')

/**
 * The fade's shape, as (how far down the ramp, how far through the fade it is
 * there) — a normalised curve, `FADE_MAX` scales it. Position 0 is
 * `FADE_START`, position 1 is the card's bottom edge, so this is a curve over
 * the ramp rather than over the card: the ramp's length varies with the card's
 * height and the curve doesn't.
 *
 * Not a straight line, which is what this was. A linear ramp spreads the fade
 * evenly over a stretch the rows sit on from end to end, so every row gets some
 * picture behind it and no row gets a clean surface — the title was on 20% wash
 * and the platform row on 60%, and neither number is one you would choose. The
 * curve puts the whole transition in the first third instead: an S, soft off
 * the top so the picture is not cut by a visible line, steepest around a fifth
 * of the way down, and ~87% covered by 30% — which is what "most of it by
 * thirty percent" comes to. Past that it creeps to its ceiling rather than
 * arriving there, so there is no second edge at the end either.
 *
 * It is sampled into stops because a CSS gradient interpolates linearly between
 * whatever stops you give it — the curve has to be points on the ramp, and
 * these are close enough together that the straight lines between them are not
 * a shape anyone can see. Twelve of them, bunched where the curve bends.
 */
const FADE_CURVE: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0.04, 0.03],
  [0.08, 0.11],
  [0.12, 0.24],
  [0.16, 0.41],
  [0.2, 0.58],
  [0.24, 0.72],
  [0.28, 0.83],
  [0.32, 0.9],
  [0.4, 0.96],
  [0.5, 0.99],
  [0.65, 1],
]

/** The card's own fill at a given alpha, as a stop the ramp can be built from. */
const fill = (alpha: number) =>
  `color-mix(in srgb, var(--color-primary) ${Math.round(alpha * FADE_MAX * 100)}%, transparent)`

/**
 * The curve as one `linear-gradient`, built once.
 *
 * Two things make it expressible in CSS at all. Stop positions are
 * `calc(84px + (100% - 84px) × f)` — a percentage of what is left of the card
 * *after* the clear band, which no single unit can say. And the partial
 * opacities are `color-mix(… , transparent)` rather than a hard-coded rgba, so
 * the ramp is made of the card's own fill at every step: it has to end on
 * something that reads as the same surface, and a literal that merely looks
 * like it would come apart the day the theme moves.
 */
const FADE_BACKGROUND = `linear-gradient(to bottom, transparent 0px, ${FADE_CURVE.map(
  ([at, opacity]) =>
    `${fill(opacity)} calc(${FADE_START}px + (100% - ${FADE_START}px) * ${at})`,
).join(', ')}, ${fill(1)} 100%)`

/**
 * The title's type scale, between 12 and 14px, from the two things that
 * decide whether two lines are enough: how wide the card is (`cqw`, off the
 * card's own container) and how much there is to fit. Width alone doesn't do
 * it — at one fixed ratio a 30-character title wastes the space a 60-character
 * one needs — so a longer title starts lower in the range and reaches the
 * floor sooner. Static class strings, not a computed style, so Tailwind can
 * see them.
 *
 * 12px is a hard floor, held above what would fit rather than below it:
 * two lines at 12px on a 150px column run out somewhere around 40 characters,
 * so most real titles clamp. That is the trade — a title you can read and a
 * tail you can't see, over a whole title in type too small to scan a week of.
 * `line-clamp-2` takes it from there.
 */
function titleSize(title: string): string {
  if (title.length <= 30) return 'text-[clamp(12px,9cqw,14px)]'
  if (title.length <= 48) return 'text-[clamp(12px,8cqw,13px)]'
  return 'text-[12px]'
}

function PostCardComponent({
  post,
  rung = WEEK_RUNGS[0],
  fields = DEFAULT_CARD_FIELDS,
}: PostCardProps) {
  const title = formatTitle(post.title)
  const platformInfo = getPlatformInfo(post.platform_id)
  // Fall back to a neutral, "undefined"-feeling dashed circle (in the muted
  // tertiary color, not a warning hue) when no platform is assigned.
  const PlatformIcon = platformInfo?.icon ?? CircleDashedIcon
  const label = platformInfo
    ? getPostTypeLabel(post.platform_id, post.platform_post_type)
    : 'No platform'
  const statusLabel = POST_STATUS_LABELS[post.status] ?? post.status
  const borderColor = STATUS_ACCENT_COLOR[post.status] ?? 'border-l-border'
  // The calendar lays posts out by scheduled_at; show that time (or the
  // publish time once published). Unscheduled posts have neither — omit it.
  const timeSource = post.scheduled_at ?? post.published_at
  const time = timeSource
    ? new Date(timeSource).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : null

  // Only what the list payload already carries — `media_urls`. The editor's
  // uploads land in `post_attachments`, whose thumbnails are hydrated per
  // post, and a week view will not make one request per card for them. See
  // the note in docs/technical-decisions.md#calendar-card-media.
  const image = fields.image ? post.media_urls[0] : undefined
  // Resolved the same way the status machine resolves it, so the card and
  // the schedule button never disagree about whether the account is a
  // problem. Reads the cached platform list — no per-card fetch.
  const account = usePublishingAccount(
    post.platform_id,
    post.social_account_id,
    post.social_account,
  )
  const problem = hasVisibleProblem(post, account)

  // Dragging rewrites scheduled_at, which is locked while `scheduled`
  // (the Zernio submission owns the publish time) and once `published`.
  // Anchors are natively draggable, so also block dragstart itself.
  const draggable = canEditScheduledAt(post.status)

  // Row 1's leading mark says what this post *is*: its status glyph, or a
  // warning where something is broken, since a broken post's status is the
  // less urgent fact about it. The lock is not in this decision at all any
  // more — it is its own attribute, at the other end of the row.
  const Indicator = problem ? WarningIcon : STATUS_ICON[post.status]
  const locked = isDateLocked(post.status)
  // Either mark earns the row its place at a rung that would otherwise drop
  // it — see `cardRungs`. What it must not do is survive on the status glyph
  // alone, which every card has.
  const flag = problem || locked
  // What the user allows, narrowed by what this post has and what the rung
  // can afford. The rung only ever subtracts.
  const showTime = fields.time && Boolean(time) && rung.time
  // Writing the status out is the one field that changes another's position:
  // it takes the slot beside the mark, so the time moves to a line of its own.
  //
  // The switch is not the only way to get here. A card the switches have
  // stripped to one row falls back to it whether or not the user asked —
  // see `cardIsBare`. Read off the post's own time rather than `showTime`, so
  // that a rung tightening cannot be what turns the word on: what the card
  // says about itself is the user's decision and the post's, never the
  // column's.
  const showStatus = fields.status || cardIsBare(fields, Boolean(time))

  return (
    <Link
      to="/campaigns/$campaignId/posts/$postId"
      params={{ campaignId: post.campaign_id, postId: post.id }}
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
        // 8px of padding, against the lane's none: the card is the object and
        // the lane is the space between objects, so the whole inset belongs to
        // the card. Its fill against the lane's is what separates the two — no
        // border needed, and none wanted, since the left edge is spoken for by
        // the status accent.
        // `shrink-0` because the lane is a flex column and a card is not a
        // thing that compresses: without it a day whose posts overrun the
        // column has every card squeezed a few pixels instead of the column
        // scrolling, and a backed card loses its picture band first. The rung
        // ladder is how a column gets smaller; flexbox does not get a vote.
        'relative shrink-0 overflow-hidden bg-primary p-2 w-full border-l-2',
        borderColor,
        // The picture's own band: a hundred pixels on top of the card's eight,
        // so the rows start below it. See the image block for why the picture
        // is still full-bleed behind them.
        image && 'pt-[108px]',
        // `@container` so the title can size itself off the card's own width
        // — the columns are flex-1 from a 150px floor, so the same card is
        // narrow on a seven-day week and roomy on a two-day one.
        '@container block cursor-pointer transition-shadow',
        // Every card lies flat at rest, so a column reads as one surface
        // rather than a stack of chips, and the status accents are the only
        // thing varying across it. Elevation is reserved for the answer to
        // one question — "can I drag this?" — and appears under the pointer
        // only on a card whose date is still editable. A `scheduled` or
        // `published` card never lifts, which is the whole signal.
        //
        // The lift needs the card to out-rank its neighbours while it lasts:
        // cards are positioned siblings, so without this the card *below*
        // paints its own fill over the four pixels of shadow it is meant to be
        // catching. This is sibling ordering inside one lane rather than a
        // layer of the app, which is why it isn't from `config/zIndex.ts` —
        // and it can't be, since only CSS knows what the pointer is on.
        draggable && 'hover:shadow-md hover:z-10',
      )}
    >
      {/* The picture, where there is one — behind the card rather than above
          it, which is the whole of the difference between the two types of
          week card.

          A thumbnail row made the picture compete with the text for the
          column's height, and lost either way: big enough to be worth looking
          at, it pushed the day's other posts off the screen; small enough to
          fit, it was a stamp. Backing the whole card gives it the width it
          never had, and lets the eye find one post among seven without reading
          any of them.

          Two things read as one here. The image is full-bleed — `inset-0`, not
          a 100px strip — and the gradient over it is what decides how much of
          it you see. It holds fully clear to `FADE_START`, so the top of the
          card is the photograph and nothing else, and then runs to `FADE_MAX`
          at the card's very bottom. Which means the rows do not sit *below* the
          picture, they sit *on* it, on the stretch where it is giving way — and
          the last of them on a ground that is still a tenth photograph, because
          the ramp stops short of the card's own fill on purpose.

          Doing it this way rather than clipping the image to 100px is what
          removes the seam: a hard-edged strip ends on whatever pixel the crop
          lands on, while a fade that never finishes has nothing left to end.
          What decides whether the rows are readable on it is not where the ramp
          starts and finishes but its *shape* — see `FADE_CURVE`, which spends
          the transition in the first third and leaves the whole stack, the
          first row included, on something near the card's own fill. */}
      {image && (
        <>
          <img
            src={image}
            alt=""
            className={cn(
              'pointer-events-none absolute inset-0 size-full object-cover',
              // A broken post's picture drains. Same `problem` that turns the
              // status mark into a warning, so the two can't disagree, and it
              // reaches the one part of the card that was still saying
              // everything is fine — a full-colour photograph is the most
              // confident thing on the screen, and a card that can't publish
              // has no business being the brightest one in the column.
              //
              // 70%, not 100%: the point is that the picture is *less* than the
              // others, not that it has become a different kind of object. A
              // tenth of it is showing through the fade at the bottom too, so a
              // full grey would also change the colour of the card's own
              // surface, which belongs to the status accent and nothing else.
              problem && 'grayscale-[0.7]',
            )}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: FADE_BACKGROUND }}
          />
        </>
      )}

      {/* The rows, in their own positioned box so they paint over the picture.
          Without it the absolutely-positioned image would cover them — the
          card's `@container` makes it a stacking context, so a negative
          z-index on the image would put it behind the card's own fill instead,
          which is not the same thing. */}
      <div className="relative flex flex-col gap-1.5">
        {/* Row 1 — the marks and one time, where the status label and a
            separate time row used to be two.

            The status is the icon's colour, taken from the same table as the
            card's left edge, so the mark and the edge always agree, and now
            also the icon's shape: a plane for a post that leaves on its own, a
            check for one that already has, a clock for the rest. A warning
            takes the slot outright where something is broken — that outranks
            saying what status the broken thing is in.

            The lock is at the other end of the row — the card's top-right
            corner — because it is not part of that statement. Beside the status
            glyph the two read as one compound mark, which is what made a
            padlock look like a kind of status; the width of the row between
            them is what says they are two separate facts. Everything on the
            left is what this post *is*. The one thing on the right is what you
            can't do to it. See `LockMark`.

            The row is dropped along with the time on a tight rung, but never
            while it is carrying a warning or a lock: those are the two things a
            card exists to surface, and a ladder that hides them has optimised
            away its own point. */}
        {(showStatus || showTime || flag) && (
          <div
            className={cn(
              'flex items-center gap-1 text-[12px]/[16px]',
              // A tone darker on a backed card, and haloed — see `ROW_HALO`.
              // Both only where there is a picture: on the plain card this row
              // is quiet on purpose, and darkening it there would put the
              // supporting line at the weight of the title under it.
              image ? 'text-secondary-foreground' : 'text-tertiary-foreground',
            )}
            style={image ? { filter: ROW_HALO } : undefined}
          >
            <Indicator
              // Outlined, unlike the platform mark below it: two filled glyphs a
              // line apart read as a pair of buttons, and the outline keeps the
              // clock legible as a clock rather than a filled disc. `bold`
              // rather than `regular` because at 14px a hairline stroke in a
              // status colour is a smudge.
              weight="bold"
              className={cn('size-3.5 shrink-0', STATUS_TEXT_COLOR[post.status])}
              // The status reaches assistive tech as text either way — from the
              // label beside this, or the `sr-only` one below — so the glyph
              // would only repeat it.
              aria-hidden={!problem}
              aria-label={problem ? 'This post has a problem' : undefined}
            />
            {/* Plain `tabular-nums` in the body face, which under Geist is
                both aligned and clean. Not `font-mono`: Geist Mono draws a
                slashed zero by default, and no feature turns it off — `zero`,
                `ss01`–`ss04` and `cv01` all leave the slash where it is. On the
                previous theme the two faces were the other way round, which is
                why this briefly wore `font-mono`. */}
            {showStatus ? (
              <span className="truncate">{statusLabel}</span>
            ) : (
              showTime && <span className="truncate tabular-nums">{time}</span>
            )}
            {/* The status reaches assistive tech either way — on a card that
                doesn't spend a line on the word, this is the only place it is. */}
            {!showStatus && <span className="sr-only">{statusLabel}</span>}
            {/* `ml-auto` rather than `justify-between`: the row has a variable
                number of things on the left and exactly one on the right, and
                a card with no lock must not have its status mark pushed
                anywhere. This puts the lock at the right edge and leaves
                everything else where it was. */}
            {locked && <LockMark className="ml-auto size-3.5" />}
          </div>
        )}

        {/* The time, displaced. Flush left rather than indented under the
            status text: it is a second fact about the post, not a continuation
            of the first, and hanging it off the mark above would say otherwise. */}
        {showStatus && showTime && (
          <div
            className={cn(
              'text-[12px]/[16px] tabular-nums',
              // Treated as the row above it, because it *is* the row above it —
              // one statement the status word pushed onto two lines. Leaving
              // this one pale and unhaloed would read as a rendering fault
              // rather than as a hierarchy.
              image ? 'text-secondary-foreground' : 'text-tertiary-foreground',
            )}
            style={image ? { filter: ROW_HALO } : undefined}
          >
            {time}
          </div>
        )}

        {/* Row 2 — title. The type scales with the card so the lines it is
            allowed fit without reaching for the ellipsis: 14px where there is
            room, down to 12px on a narrow column, never past either end. How
            many lines it gets is the rung's decision — three where the day is
            quiet, one where it isn't — and the clamp is the backstop for a
            title no size would fit. */}
        {fields.title && (
          <div
            className={cn(
              titleSize(title),
              'leading-[1.2] font-medium',
              TITLE_CLAMP[rung.titleLines],
            )}
          >
            {title}
          </div>
        )}

        {/* Row 3 — platform */}
        {fields.platform && (
          <div className="flex items-center gap-1 text-[12px]/[16px] text-tertiary-foreground min-w-0">
            <PlatformIcon
              weight="fill"
              color={platformInfo?.color}
              className="size-3.5 shrink-0"
            />
            <span className="truncate">{label}</span>
          </div>
        )}

        {/* Row 4 — who it publishes as. Off by default, and drawn even when the
            account is unresolved: a row the user asked for that silently isn't
            there reads as a rendering bug, and "no account" is the state most
            worth seeing anyway — it is the one the server refuses to schedule.
            The warning mark above says *that* something is wrong; this says
            what. */}
        {fields.account && (
          <div className="flex items-center gap-1 text-[12px]/[16px] text-tertiary-foreground min-w-0">
            <UserCircleIcon className="size-3.5 shrink-0" />
            <span className="truncate">{account.name ?? 'No account'}</span>
          </div>
        )}
      </div>
    </Link>
  )
}

export const PostCard = memo(PostCardComponent)
