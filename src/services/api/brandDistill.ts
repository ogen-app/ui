import type { VoiceRules } from '@/components/brand/types'
import type {
  DistillAnswer,
  DistillCommit,
  DistillCommitResult,
  DistillQuestion,
  DistillRead,
  DistillReadRequest,
  DistillRequest,
  DistillRun,
  DistillWebsite,
  ProposedVoice,
} from '@/types/brandDistill'
import { apiJson, apiVoid } from './http'

/**
 * Reading a brand off what the workspace already has — `/api/brand/distills`
 * (CON-399, the server half of CON-400).
 *
 * A run is asynchronous: the request answers 202 with the run, progress
 * arrives as `brand.distill.updated` on `entity:brand_distill:<id>`, and the
 * proposal is read with `getDistillRun` once the run is `ready`. The event
 * never carries the proposal, so the read is the only way to it.
 *
 * Two shapes are translated on the way through, both for the reason
 * `services/api/brand` gives: a voice's `person` is `''` on the wire when it is
 * nobody, and `'none'` everywhere in this client.
 */

const BASE = '/api/brand/distills'

type WireRules = Omit<VoiceRules, 'person'> & {
  person: VoiceRules['person'] | ''
}

function rulesFromWire({ person, ...rest }: WireRules): VoiceRules {
  return { ...rest, person: person === '' ? 'none' : person }
}

function rulesToWire({ person, ...rest }: VoiceRules): WireRules {
  return { ...rest, person: person === 'none' ? '' : person }
}

type WireWebsite = Omit<DistillWebsite, 'siteName' | 'faviconUrl'> & {
  siteName?: string | null
  faviconUrl?: string | null
}

type WireRead = Omit<DistillRead, 'website' | 'coverage'> & {
  website: WireWebsite | null
  coverage: DistillRead['coverage'] | null
}

type WireRun = Omit<
  DistillRun,
  'proposal' | 'website' | 'incremental' | 'coverage' | 'reads'
> & {
  website: WireWebsite | null
  incremental?: boolean
  coverage?: DistillRun['coverage'] | null
  /** Left out of the list, and of runs that are not incremental. */
  reads?: WireRead[] | null
  proposal:
    | (Omit<NonNullable<DistillRun['proposal']>, 'voices'> & {
        voices: (Omit<ProposedVoice, 'rules'> & { rules: WireRules })[]
      })
    | null
}

function websiteFromWire(w: WireWebsite | null): DistillWebsite | null {
  return w
    ? { ...w, siteName: w.siteName ?? '', faviconUrl: w.faviconUrl ?? null }
    : null
}

function readFromWire(read: WireRead): DistillRead {
  return {
    ...read,
    website: websiteFromWire(read.website),
    sources: read.sources ?? [],
    answers: read.answers ?? [],
    coverage: read.coverage ?? {},
  }
}

/**
 * A run as this client reads it. The server's `null` lists are made empty here,
 * once, so nothing above has to ask whether a proposal with no facts has a
 * `facts` at all.
 */
function runFromWire(run: WireRun): DistillRun {
  const p = run.proposal
  return {
    ...run,
    website: websiteFromWire(run.website),
    incremental: run.incremental ?? false,
    coverage: run.coverage ?? {},
    reads: (run.reads ?? []).map(readFromWire),
    sources: run.sources ?? [],
    answers: run.answers ?? [],
    proposal: p
      ? {
          ...p,
          voices: (p.voices ?? []).map((v) => ({
            ...v,
            samples: v.samples ?? [],
            rules: rulesFromWire(v.rules),
          })),
          audiences: p.audiences ?? [],
          guardrails: {
            mayClaim: p.guardrails?.mayClaim ?? [],
            neverClaim: p.guardrails?.neverClaim ?? [],
            bannedWords: p.guardrails?.bannedWords ?? [],
            disclaimer: p.guardrails?.disclaimer ?? null,
          },
          facts: p.facts ?? [],
          positioning: {
            statement: p.positioning?.statement ?? null,
            differentiators: p.positioning?.differentiators ?? [],
          },
          questions: p.questions ?? [],
          coverage: p.coverage ?? {},
          dropped: p.dropped ?? { ungrounded: 0, duplicate: 0, limit: 0 },
        }
      : null,
  }
}

/**
 * Starts a run. Answers 202 with it — `collecting` for a website or uploads
 * still being ingested, further along for answers alone. An `incremental` run
 * stays `collecting`: its sources are added with `addDistillRead` and it is
 * written with `composeDistill`.
 *
 * Refusals worth knowing: 409 `distill_in_progress` (one open run per
 * workspace — open that one instead; the body's `run` is it), 402
 * `entitlement_exceeded`, 403 `feature_not_available`, 409
 * `scraping_unavailable`, 422 `invalid_url`.
 */
export async function requestDistill(
  request: DistillRequest,
): Promise<DistillRun> {
  const run = await apiJson<WireRun>(BASE, 'Unable to start reading', {
    method: 'POST',
    body: request,
  })
  return runFromWire(run)
}

/** The workspace's latest runs, newest first, without their proposals. */
export async function listDistillRuns(): Promise<DistillRun[]> {
  const body = await apiJson<{ runs: WireRun[] | null }>(
    BASE,
    'Unable to read what was read',
  )
  return (body.runs ?? []).map(runFromWire)
}

export async function getDistillRun(id: string): Promise<DistillRun> {
  const run = await apiJson<WireRun>(
    `${BASE}/${encodeURIComponent(id)}`,
    'Unable to read this run',
  )
  return runFromWire(run)
}

/** The open run a 409 `distill_in_progress` carries, when it carries one. */
export function openRunOf(body: Record<string, unknown> | undefined) {
  const run = body?.run
  return run && typeof run === 'object' ? runFromWire(run as WireRun) : null
}

/**
 * Reads one more source of an incremental run, at once and on its own.
 * Answers 202 with the read; answers come back `ready`. Its progress, and the
 * run's coverage as each read finishes, arrive as `brand.distill.updated`.
 *
 * Refusals worth knowing: 409 `run_not_collecting` (the run was composed or
 * closed), 422 `already_read`, `too_many`, `invalid_url`, `asset_failed`.
 */
export async function addDistillRead(
  runId: string,
  source: DistillReadRequest,
): Promise<DistillRead> {
  const read = await apiJson<WireRead>(
    `${BASE}/${encodeURIComponent(runId)}/reads`,
    'Unable to read this',
    { method: 'POST', body: source },
  )
  return readFromWire(read)
}

/** Stops a read still in progress, or takes a finished one out of the run. */
export function stopDistillRead(runId: string, readId: string): Promise<void> {
  return apiVoid(
    `${BASE}/${encodeURIComponent(runId)}/reads/${encodeURIComponent(readId)}`,
    'Unable to stop reading this',
    { method: 'DELETE' },
  )
}

/**
 * Writes an incremental run's proposal from every finished read. The run then
 * moves like any other, to `ready`.
 *
 * Refusals worth knowing: 409 `reads_in_progress` (stop the open reads or
 * wait), 422 `nothing_read` (no source gave anything).
 */
export async function composeDistill(runId: string): Promise<DistillRun> {
  const run = await apiJson<WireRun>(
    `${BASE}/${encodeURIComponent(runId)}/compose`,
    'Unable to read the brand',
    { method: 'POST' },
  )
  return runFromWire(run)
}

/** The eight questions for a brand nothing is written down for. */
export async function listStarterQuestions(): Promise<DistillQuestion[]> {
  const body = await apiJson<{ questions: DistillQuestion[] | null }>(
    `${BASE}/starter-questions`,
    'Unable to load the questions',
  )
  return body.questions ?? []
}

/**
 * Answers a ready run's gap questions. Answers 202 with a **new** run that
 * composes again from the passages already read, and the one asked becomes
 * `superseded` with `childRunId` pointing here. Not charged.
 */
export async function answerDistill(
  id: string,
  answers: DistillAnswer[],
): Promise<DistillRun> {
  const run = await apiJson<WireRun>(
    `${BASE}/${encodeURIComponent(id)}/answers`,
    'Unable to send the answers',
    { method: 'POST', body: { answers } },
  )
  return runFromWire(run)
}

/**
 * Saves the kept items in one transaction. Additive: nothing the workspace
 * already has is changed, except the disclaimer and the positioning statement
 * when one is sent. Repeats and
 * items over a cap come back in `skipped` rather than failing the save.
 */
export async function commitDistill(
  id: string,
  commit: DistillCommit,
): Promise<DistillCommitResult> {
  const body = await apiJson<DistillCommitResult & { brand?: unknown }>(
    `${BASE}/${encodeURIComponent(id)}/commit`,
    'Unable to save to your Foundation',
    {
      method: 'POST',
      body: {
        ...commit,
        voices: commit.voices.map((v) => ({
          ...v,
          rules: rulesToWire(v.rules),
        })),
      },
    },
  )
  return {
    applied: {
      voices: body.applied?.voices ?? [],
      audiences: body.applied?.audiences ?? [],
      guardrails: body.applied?.guardrails ?? [],
      facts: body.applied?.facts ?? [],
      positioning: body.applied?.positioning ?? [],
    },
    skipped: body.skipped ?? [],
  }
}

/** Closes a run that is not committed; an open one stops. */
export function discardDistill(id: string): Promise<void> {
  return apiVoid(`${BASE}/${encodeURIComponent(id)}`, 'Unable to discard', {
    method: 'DELETE',
  })
}
