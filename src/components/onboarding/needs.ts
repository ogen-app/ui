import type { DistillCoverage, DistillSection } from '@/types/brandDistill'

/**
 * What Ogen needs to write posts that sound like this business and no other.
 *
 * Six needs, framed as Ogen's rather than as a profile of the client: each
 * says how far along it is and, until it is enough, what would fill it, so
 * adding a source visibly buys something.
 *
 * Five of them are the brand read's own — its `coverage` per section (found /
 * thin / none), the server's judgement and never a count taken here: while
 * sources are still being added, the run's count of what has been read so
 * far, and once composed, the proposal's verdict. "Where they post" is the
 * connected accounts.
 */
export const NEED_IDS = [
  'apart',
  'voice',
  'audience',
  'onlyThey',
  'never',
  'channels',
] as const

export type NeedId = (typeof NEED_IDS)[number]

export type NeedLevel = 'missing' | 'thin' | 'enough'

export type Need = { id: NeedId; level: NeedLevel }

const FROM_COVERAGE = {
  found: 'enough',
  thin: 'thin',
  none: 'missing',
} as const satisfies Record<string, NeedLevel>

/** The need each section of a read fills. */
export const NEED_OF_SECTION = {
  positioning: 'apart',
  voices: 'voice',
  audiences: 'audience',
  facts: 'onlyThey',
  guardrails: 'never',
} as const satisfies Record<DistillSection, NeedId>

export function needsFrom({
  coverage,
  connected,
}: {
  /** The read's coverage — the proposal's once composed, the run's before. */
  coverage: DistillCoverage | undefined
  /** How many accounts are connected. */
  connected: number
}): Need[] {
  const levels: Record<NeedId, NeedLevel> = {
    apart: 'missing',
    voice: 'missing',
    audience: 'missing',
    onlyThey: 'missing',
    never: 'missing',
    channels: connected > 0 ? 'enough' : 'missing',
  }
  for (const [section, need] of Object.entries(NEED_OF_SECTION)) {
    const level = coverage?.[section as DistillSection]?.level
    if (level) levels[need] = FROM_COVERAGE[level]
  }
  return NEED_IDS.map((id) => ({ id, level: levels[id] }))
}

/** A need a source can fill — all but the accounts. */
export type ReadNeed = (typeof NEED_OF_SECTION)[DistillSection]

/**
 * What one source added, as the needs it went towards — the read's own
 * coverage, in the sheet's order.
 */
export function needsAdded(coverage: DistillCoverage): ReadNeed[] {
  const added = (Object.keys(NEED_OF_SECTION) as DistillSection[])
    .filter((section) => (coverage[section]?.level ?? 'none') !== 'none')
    .map((section) => NEED_OF_SECTION[section])
  return NEED_IDS.filter((id): id is ReadNeed => added.includes(id as ReadNeed))
}

export type Verdict = 'none' | 'some' | 'most' | 'all'

/** The one line under the meter. */
export function verdictOf(needs: Need[]): Verdict {
  const enough = needs.filter((n) => n.level === 'enough').length
  if (enough === needs.length) return 'all'
  if (enough >= 4) return 'most'
  if (needs.some((n) => n.level !== 'missing')) return 'some'
  return 'none'
}
