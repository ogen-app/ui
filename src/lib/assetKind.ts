import type { Asset } from '@/types/content'

/**
 * What kind of thing a document is, in the app's own words.
 *
 * Four, not the three categories this replaced (`text` / `imagery` / `files`).
 * Those came from the workspace bank's old ALL / TEXT / IMAGERY / FILES tabs,
 * which went with its old layout (CON-211) — and they were already a fiction
 * the one place they were used: `AssetGlyph` drew a fourth glyph for a scraped
 * page by testing `type === 'URL'` beside the category, because where a page
 * came from is the one thing about it a title can't say. That fourth kind is
 * now in the vocabulary rather than special-cased at the glyph.
 *
 * `null` is a note written in the app — the type column predates in-app notes
 * and was never backfilled — so it files with `MD`, which is the markdown it
 * is. A type this build has never heard of files there too: the vocabulary
 * grows without asking us (`MD | PDF` gained `URL`, then `IMG`), and the cost
 * of guessing wrong on a *glyph* is a wrong picture, which is the cheapest
 * failure available. `opensAsDocument` is the one that fails closed instead.
 */
export type AssetKind = 'text' | 'page' | 'pdf' | 'image'

export function assetKind(asset: Pick<Asset, 'type'>): AssetKind {
  switch (asset.type) {
    case 'PDF':
      return 'pdf'
    case 'IMG':
      return 'image'
    case 'URL':
      return 'page'
    default:
      return 'text'
  }
}

/**
 * The order a tally is read in: what the app writes from best, first.
 *
 * Fixed rather than sorted by count, so the same library reads the same way
 * every time it is glanced at — a row whose items reorder as documents arrive
 * has to be read rather than recognised.
 */
export const ASSET_KINDS: AssetKind[] = ['text', 'page', 'pdf', 'image']

/** One kind, and how many of them there are. */
export type AssetKindCount = { kind: AssetKind; count: number }

/**
 * A library as one line: how many of each kind of thing is in it.
 *
 * Kinds nothing falls into are dropped rather than shown as zero. A zero is a
 * fact about the shape of our type column, not about the library — "0 images"
 * on a workspace that has never uploaded one is an absence nobody was
 * wondering about, and four of them would bury the counts that are real.
 */
export function tallyAssetKinds(
  assets: Pick<Asset, 'type'>[],
): AssetKindCount[] {
  const counts = new Map<AssetKind, number>()
  for (const asset of assets) {
    const kind = assetKind(asset)
    counts.set(kind, (counts.get(kind) ?? 0) + 1)
  }
  return ASSET_KINDS.filter((kind) => counts.has(kind)).map((kind) => ({
    kind,
    count: counts.get(kind) ?? 0,
  }))
}

/**
 * Whether this asset opens as an editable document.
 *
 * The detail screen used to mount the editor for anything that wasn't a
 * mid-scrape URL, which is only safe for as long as every asset is text. A PDF
 * qualifies — what you edit is the text the extractor pulled out of it, and
 * that text is what the embeddings are built from. An image does not: its
 * `content` is the description someone writes about the picture. Seed BlockNote
 * with that and the description becomes a document whose first keystroke
 * autosaves over the asset (CON-16 R32) — which is why an image has a screen of
 * its own (`AssetImageView`) and still answers `false` here.
 *
 * So the types that *are* documents are named and everything else falls
 * through — including a type this build has never heard of, which is the case
 * that matters. The server's vocabulary grows without asking us (`MD | PDF`
 * gained `URL` in CON-222 and gains `IMG` next), and the cost of guessing
 * wrong has to be a screen that declines to open, never silent data loss.
 */
export function opensAsDocument(asset: Pick<Asset, 'type'>): boolean {
  switch (asset.type) {
    case null:
    case 'MD':
    case 'PDF':
    case 'URL':
      return true
    default:
      return false
  }
}
