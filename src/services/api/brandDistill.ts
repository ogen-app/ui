import type { VoiceRules } from '@/components/brand/types'
import type {
  DistillAnswer,
  DistillCommit,
  DistillCommitResult,
  DistillQuestion,
  DistillRequest,
  DistillRun,
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

type WireRun = Omit<DistillRun, 'proposal'> & {
  proposal:
    | (Omit<NonNullable<DistillRun['proposal']>, 'voices'> & {
        voices: (Omit<ProposedVoice, 'rules'> & { rules: WireRules })[]
      })
    | null
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
          questions: p.questions ?? [],
          coverage: p.coverage ?? {},
          dropped: p.dropped ?? { ungrounded: 0, duplicate: 0, limit: 0 },
        }
      : null,
  }
}

/**
 * Starts a run. Answers 202 with it — `collecting` for a website or uploads
 * still being ingested, further along for answers alone.
 *
 * Refusals worth knowing: 409 `distill_in_progress` (one open run per
 * workspace — open that one instead), 402 `entitlement_exceeded`, 403
 * `feature_not_available`, 409 `scraping_unavailable`, 422 `invalid_url`.
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

/** The seven questions for a brand nothing is written down for. */
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
 * already has is changed, except the disclaimer when one is sent. Repeats and
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
