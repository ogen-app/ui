import type { Asset } from '@/types/content'

/**
 * The picture of an asset, when the backend has one.
 *
 * Three sources: the first page of an uploaded PDF, rendered to PNG during
 * ingestion (CON-103); an uploaded image, which is its own preview (CON-246);
 * and the first image mirrored off a scraped web page (CON-222). A note has
 * nothing to show, and neither does a PDF whose render failed —
 * `thumbnail_url` is absent then, which is why the file being there is not
 * enough to go on.
 *
 * Video is the missing fourth, for the reason images were the missing third
 * until the ingest path existed: nothing uploads one.
 */
export function assetPreviewUrl(
  asset: Pick<Asset, 'file' | 'images'>,
): string | null {
  const file = asset.file
  if (file?.thumbnail_url) return file.thumbnail_url
  // An image has no thumbnail, because the job that would render one isn't
  // written yet — so the picture stands in for itself and the cell scales it.
  // That is a full-size download for a 40px square, and the honest cost of not
  // having thumbnails; it comes back the day `thumbnail_url` starts arriving,
  // which needs no change here because it is already preferred above.
  //
  // Decided on the media type rather than the asset's `type`: `url` is filled
  // in for every stored file now, PDFs included, and what settles whether an
  // `<img>` can draw it is what the file *is*, not what it is filed as.
  if (file?.url && file.mime_type.startsWith('image/')) return file.url
  // The page's own order, which the scrape preserves — the first image in a
  // document is the one that stands for it far more often than any later one.
  return asset.images?.find((image) => image.url)?.url ?? null
}
