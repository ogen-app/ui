import type { DistillProposal } from '@/types/brandDistill'

/**
 * What Ogen needs to write posts that sound like this business and no other.
 *
 * Six needs, framed as Ogen's rather than as a profile of the client: each
 * says how far along it is and, until it is enough, what would fill it, so
 * adding a source visibly buys something.
 *
 * Four of them are the brand read's own verdict — the run's `coverage` per
 * section (found / thin / none), which is the server's judgement and not a
 * count taken here. "Where they post" is the connected accounts. "What sets
 * them apart" has no section of its own on the server yet (there is no
 * positioning on the brand), so until there is it reads the claims the brand
 * may make.
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

export function needsFrom({
  proposal,
  connected,
}: {
  /** The read's proposal, or null before one has finished. */
  proposal: DistillProposal | null
  /** How many accounts are connected. */
  connected: number
}): Need[] {
  const cover = (section: keyof DistillProposal['coverage']): NeedLevel => {
    const level = proposal?.coverage[section]?.level
    return level ? FROM_COVERAGE[level] : 'missing'
  }
  const claims = proposal?.guardrails.mayClaim.length ?? 0

  const levels: Record<NeedId, NeedLevel> = {
    apart: claims >= 2 ? 'enough' : claims === 1 ? 'thin' : 'missing',
    voice: cover('voices'),
    audience: cover('audiences'),
    onlyThey: cover('facts'),
    never: cover('guardrails'),
    channels: connected > 0 ? 'enough' : 'missing',
  }
  return NEED_IDS.map((id) => ({ id, level: levels[id] }))
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
