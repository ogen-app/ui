import type { Asset } from "@/types/content";

/** What kind of thing an asset is, for the glyph the row shows before its title. */
export type AssetCategory = "text" | "imagery" | "files";

/**
 * Maps a backend asset `type` to a category.
 *
 * The tabs this used to feed — ALL / TEXT / IMAGERY / FILES — went with the
 * workspace bank's old layout and did not come back with it (CON-211): nothing
 * has ever mapped to imagery, so two of the four were a filter over everything
 * and a filter over nothing. What is left is the distinction a reader actually
 * uses, and it is drawn on the row rather than above the list.
 *
 * `null` is an asset written in the app, which is markdown text. `URL` is
 * handled by the row itself — it is text too, but where it came from is worth
 * its own glyph.
 *
 * `IMG` is the one that finally makes `imagery` mean something (CON-16 R31).
 * The category is safe to map unflagged because it only decides which glyph a
 * row draws: with no way to create an image asset yet, nothing reaches it, and
 * when one arrives it is labelled correctly rather than filed under text.
 */
export function assetCategory(asset: Pick<Asset, "type">): AssetCategory {
  switch (asset.type) {
    case "PDF":
      return "files";
    case "IMG":
      return "imagery";
    default:
      return "text";
  }
}

/**
 * Whether this asset opens as an editable document.
 *
 * The detail screen used to mount the editor for anything that wasn't a
 * mid-scrape URL, which is only safe for as long as every asset is text. A PDF
 * qualifies — what you edit is the text the extractor pulled out of it, and
 * that text is what the embeddings are built from. An image does not: its
 * `content` is a description, not a document, and CON-105 writes `"[]"` there.
 * Seed BlockNote with that and the user gets an editable page reading `[]`
 * whose first keystroke autosaves over the asset (CON-16 R32).
 *
 * So the types that *are* documents are named and everything else falls
 * through — including a type this build has never heard of, which is the case
 * that matters. The server's vocabulary grows without asking us (`MD | PDF`
 * gained `URL` in CON-222 and gains `IMG` next), and the cost of guessing
 * wrong has to be a screen that declines to open, never silent data loss.
 */
export function opensAsDocument(asset: Pick<Asset, "type">): boolean {
  switch (asset.type) {
    case null:
    case "MD":
    case "PDF":
    case "URL":
      return true;
    default:
      return false;
  }
}
