/**
 * The tabs of the post editor's side column, in the order they sit.
 *
 * Overview is first and is where a post opens: its settings, and the one line
 * of every other tab that says whether that tab is worth opening — nobody goes
 * looking in a tab called Quality. It carries a mark while anything blocks
 * publishing. The rest are the detail behind it — how it will look, whether
 * it passes, what it reads from, what the team said, what it used to be.
 */
export const POST_TABS = [
  'overview',
  'preview',
  'checks',
  'quality',
  'sources',
  'notes',
  'history',
] as const

export type PostTab = (typeof POST_TABS)[number]

export const DEFAULT_POST_TAB: PostTab = 'overview'

export function isPostTab(value: unknown): value is PostTab {
  return (
    typeof value === 'string' &&
    (POST_TABS as readonly string[]).includes(value)
  )
}
