/**
 * The tabs of the post editor's side column, in the order they sit.
 *
 * Settings is first because it is the one that can stop a post going out: it
 * carries a mark while anything there blocks publishing. The rest are about
 * the post rather than part of it — how it will look, whether it passes, what
 * it reads from, what the team said, what it used to be.
 */
export const POST_TABS = [
  'settings',
  'preview',
  'checks',
  'quality',
  'sources',
  'notes',
  'history',
] as const

export type PostTab = (typeof POST_TABS)[number]

export const DEFAULT_POST_TAB: PostTab = 'settings'

export function isPostTab(value: unknown): value is PostTab {
  return (
    typeof value === 'string' &&
    (POST_TABS as readonly string[]).includes(value)
  )
}
