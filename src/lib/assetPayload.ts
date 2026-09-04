import type { Asset, UpdateAssetPayload } from '@/types/content'

/**
 * An asset update is a whole-resource PUT, so this has to name every field.
 *
 * The handler assigns `tag_ids` and `alt_text` from the request unconditionally
 * — a missing `tag_ids` becomes the empty list and a missing `alt_text` becomes
 * the empty string — so a payload that mentions only what changed silently
 * erases what didn't. Saving a title has been untagging assets for as long as
 * the screen has existed; it went unnoticed because nothing in the app sets a
 * tag. Alt text is the same shape of bug with somewhere visible to land, which
 * is what turned this into a helper rather than a longer object literal.
 *
 * The same reasoning, and the same failure, as `campaignToPayload`.
 */
export function assetToPayload(
  asset: Asset,
  overrides: Partial<UpdateAssetPayload> = {},
): UpdateAssetPayload {
  return {
    title: asset.title,
    content: asset.content,
    alt_text: asset.alt_text,
    tag_ids: asset.tag_ids,
    ...overrides,
  }
}
