import type { Icon } from '@phosphor-icons/react'
import { CheckCircleIcon, ClockIcon, PaperPlaneTiltIcon } from '@phosphor-icons/react'
import type { PostStatus } from '@/types/posts'

/**
 * How a calendar card says what status a post is in: a 2px accent down its
 * left edge, shared by the week and month cards so the two views can never
 * disagree about what colour a draft is.
 *
 * Known limit, kept deliberately: `scheduled` and `published` draw the same
 * positive hue, so the line says "this is going out / went out and it is fine"
 * without separating the two. The week card prints the status in words beside
 * it; the month card leaves that distinction to the tooltip.
 */
export const STATUS_ACCENT_COLOR: Record<PostStatus, string> = {
  draft: 'border-l-border',
  ready_for_publish: 'border-l-info',
  scheduled: 'border-l-positive',
  scheduled_for_manual_publishing: 'border-l-attention',
  failed: 'border-l-destructive',
  published: 'border-l-positive',
  not_published: 'border-l-negative',
}

/**
 * The same seven colours as text, for the leading icon both cards draw in
 * front of the time — the mark that stands where the status label used to.
 *
 * It used to carry every exception too, by ranking them into its one slot, and
 * that is where it broke: a `scheduled` post drew a padlock, so the two most
 * distinct things a post can be — going out by itself, and already gone —
 * arrived as the same grey glyph. The lock left this module entirely for
 * `LockMark`, which is a separate attribute of the card and lives at the other
 * end of the row. What is left here says what the status is, and only that.
 *
 * Two literal tables rather than one derived from the other, because Tailwind
 * only sees class names it can read in the source. Keep them in step: a status
 * whose accent moves and whose text doesn't makes a card that disagrees with
 * its own edge.
 *
 * `draft` is the one deliberate mismatch. The edge can be `border` — a hairline
 * at the card's rim, on the card's own fill, and paler is the whole point of it
 * — but a 14px glyph at that value is a smudge rather than a clock, and it sits
 * inside the content beside 12px type. So the mark takes the same grey as the
 * type it stands next to. That is not a colour going missing: a draft *has* no
 * status colour, and reading as ordinary text is the honest way to say so.
 *
 * Which is why it is `text-current` and not the grey written out. The row it
 * sits in is not always the same grey — on a card backed by a photograph the
 * whole first row steps up a tone to stay legible — and a draft's mark has to
 * step with it. Written out, the mark would stay pale on exactly the card
 * where being pale is the problem.
 */
export const STATUS_TEXT_COLOR: Record<PostStatus, string> = {
  draft: 'text-current',
  ready_for_publish: 'text-info',
  scheduled: 'text-positive',
  scheduled_for_manual_publishing: 'text-attention',
  failed: 'text-destructive',
  published: 'text-positive',
  not_published: 'text-negative',
}

/**
 * Which glyph stands in front of the time, per status — the third table, and
 * the one that says what *kind* of when this is.
 *
 * A clock is the honest default: it means "this is the hour written beside
 * me", which is all a date on a draft or a ready post amounts to. Two statuses
 * mean more than that and now say so. `scheduled` is the post nobody has to
 * come back for — it leaves on its own — so it takes the plane. `published`
 * has already gone, and a clock in front of a past event reads as a pending
 * one, which is the one thing the mark must never say; a check closes it.
 *
 * The other five keep the clock deliberately. `failed` and `not_published`
 * have their colour to carry the bad news and the card has a warning rank
 * above this one for anything actionable, so spending a second alarming glyph
 * here would double-count. What is missing from this table is a distinct mark
 * for `scheduled_for_manual_publishing` — it is genuinely a different promise
 * from `scheduled` (someone has to press a button) and today only its colour
 * says so.
 */
export const STATUS_ICON: Record<PostStatus, Icon> = {
  draft: ClockIcon,
  ready_for_publish: ClockIcon,
  scheduled: PaperPlaneTiltIcon,
  scheduled_for_manual_publishing: ClockIcon,
  failed: ClockIcon,
  published: CheckCircleIcon,
  not_published: ClockIcon,
}
