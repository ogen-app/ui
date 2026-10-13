import type { IdeaCounts } from '@/lib/ideas'
import type { AssetAnalysisStatus } from './assetAnalysis'
import type { AssetStatus, AssetType, Tag } from './content'

/**
 * The Assets query (`GET /api/content-bank/assets`, CON-374): one page of the
 * list, filtered, counted and sorted on the server.
 *
 * The rows are *slim* — no `content`, no images, no alt text — because the
 * list used to carry every note's whole document and grew with each one. The
 * full asset stays at `GET /:id`.
 */

/**
 * What an asset is to someone browsing the bank. The server classifies it
 * (from `type` and the file's MIME type), so the client never maps MIME types.
 */
export type AssetListKind =
  | 'pdf'
  | 'web'
  | 'audio'
  | 'note'
  | 'image'
  | 'document'
  | 'spreadsheet'
  | 'csv'
  | 'presentation'

export type AssetListFile = {
  mime_type: string
  page_count?: number | null
  /** A recording's length; 0 when unknown or not a recording. */
  duration_ms: number
  checksum_sha256?: string
  thumbnail_url?: string | null
  url?: string | null
}

/** Where an asset mentions the `text` of a query. */
export type AssetTextMatch = {
  /** How many of the asset's chunks match. */
  matches: number
  /**
   * The best chunk around the match: HTML-escaped, each matched word in
   * `<mark>…</mark>` (the only markup), with "…" where it was cut.
   */
  snippet: string
  /** "Page 14", "1:05–1:40" — null for a note or a web page. */
  source_label: string | null
  chunk_index: number
}

export type AssetListItem = {
  id: string
  title: string
  type: AssetType
  kind: AssetListKind
  /** The stored status: the status *filter* counts `processing` as `pending`. */
  status: AssetStatus
  failure_code: string
  source_url: string | null
  created_at: string
  updated_at: string
  analysis_status: AssetAnalysisStatus | null
  file: AssetListFile | null
  tags: Tag[]
  /** The live campaigns the asset serves, whole-bank campaigns included. */
  campaign_ids: string[]
  /**
   * The asset's analysis ideas per verdict, a "later" whose reminder has
   * passed counted as waiting — the server's `undecided`, renamed on the way
   * in to the word the Ideas inbox already uses.
   */
  idea_counts: IdeaCounts
  /**
   * One sentence of the workspace analysis; null unless that lens is ready
   * and has a gist or a usable summary sentence.
   */
  gist: string | null
  /**
   * The oldest of the ideas `idea_counts.waiting` counts (CON-379) — null
   * exactly when that count is 0, so the row never names an idea its pill
   * doesn't count.
   */
  next_idea: AssetNextIdea | null
  /**
   * When the source was published, read from its own metadata at ingest
   * (a PDF's creation date, a page's `article:published_time`). Null when it
   * said nothing; the row then says when the asset was added instead.
   */
  published_at: string | null
  /** The group the row is listed under — only on a grouped read. */
  group_key?: string
  /** Only when the query has `text`. */
  match?: AssetTextMatch
}

export type AssetNextIdea = { id: string; title: string }

export type AssetFacetCount = { value: string; count: number }

/** The fields the list can count values of. */
export type AssetFacetField =
  'kind' | 'status' | 'campaign' | 'tag' | 'ideas' | 'updated' | 'created'

/** How many rows of the whole match one group lists. */
export type AssetGroupCount = { key: string; count: number }

export type AssetListPage = {
  assets: AssetListItem[]
  /** Null on the last page. */
  next_cursor: string | null
  /** Assets matching every filter. */
  total: number
  /** Every asset in scope — "24 of 41". */
  total_unfiltered: number
  /**
   * Per requested field, every value with how many assets have it. Each
   * field's counts apply every *other* filter but not its own.
   */
  facets: Partial<Record<AssetFacetField, AssetFacetCount[]>>
  /**
   * `idea_counts.undecided` summed over every matching asset, not only this
   * page — what "29 ideas are waiting" says. The client never adds it up.
   */
  ideas_undecided_total: number
  /**
   * On a grouped read, every non-empty group of the whole match with its row
   * count, in display order; empty otherwise. A tag grouping lists an asset
   * once per tag, so these count appearances where `total` counts assets.
   */
  groups: AssetGroupCount[]
}

/** The query string of one read, as the endpoint takes it. */
export type AssetQueryParams = Record<string, string>
