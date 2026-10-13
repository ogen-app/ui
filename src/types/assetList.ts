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
  /** Only when the query has `text`. */
  match?: AssetTextMatch
}

export type AssetFacetCount = { value: string; count: number }

/** The fields the list can count values of. */
export type AssetFacetField =
  'kind' | 'status' | 'campaign' | 'tag' | 'ideas' | 'updated'

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
}

/** The query string of one read, as the endpoint takes it. */
export type AssetQueryParams = Record<string, string>
