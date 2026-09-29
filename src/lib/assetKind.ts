import type { Asset } from '@/types/content'

/**
 * What kind of thing a document is, in the app's own words.
 *
 * More than the three categories this replaced (`text` / `imagery` / `files`).
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
 * failure available. `assetScreen` is the one that fails closed instead.
 */
export type AssetKind = 'text' | 'page' | 'pdf' | 'document' | 'image' | 'audio'

export function assetKind(asset: Pick<Asset, 'type'>): AssetKind {
  switch (asset.type) {
    case 'PDF':
      return 'pdf'
    case 'DOC':
      return 'document'
    case 'IMG':
      return 'image'
    case 'AUDIO':
      return 'audio'
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
export const ASSET_KINDS: AssetKind[] = [
  'text',
  'page',
  'pdf',
  'document',
  'image',
  'audio',
]

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
 * Which screen an asset opens on.
 *
 * - `editor` — the autosaving BlockNote editor. Only for assets whose `content`
 *   *is* the document and is ours to write: a note (`null`), an uploaded
 *   Markdown file, a scraped page.
 * - `extracted` — the text an ingestion service pulled out of a file, shown and
 *   not edited: a PDF, an office or text document. The server refuses a changed
 *   `content` on both (`content_locked`, CON-312) — re-extracting is the way to
 *   change it — and in any case their `content` is a placeholder: the text
 *   lives in the chunks, which is where this screen reads it from.
 * - `image` — the picture and the two things written about it (CON-246).
 * - `audio` — the player and the transcript (CON-282).
 * - `unsupported` — a type this build has never heard of.
 *
 * The editor is a named answer and never the fallback. It seeds BlockNote from
 * `content` and autosaves it back, so a type that fell through to it would be
 * overwritten by anyone who opened it and typed (CON-16 R32) — which is why the
 * last case is `unsupported`, a screen that declines to open, never silent data
 * loss. The server's vocabulary grows without asking us (`MD | PDF` gained
 * `URL`, `IMG`, `DOC` and `AUDIO`).
 */
export type AssetScreen =
  'editor' | 'extracted' | 'image' | 'audio' | 'unsupported'

export function assetScreen(asset: Pick<Asset, 'type'>): AssetScreen {
  switch (asset.type) {
    case null:
    case 'MD':
    case 'URL':
      return 'editor'
    case 'PDF':
    case 'DOC':
      return 'extracted'
    case 'IMG':
      return 'image'
    case 'AUDIO':
      return 'audio'
    default:
      return 'unsupported'
  }
}
