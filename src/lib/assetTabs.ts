/**
 * The tabs of the asset page's side column, in the order they sit — the post
 * editor's side column, for a document.
 *
 * Overview is first: what the asset is (its preview, its facts, the campaigns
 * it is in, its tags) and one line from each other tab saying whether it is
 * worth opening. Ideas are what the page is for, so a first visit opens on
 * them. Summary is the rest of the reading: what it says, the meeting notes,
 * what it covers.
 */
export const ASSET_TABS = ['overview', 'ideas', 'summary'] as const

export type AssetTab = (typeof ASSET_TABS)[number]

export const DEFAULT_ASSET_TAB: AssetTab = 'ideas'

export function isAssetTab(value: unknown): value is AssetTab {
  return (
    typeof value === 'string' &&
    (ASSET_TABS as readonly string[]).includes(value)
  )
}
