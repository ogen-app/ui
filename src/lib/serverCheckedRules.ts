import type { AttentionItem } from './campaignReadiness'

/**
 * The client's attention rules the server's calendar check covers, with
 * fixes (CON-462/468). Not `channel-dropped-scheduled`: the server's
 * `platform_not_targeted` counts scheduled posts as unpublished, at warning
 * level, and never says they will still publish — the client's alert does.
 */
const SERVER_CHECKED = new Set([
  'post-type-dropped',
  'scheduled-outside-window',
  'channel-dropped',
])

/**
 * The client's items once the server has said what is wrong with the
 * calendar: its findings stand for the rules that check the same thing.
 * Until it has answered — or when its last read failed, and the answer kept
 * may predate a change made since — every client rule stands.
 */
export function withoutServerChecked(
  items: AttentionItem[],
  serverAnswered: boolean,
): AttentionItem[] {
  return serverAnswered
    ? items.filter((item) => !SERVER_CHECKED.has(item.id))
    : items
}
