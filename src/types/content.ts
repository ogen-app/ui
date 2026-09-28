export type Tag = {
  id: string
  name: string
  color: string
}

export type AssetStatus =
  'pending' | 'processing' | 'ready' | 'partial' | 'failed'

/**
 * What kind of thing the document is, as the backend labels it.
 *
 * `null` is an asset written in the app — the type column predates in-app
 * notes and was never backfilled. `"URL"` is a web page the backend scraped to
 * Markdown on our behalf (CON-222); it reads like any other document from here,
 * and only differs in having somewhere it came from.
 *
 * `"IMG"` is an image (CON-246). Its `content` is a description of the
 * picture rather than the thing itself, which is why `opensAsDocument` exists
 * and why an image gets a screen of its own rather than the editor.
 *
 * `"DOC"` is an office or text file — Word, Excel, PowerPoint, OpenDocument,
 * EPUB, CSV, HTML, email, RTF, plain text — parsed by document-service into
 * source-anchored chunks (CON-280). `"AUDIO"` is a recording, whose `content`
 * is the transcript audio-service wrote once the run finished (CON-282). Both
 * are ingestion output, like a PDF's text, and the server refuses an edit to
 * any of the three (`content_locked`, CON-312).
 */
export type AssetType = 'MD' | 'PDF' | 'URL' | 'IMG' | 'DOC' | 'AUDIO' | null

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
  /**
   * The browser-safe copy image-service writes of every image (CON-299) — a
   * PNG, so a HEIC or TIFF original that no browser draws still has something
   * to show. Absent until the ingest has finished, and on anything that isn't
   * an image.
   */
  normalized_url?: string | null
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
  /**
   * Whether a person wrote the alt text, rather than image-service (CON-281).
   * Re-processing never overwrites one a person wrote. The server flips it on
   * any PUT whose `alt_text` differs from the stored value, which is why a
   * screen sends `alt_text` only once someone has typed in it.
   */
  alt_text_edited_by_user?: boolean
  /**
   * Why ingestion failed, when it did (CON-312). `failure_code` is one of the
   * upload codes (`lib/uploadError`); `failure_reason` is the server's prose,
   * kept for a code this build predates.
   */
  failure_code?: string | null
  failure_reason?: string | null
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
 * A presence-aware write (CON-279): `alt_text` and `tag_ids` are optional, and
 * leaving one out leaves the stored value alone. Sending it — including `""`
 * or `[]` — replaces it.
 *
 * That is the opposite of the campaign PUT, and the difference is deliberate
 * rather than an inconsistency to iron out. Both fields belong to screens the
 * document editor cannot see: tags are now filed in bulk over a selection, and
 * `alt_text` is only ever written on the image screen. A whole-resource write
 * would have every save carry the copy of those the editor last read, so
 * saving a title would undo a re-tag done in another tab a second earlier.
 *
 * `title` stays required — the server has no way to say "no title". `content`
 * is optional since CON-312: an empty or unchanged one keeps what is stored, so
 * a rename of an ingested asset (PDF, DOC, AUDIO) sends only the title and can
 * never trip `content_locked`, which a *different* value on those types does.
 */
export type UpdateAssetPayload = {
  title: string
  content?: string
  alt_text?: string
  tag_ids?: string[]
}

/**
 * Adds and/or removes tags across many assets at once (CON-279).
 *
 * Each asset keeps the tags it has, minus `remove`, plus `add` — so this is a
 * filing operation over a selection, not a whole-set replacement, and it never
 * has to be told what an asset already carries. The server rejects a tag named
 * in both lists rather than picking a silent winner, and it requires at least
 * one of them to be non-empty.
 */
export type BulkTagPayload = {
  asset_ids: string[]
  add?: string[]
  remove?: string[]
}
