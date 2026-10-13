import type { AnalysisEntity, AssetAnalysis } from '@/types/assetAnalysis'
import type { Asset, AssetStatus, AssetType } from '@/types/content'
import { retrievability } from './campaignSources'
import { shortSheetLabel } from './sheetChunks'

/**
 * The rules behind the asset page's Insights tab (CON-366), over the analyses
 * CON-364 writes. Pure, like the other rule files here: no clock, no store, no
 * catalogue — the components turn these answers into words.
 */

/**
 * Whether the server ever analyses this kind of asset. Everything with text
 * does; an image's `content` is a description of a picture, not source
 * material, so it never gets an Insights tab.
 */
export function isAnalyzable(type: AssetType): boolean {
  return type !== 'IMG'
}

/** A lens's stable identity: its campaign, or the workspace. */
export function lensKey(lens: Pick<AssetAnalysis, 'campaign_id'>): string {
  return lens.campaign_id ?? 'workspace'
}

/**
 * The lens the page opens on.
 *
 * An explicit `?lens=` wins when it still exists — a link should reopen the
 * reading it was copied from. Then the campaign the page was reached through,
 * because on `/campaigns/:id/assets/:assetId` the user is working on that
 * campaign. Then the workspace lens, which every analysable asset has once it
 * has been queued.
 */
export function pickLens(
  lenses: AssetAnalysis[],
  {
    requested,
    routeCampaignId,
  }: {
    requested?: string | null
    routeCampaignId?: string | null
  },
): AssetAnalysis | undefined {
  const byKey = (key: string) => lenses.find((l) => lensKey(l) === key)
  return (
    (requested ? byKey(requested) : undefined) ??
    (routeCampaignId ? byKey(routeCampaignId) : undefined) ??
    byKey('workspace') ??
    lenses[0]
  )
}

export function isLensWaiting(lens: Pick<AssetAnalysis, 'status'>): boolean {
  return lens.status === 'pending' || lens.status === 'running'
}

/**
 * What the Insights tab shows for one lens. The asset comes first: until its
 * text is extracted there is nothing for an analysis to read, and an asset
 * that failed ingestion never will be analysed.
 */
export type InsightState =
  | 'reading'
  | 'assetFailed'
  | 'analysing'
  | 'ready'
  | 'failed'
  | 'notInPlan'
  | 'limitReached'

export function insightState(
  assetStatus: AssetStatus,
  lens: AssetAnalysis | undefined,
): InsightState {
  if (assetStatus === 'failed') return 'assetFailed'
  if (retrievability(assetStatus) === 'waiting') return 'reading'
  if (!lens) return 'analysing'
  // A lens being re-read (a brief edit, a retry) keeps showing the reading it
  // has until the new one lands, rather than blanking to a skeleton.
  if (isLensWaiting(lens)) return lens.summary ? 'ready' : 'analysing'
  switch (lens.status) {
    case 'ready':
      return 'ready'
    case 'failed':
      return 'failed'
    default:
      return lens.failure_code === 'limit_reached'
        ? 'limitReached'
        : 'notInPlan'
  }
}

/**
 * Whether anything on the page is still on its way, which is what keeps the
 * fallback poll running. The event bus is at-most-once, so the poll is what
 * makes "no need to refresh" true when an event is lost.
 */
export function analysisInFlight(
  assetStatus: AssetStatus,
  lenses: AssetAnalysis[],
): boolean {
  return retrievability(assetStatus) === 'waiting' || lenses.some(isLensWaiting)
}

/**
 * The id a stand-in lens carries: a campaign the asset belongs to that has no
 * analysis row. The server writes the row the moment an asset is attached,
 * so this is a membership older than analysis itself — listed in the picker
 * so the campaign is not missing from it, and answered as "not analysed".
 */
const MISSING_LENS = 'missing:'

export function missingLens(
  assetId: string,
  campaign: { id: string; name: string },
): AssetAnalysis {
  return {
    id: MISSING_LENS + campaign.id,
    asset_id: assetId,
    campaign_id: campaign.id,
    campaign_name: campaign.name,
    status: 'skipped',
    strategy: null,
    summary: '',
    language: '',
    key_points: [],
    topics: [],
    entities: [],
    relevance: null,
    partial_source: false,
    truncated: false,
    failure_code: '',
    failure_reason: '',
    analyzed_at: null,
    ideas: [],
  }
}

export function isMissingLens(lens: Pick<AssetAnalysis, 'id'>): boolean {
  return lens.id.startsWith(MISSING_LENS)
}

/**
 * A settled reading with nothing in it. The server stores one when the source
 * has no text (a note not yet written, silence, an image-only file) rather
 * than calling the model, so it reads as "ready" — the page says what it
 * means instead of showing an empty reading.
 */
export function isEmptyReading(
  lens: Pick<AssetAnalysis, 'status' | 'summary' | 'key_points' | 'ideas'>,
): boolean {
  return (
    lens.status === 'ready' &&
    lens.summary.trim() === '' &&
    lens.key_points.length === 0 &&
    lens.ideas.length === 0
  )
}

/** A Markdown heading line: "## Title", up to three spaces in, closing #s dropped. */
const HEADING = /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/

/**
 * A summary split into headings and the runs of text between them. The model
 * writes light Markdown, and the assistant's parser (paragraphs, lists, bold)
 * has no headings — so a "## Title" line is taken out here, and every run
 * between headings goes to that parser as it is.
 */
export type SummaryPart =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'text'; text: string }

export function summaryParts(summary: string): SummaryPart[] {
  const parts: SummaryPart[] = []
  let run: string[] = []
  const flush = () => {
    const text = run.join('\n').trim()
    if (text) parts.push({ kind: 'text', text })
    run = []
  }
  for (const line of summary.split('\n')) {
    const m = HEADING.exec(line)
    if (m && m[2]) {
      flush()
      parts.push({ kind: 'heading', level: m[1].length, text: m[2] })
    } else {
      run.push(line)
    }
  }
  flush()
  return parts
}

/** Whether a lens has meeting notes to show — recordings, mostly. */
export function hasMeetingNotes(
  lens: Pick<
    AssetAnalysis,
    'participants' | 'commitments' | 'decisions' | 'open_questions'
  >,
): boolean {
  return [
    lens.participants,
    lens.commitments,
    lens.decisions,
    lens.open_questions,
  ].some((list) => (list?.length ?? 0) > 0)
}

/** An idea note split into the parts the backend wrote it as. */
export type IdeaNoteParts = {
  /** The content angle — the hook a post would take. */
  angle: string
  /** Why it fits the workspace or the campaign. */
  rationale: string
  /** The source labels it draws on: "p. 4", "Slide 2", "12:03–12:47". */
  sources: string[]
}

const SOURCES_PREFIX = 'Sources:'

/**
 * Reads an analysis idea's `note`, which CON-364 writes as `angle`, a blank
 * line, `rationale`, a blank line and a trailing `Sources: a, b` line. Any
 * part may be missing, and a person may have edited the note since, so this
 * reads what is there rather than insisting on the shape.
 */
export function parseIdeaNote(note: string): IdeaNoteParts {
  const paragraphs = note
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  let sources: string[] = []
  const last = paragraphs[paragraphs.length - 1]
  if (last?.startsWith(SOURCES_PREFIX)) {
    paragraphs.pop()
    sources = last
      .slice(SOURCES_PREFIX.length)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return {
    angle: paragraphs[0] ?? '',
    rationale: paragraphs.slice(1).join('\n\n'),
    sources,
  }
}

const TIME_LABEL = /^\s*(?:(\d+):)?(\d{1,2}):(\d{2})/

/**
 * The second a time label starts at — "12:03–12:47" is 723, "1:02:03" is
 * 3723 — or null for a label that is not a time (a page, a slide). Only the
 * start matters: a time chip plays from where the moment begins.
 */
export function timeLabelSeconds(label: string): number | null {
  const m = TIME_LABEL.exec(label)
  if (!m) return null
  const hours = m[1] ? Number(m[1]) : 0
  return hours * 3600 + Number(m[2]) * 60 + Number(m[3])
}

/** "15:12", "1:02:03" — a player's clock for `seconds` in. */
export function formatClock(seconds: number): string {
  const total =
    Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

/**
 * The one-line state under the title in the left column: the asset's own
 * reading first, then — for a kind that is analysed — its workspace lens.
 * The workspace lens is the asset's analysis in the sense the bank means it;
 * a campaign lens is one reading among several and has the picker for that.
 */
export type MetaStatus =
  | 'reading'
  | 'unreadable'
  | 'analysing'
  | 'analysed'
  | 'analysisFailed'
  | 'notAnalysed'
  | 'ready'

export function metaStatus(
  asset: Pick<Asset, 'status' | 'type' | 'analysis_status'>,
  workspaceLens: Pick<AssetAnalysis, 'status'> | undefined,
): MetaStatus {
  if (asset.status === 'failed') return 'unreadable'
  if (retrievability(asset.status) === 'waiting') return 'reading'
  if (!isAnalyzable(asset.type)) return 'ready'
  switch (workspaceLens?.status ?? asset.analysis_status) {
    case 'pending':
    case 'running':
      return 'analysing'
    case 'ready':
      return 'analysed'
    case 'failed':
      return 'analysisFailed'
    case 'skipped':
      return 'notAnalysed'
    default:
      return 'ready'
  }
}

/**
 * A row's source references, tidied for reading (CON-369): page references
 * ("p. 4", "pp. 57–59") are sorted by where they start and merged where they
 * overlap or touch, so "pp. 57–59", "pp. 55–57" reads "pp. 55–59". Anything
 * else — a slide, a time, a sheet range — keeps its place after the pages.
 */
export function mergePageRefs(labels: string[]): string[] {
  const ranges: [number, number][] = []
  const rest: string[] = []
  for (const label of labels) {
    const m = PAGE_REF.exec(label.trim())
    if (!m) {
      rest.push(label)
      continue
    }
    const from = Number(m[1])
    const to = m[2] ? Number(m[2]) : from
    ranges.push(from <= to ? [from, to] : [to, from])
  }
  ranges.sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = []
  for (const [from, to] of ranges) {
    const last = merged[merged.length - 1]
    if (last && from <= last[1] + 1) last[1] = Math.max(last[1], to)
    else merged.push([from, to])
  }
  return [
    ...merged.map(([from, to]) =>
      from === to ? `p. ${from}` : `pp. ${from}–${to}`,
    ),
    ...rest,
  ]
}

const PAGE_REF = /^pp?\.\s*(\d+)(?:\s*[–-]\s*(\d+))?$/

/** The order mention groups are read in, and which kinds exist. */
export const MENTION_KINDS = [
  'org',
  'product',
  'person',
  'place',
  'other',
] as const

export type MentionGroup = {
  kind: (typeof MENTION_KINDS)[number]
  names: string[]
}

/**
 * Mentions grouped by kind, kinds in a fixed order, names deduplicated in the
 * order the analysis listed them — what "What it covers" prints as text
 * (CON-369) instead of a cloud of pills with the kind in a tooltip.
 */
export function groupMentions(
  entities: Pick<AnalysisEntity, 'name' | 'kind'>[],
): MentionGroup[] {
  const groups = new Map<MentionGroup['kind'], string[]>()
  for (const entity of entities) {
    const kind = (MENTION_KINDS as readonly string[]).includes(entity.kind)
      ? entity.kind
      : 'other'
    const names = groups.get(kind) ?? []
    if (!names.includes(entity.name)) names.push(entity.name)
    groups.set(kind, names)
  }
  return MENTION_KINDS.filter((kind) => groups.has(kind)).map((kind) => ({
    kind,
    names: groups.get(kind) ?? [],
  }))
}

/**
 * A title fit to read (CON-369). An upload's title is its file name until
 * someone renames it, and "Databricks-Big-Book-Of-GenAI-FINAL" set at the
 * page's largest size reads as a system talking. A title with no spaces but
 * hyphens or underscores between three or more words, or a file extension,
 * is taken for a file name: the
 * extension goes and the separators become spaces. Anything a person typed —
 * any title with a space in it — is left exactly as it is.
 */
export function readableTitle(title: string): string {
  const trimmed = title.trim()
  if (/\s/.test(trimmed) || !/[-_]/.test(trimmed)) return title
  const stem = trimmed.replace(/\.[a-z0-9]{1,5}$/i, '')
  const words = stem.split(/[-_]+/).filter(Boolean)
  // Two parts is as likely a name ("GPT-4", "e-commerce") as a file; a file
  // name shows itself by an extension or by running to three parts or more.
  const looksLikeFile = stem !== trimmed || words.length >= 3
  return looksLikeFile && words.length > 1 ? words.join(' ') : title
}

/**
 * What a source reference says in a row or a chip: a sheet range shortened
 * ("Pipeline · rows 10–24"), a heading path down to its last heading
 * ("Process overview › SDLC methodology" → "SDLC methodology"), anything else
 * as it is. The full label is always the tooltip.
 */
export function refLabel(label: string): string {
  const sheet = shortSheetLabel(label)
  if (sheet) return sheet
  const path = label.split(' › ')
  return path[path.length - 1] || label
}
