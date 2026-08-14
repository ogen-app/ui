/**
 * What a week card is *allowed* to show — the user's answer, as opposed to the
 * rung ladder's.
 *
 * Two different things decide what ends up on a card, and keeping them in
 * separate modules is what keeps either one arguable:
 *
 * - **This file** is preference. The user says a calendar of theirs never needs
 *   to show the platform, or always needs the account, and that holds at every
 *   size. It is stored per user per campaign (`useCalendarSettings`).
 * - **`cardRungs`** is space. Given what is allowed, how much of it fits in the
 *   column this Tuesday. It can only ever take away.
 *
 * So the picture is *not* on the rung ladder even though it now costs a hundred
 * pixels: hiding it is a decision about what a calendar is for, and the ladder
 * has no business making that one silently on a busy day.
 *
 * One thing is deliberately not a field: the status accent down the card's left
 * edge. It costs no content width, it is the only thing the week and the month
 * card are guaranteed to agree on, and a calendar that can't say which posts are
 * drafts is not a calendar — so it is always drawn and there is no switch for it.
 */

/** In the order the card draws them, top to bottom — the panel lists them so. */
export const CARD_FIELDS = ['image', 'status', 'time', 'title', 'platform', 'account'] as const

export type CardField = (typeof CARD_FIELDS)[number]

export type CardFields = Record<CardField, boolean>

/**
 * The card as it was before any of this was configurable, field for field: a
 * picture where there is one, the status as the icon's colour only, a time, a
 * title and a platform.
 *
 * `status` and `account` are the two new rows, and both start off. That is the
 * point of the defaults — a user who never opens the panel sees exactly the card
 * they saw yesterday, and neither new row silently changes what a column holds.
 */
export const DEFAULT_CARD_FIELDS: CardFields = {
  image: true,
  status: false,
  time: true,
  title: true,
  platform: true,
  account: false,
}

export const CARD_FIELD_LABELS: Record<CardField, string> = {
  image: 'Image',
  status: 'Status label',
  time: 'Time',
  title: 'Title',
  platform: 'Platform',
  account: 'Account',
}

/**
 * What each switch is actually for, where the label doesn't carry it. The
 * status row is the one that needs saying: turning it on doesn't add the status
 * — the card already has it, in colour — it spends a line writing it out, and
 * pushes the time onto its own line to make room.
 */
export const CARD_FIELD_NOTES: Partial<Record<CardField, string>> = {
  status: 'Writes the status out, and gives the time its own line',
  image: 'Only posts that have one',
}

export function visibleFieldCount(fields: CardFields): number {
  return CARD_FIELDS.filter((field) => fields[field]).length
}

/**
 * Whether the switches have stripped the card back to one row of content — the
 * floor the panel will not let the user go below.
 *
 * It is a real place: `canHideField` stops at one switch, so "only the title",
 * "only the time" and "only the picture" are all states a user can arrive at,
 * and the last of those on a post with no picture is a blank rectangle. A card
 * that says nothing about what it is isn't a smaller card, it is a rendering
 * bug with a status colour down one side.
 *
 * So at the floor the status stops being only a colour and says itself: the
 * mark, and the word beside it. That is what `PostCard` does with this, and
 * `weekCardHeight` has to agree — hence one function rather than the same
 * condition written twice.
 *
 * Counted in *rows of content*, which is why the picture is not one of them: it
 * is a band above the rows and it says nothing about the post. Nor is the
 * status switch itself — it is what this decides.
 */
export function cardIsBare(fields: CardFields, hasTime: boolean): boolean {
  const rows = [fields.time && hasTime, fields.title, fields.platform, fields.account]
  return rows.filter(Boolean).length <= 1
}

/**
 * Whether this switch can still be turned off. The last one can't: a card with
 * nothing on it is a coloured strip, and a user who arrives at one by flipping
 * switches has no way to tell the calendar isn't broken.
 */
export function canHideField(fields: CardFields, field: CardField): boolean {
  return !fields[field] || visibleFieldCount(fields) > 1
}
