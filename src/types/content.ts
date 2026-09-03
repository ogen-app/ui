export type Tag = {
  id: string
  name: string
  color: string
}

export type AssetStatus =
  | 'pending'
  | 'processing'
  | 'ready'
  | 'partial'
  | 'failed'

/**
 * What kind of thing the document is, as the backend labels it.
 *
 * `null` is an asset written in the app — the type column predates in-app
 * notes and was never backfilled. `"URL"` is a web page the backend scraped to
 * Markdown on our behalf (CON-222); it reads like any other document from here,
 * and only differs in having somewhere it came from.
 *
 * `"IMG"` is an image (CON-246). It is the only member that is **not** a
 * document: its `content` is a description of the picture rather than the
 * thing itself, which is why `opensAsDocument` exists and why an image gets a
 * screen of its own rather than the editor.
 */
export type AssetType = 'MD' | 'PDF' | 'URL' | 'IMG' | null

/**
 * One image from a scraped page, copied into our own storage (CON-222).
 *
 * The scrape rewrites the Markdown's image links to `url`, so rendering the
 * content shows our copies and the page can rot without taking the document
 * with it. `source_url` is kept for provenance only — SVGs are deliberately
 * not mirrored, so an occasional link in the content still points outward.
 */
export type AssetImage = {
  id: string
  /** Position in the page, and the key the backend stores it under. */
  idx: number
  /** Where it was on the page. */
  source_url: string
  /** Our copy. The one to render. */
  url: string
  mime_type: string
  size_bytes: number
  alt?: string | null
}

/**
 * The stored file behind an uploaded asset — a PDF (CON-103) or an image
 * (CON-246).
 *
 * The two URLs are different things and only one of them is the file. `url` is
 * the original bytes, which is what an image viewer renders; `thumbnail_url` is
 * a picture *of* the file, in practice a PDF's first page rendered to PNG
 * during ingestion. Both are minted per response from a storage key — a URL to
 * draw right now, not an id worth keeping — and either can be absent, which is
 * why nothing may assume a file implies a picture.
 *
 * They also arrive on opposite kinds. A PDF has the thumbnail and no use for
 * the original; an image has no thumbnail at all, because the job that would
 * make one isn't written yet, so the list draws the full-size `url` scaled
 * down.
 *
 * The image metadata is zero on a PDF. It carries the names `post_attachments`
 * already uses, so attaching a bank image to a post is a field copy on the day
 * that bridge is built rather than a translation.
 */
export type AssetFile = {
  id: string
  original_name: string
  mime_type: string
  size_bytes: number
  page_count?: number | null
  /** The file itself. Absent when storage is unconfigured. */
  url?: string | null
  /** A picture of the file: a PDF's first page. Absent when the render failed. */
  thumbnail_url?: string | null
  /** Pixel dimensions of an image, `0` for anything else. */
  width: number
  height: number
  /** A GIF with more than one frame. Nothing extracts them. */
  is_animated: boolean
  /** What the server dedupes uploads by, within a workspace. */
  checksum_sha256?: string
}

export type Asset = {
  id: string
  title: string
  content: string
  status: AssetStatus
  type: AssetType
  /** The page this was scraped from, normalised by the backend. URL assets only. */
  source_url?: string | null
  /**
   * An image's accessibility text — what someone who cannot see it is told the
   * picture is (CON-246). Separate from `content`, which is the longer
   * description the embeddings are built from, and empty on everything else.
   */
  alt_text: string
  /** Mirrored page images. Absent until a scrape has stored some. */
  images?: AssetImage[]
  /** The upload behind this document. Absent for notes and scraped pages. */
  file?: AssetFile | null
  tag_ids: string[]
  tags: Tag[]
  created_by: string
  created_at: string
  updated_at: string
}

export type CreateAssetPayload = {
  title: string
  content: string
  tag_ids?: string[]
}

/**
 * A whole-resource write, and the server defaults every field it doesn't find.
 *
 * Omitting `tag_ids` untags the asset and omitting `alt_text` blanks it — the
 * handler assigns both from the request unconditionally, so a payload that
 * mentions only the title is a payload that erases the rest. Never build one by
 * hand: `assetToPayload` round-trips the asset's own values and takes the
 * fields you mean to change as overrides.
 */
export type UpdateAssetPayload = {
  title: string
  content: string
  alt_text: string
  tag_ids: string[]
}
