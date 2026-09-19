/**
 * What a calendar card is *allowed* to show — the user's answer, as opposed to
 * the rung ladder's.
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
 * The fields are answered twice over, once for the week and once for the month:
 * the same card is drawn in both views now, but a column that is most of a
 * screen tall and a cell that is a hundred pixels are not the same amount of
 * room, and a user who wants the account on the week almost never wants it on
 * the month. `useCalendarSettings` keeps the two blobs; nothing else has to
 * know which view it is drawing for beyond passing the right one down.
 *
 * Two rows are deliberately *not* among these fields, and for opposite
 * reasons. The picture is one answer for the whole calendar
 * (`imagePreviews`), and the campaign is not an answer at all — it is decided
 * by which calendar is drawing. See `CardFields`.
 *
 * One thing is not switchable at all: the status accent down the card's left
 * edge. It costs no content width, and a calendar that can't say which posts
 * are drafts is not a calendar — so it is always drawn and there is no switch
 * for it.
 */

/** In the order the card draws them, top to bottom — the panel lists them so. */
export const CARD_FIELDS = [
  'status',
  'time',
  'title',
  'platform',
  'account',
] as const

export type CardField = (typeof CARD_FIELDS)[number]

/**
 * The switchable rows, plus the two that are not switchable.
 *
 * `image` sits in the record because every card reads it the same way as the
 * rest, but it is not a `CardField`: it has no switch of its own in either
 * view, it does not count towards the "at least one row" floor, and its value
 * is the calendar-wide `imagePreviews` preference copied in by
 * `useCalendarSettings`. Turning previews on turns them on everywhere, which
 * is what makes it a property of the calendar rather than of a card.
 *
 * `campaign` is in the record on the same terms and for a different reason:
 * it is not a preference either way. On a campaign's own calendar every card
 * names the same campaign, so the row is a line of noise repeated down every
 * column; on the workspace calendar it is the one thing telling two otherwise
 * identical cards apart. A switch for it would therefore be a switch whose
 * right answer is already known from where the user is standing — so the view
 * stamps it, `withCampaignRow` is how, and the rung ladder can still take it
 * away on a day too busy to afford it.
 */
export type CardFields = Record<CardField, boolean> & {
  image: boolean
  campaign: boolean
}

/**
 * The same fields, answered for a calendar that draws one campaign or every
 * campaign.
 *
 * A function rather than a spread at each call site because the object's
 * identity is load-bearing: `CardFields` is a `useMemo` dependency in both
 * grids and a `memo` prop on every card, so a fresh one per render re-measures
 * the grid and re-renders the whole week. Callers memoize the result.
 */
export function withCampaignRow(fields: CardFields, show: boolean): CardFields {
  return fields.campaign === show ? fields : { ...fields, campaign: show }
}

/**
 * The week card as it was before any of this was configurable: the status as
 * the icon's colour only, a time, a title and a platform.
 *
 * `status` and `account` are the two rows that start off — a user who never
 * opens the panel sees exactly the card they saw yesterday.
 */
export const DEFAULT_WEEK_FIELDS: CardFields = {
  status: false,
  time: true,
  title: true,
  platform: true,
  account: false,
  image: true,
  campaign: false,
}

/**
 * The month card, which is the same card in a hundred-pixel cell.
 *
 * Only *when* and *what* — the two questions a month is read for. The platform
 * comes off because the cell can hold three or four cards with it and five or
 * six without, and a month that shows fewer days' work in full is a worse trade
 * than a month that doesn't name the channel.
 *
 * The picture stays on, on the same terms as the week's: it is the calendar's
 * one answer, and `useCalendarSettings` stamps it over this either way. What
 * differs is that the month draws it on a shorter band and drops it on a day
 * with no room — see `CARD_BANDS` and `fitMonthCell`. So this `true` is the
 * default for a direct caller, and for the month itself it is never read.
 */
export const DEFAULT_MONTH_FIELDS: CardFields = {
  status: false,
  time: true,
  title: true,
  platform: false,
  account: false,
  image: true,
  campaign: false,
}

export function visibleFieldCount(fields: CardFields): number {
  return CARD_FIELDS.filter((field) => fields[field]).length
}

/**
 * Whether the switches have stripped the card back to one row of content — the
 * floor the panel will not let the user go below.
 *
 * The campaign row is not counted, for the same reason the picture isn't: it
 * is not one of the switches this is the floor for, and a workspace card
 * stripped to a campaign name says no more about the post than a coloured
 * strip does. So the status still speaks up there, exactly as it would on the
 * campaign calendar.
 *
 * It is a real place: `canHideField` stops at one switch, so "only the title"
 * and "only the time" are both states a user can arrive at. A card that says
 * nothing about what it is isn't a smaller card, it is a rendering bug with a
 * status colour down one side.
 *
 * So at the floor the status stops being only a colour and says itself: the
 * mark, and the word beside it. That is what `PostCard` does with this, and
 * `cardHeight` has to agree — hence one function rather than the same
 * condition written twice.
 *
 * Counted in *rows of content*, which is why the picture is not one of them: it
 * is a band above the rows and it says nothing about the post. Nor is the
 * status switch itself — it is what this decides.
 */
export function cardIsBare(fields: CardFields, hasTime: boolean): boolean {
  const rows = [
    fields.time && hasTime,
    fields.title,
    fields.platform,
    fields.account,
  ]
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
