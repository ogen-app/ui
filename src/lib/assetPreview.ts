import type { Asset } from "@/types/content";

/**
 * The picture of a document, when the backend has one.
 *
 * Two sources, and there is no third: the first page of an uploaded PDF,
 * rendered to PNG during ingestion (CON-103), and the first image mirrored off
 * a scraped web page (CON-222). A note has nothing to show, and neither does a
 * PDF whose render failed — `thumbnail_url` is absent then, which is why the
 * file being there is not enough to go on.
 *
 * Uploaded images and video are the obvious third and fourth, and are missing
 * for the same reason both times: uploads accept `.md` and `.pdf` only, and an
 * `asset_file` carries a URL for its thumbnail but not for itself. So no asset
 * in the system today is one, and pretending otherwise here would be a branch
 * nothing can reach.
 */
export function assetPreviewUrl(asset: Pick<Asset, "file" | "images">): string | null {
  const page = asset.file?.thumbnail_url;
  if (page) return page;
  // The page's own order, which the scrape preserves — the first image in a
  // document is the one that stands for it far more often than any later one.
  return asset.images?.find((image) => image.url)?.url ?? null;
}
