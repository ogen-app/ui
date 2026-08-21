export type Tag = {
  id: string;
  name: string;
  color: string;
};

export type AssetStatus =
  | "pending"
  | "processing"
  | "ready"
  | "partial"
  | "failed";

/**
 * What kind of thing the document is, as the backend labels it.
 *
 * `null` is an asset written in the app — the type column predates in-app
 * notes and was never backfilled. `"URL"` is a web page the backend scraped to
 * Markdown on our behalf (CON-222); it reads like any other document from here,
 * and only differs in having somewhere it came from.
 */
export type AssetType = "MD" | "PDF" | "URL" | null;

/**
 * One image from a scraped page, copied into our own storage (CON-222).
 *
 * The scrape rewrites the Markdown's image links to `url`, so rendering the
 * content shows our copies and the page can rot without taking the document
 * with it. `source_url` is kept for provenance only — SVGs are deliberately
 * not mirrored, so an occasional link in the content still points outward.
 */
export type AssetImage = {
  id: string;
  /** Position in the page, and the key the backend stores it under. */
  idx: number;
  /** Where it was on the page. */
  source_url: string;
  /** Our copy. The one to render. */
  url: string;
  mime_type: string;
  size_bytes: number;
  alt?: string | null;
};

export type Asset = {
  id: string;
  title: string;
  content: string;
  status: AssetStatus;
  type: AssetType;
  /** The page this was scraped from, normalised by the backend. URL assets only. */
  source_url?: string | null;
  /** Mirrored page images. Absent until a scrape has stored some. */
  images?: AssetImage[];
  tag_ids: string[];
  tags: Tag[];
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CreateAssetPayload = {
  title: string;
  content: string;
  tag_ids?: string[];
};

export type UpdateAssetPayload = {
  title: string;
  content: string;
  tag_ids?: string[];
};
