import type { IdeaBody } from '@/services/api/ideas'

/**
 * An asset's LLM analysis (CON-364), as `GET
 * /api/content-bank/assets/:id/analyses` answers it.
 *
 * One asset has several: a **workspace lens** (`campaign_id: null`), read
 * against the workspace's brand, and one **campaign lens** per campaign the
 * asset is attached to, read against that campaign's brief. Every lens carries
 * its own summary and its own ideas, which are ordinary Ideas-inbox rows
 * (`origin: 'asset_analysis'`).
 *
 * `status` walks `pending → running → ready`, or ends `failed` / `skipped`.
 * `skipped` is the tier speaking (`failure_code` says which gate), not an
 * error, and both it and `failed` can be retried.
 */
export type AssetAnalysisStatus =
  'pending' | 'running' | 'ready' | 'failed' | 'skipped'

/** The closed set of codes a failed or skipped lens carries. */
export type AssetAnalysisFailureCode =
  | 'entitlement_disabled'
  | 'limit_reached'
  | 'empty_source'
  | 'invalid_output'
  | 'source_unavailable'
  | 'model_unavailable'
  | 'model_refused'

export type AnalysisEntity = {
  name: string
  kind: 'person' | 'org' | 'product' | 'place' | 'other'
}

/**
 * Someone who took part in a recording. The server infers participants from
 * the transcript — there is no speaker diarisation — so `inferred` is said out
 * loud on screen rather than passed off as fact.
 */
export type AnalysisParticipant = {
  name: string
  role?: string
  confidence: 'stated' | 'inferred'
}

/** A promise made in a recording, cited by the time range it was said in. */
export type AnalysisCommitment = {
  owner: string
  commitment: string
  due?: string
  source_label?: string
  confidence: 'stated' | 'inferred'
}

export type AnalysisDecision = {
  text: string
  source_label?: string
}

/** How well the asset serves a campaign. Campaign lenses only. */
export type AnalysisRelevance = {
  score: number
  why: string
}

export type AssetAnalysis = {
  id: string
  asset_id: string
  campaign_id: string | null
  campaign_name: string | null
  status: AssetAnalysisStatus
  strategy: 'full' | 'map_reduce' | null
  summary: string
  language: string
  key_points: string[]
  topics: string[]
  entities: AnalysisEntity[]
  /** The four meeting fields are present for recordings only. */
  participants?: AnalysisParticipant[]
  commitments?: AnalysisCommitment[]
  decisions?: AnalysisDecision[]
  open_questions?: string[]
  relevance: AnalysisRelevance | null
  /** The asset was only partly ingested; the analysis read what there was. */
  partial_source: boolean
  /** The source was longer than the analysis reads; its tail was dropped. */
  truncated: boolean
  failure_code: AssetAnalysisFailureCode | ''
  failure_reason: string
  analyzed_at: string | null
  /** The lens's ideas, `[]` when it distilled none. */
  ideas: IdeaBody[]
}
