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
 */
export function assetCategory(asset: Pick<Asset, "type">): AssetCategory {
  switch (asset.type) {
    case "PDF":
      return "files";
    default:
      return "text";
  }
}
