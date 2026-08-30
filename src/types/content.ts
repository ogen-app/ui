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
 * `"IMG"` is an image (CON-16). It is the first member that is **not** a
 * document: its `content` is a description of the picture rather than the
 * thing itself, which is why `opensAsDocument` exists. Listed here ahead of the
 * server — the CHECK constraint still reads `MD | PDF | URL` and CON-105's
 * branch adds `IMG` — so that every screen that switches on a type has to say
 * what it does with one. Nothing outside the `content-bank-images` flag may
 * assume an image asset can be *created*; the type is only how one is read.
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
 * The stored file behind an uploaded asset — PDFs, today (CON-103).
 *
 * `thumbnail_url` is the first page rendered to PNG when the upload was
 * ingested, and it is minted per response from the file's storage key: a URL
 * to draw right now, not an id worth keeping. Absent when the render failed,
 * which is why nothing may assume a file implies a picture.
 */
export type AssetFile = {
  id: string
  original_name: string
  mime_type: string
  size_bytes: number
  page_count?: number | null
  thumbnail_url?: string | null
}

export type Asset = {
  id: string
  title: string
  content: string
  status: AssetStatus
  type: AssetType
  /** The page this was scraped from, normalised by the backend. URL assets only. */
  source_url?: string | null
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

export type UpdateAssetPayload = {
  title: string
  content: string
  tag_ids?: string[]
}
