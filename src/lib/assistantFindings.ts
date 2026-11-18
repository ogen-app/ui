import type { TFunction } from 'i18next'
import type {
  AssistantProposal,
  AssistantTurn,
  CalendarFinding,
  RepairFix,
} from '@/types/assistant'

/**
 * Every fix a turn's findings carry (CON-478): the calendar check's, the
 * reviews' and the brand check's. Each names its offer by `proposalId`, which
 * is how the row learns what became of it. Ignored findings count too: one
 * restored is drawn with its fixes again, and must read as fixed if it was.
 */
export function turnFixes(turn: AssistantTurn): RepairFix[] {
  const r = turn.repair
  return [
    ...(turn.findings?.findings ?? []),
    ...(turn.findings?.dismissedFindings ?? []),
    ...[r?.review, r?.briefReview, r?.postsReview].flatMap((review) => [
      ...(review?.findings ?? []),
      ...(review?.dismissedFindings ?? []),
    ]),
    ...(turn.foundation?.brandCheck?.findings ?? []),
  ].flatMap((f) => f.fixes)
}

/**
 * A fix's offer as a card would hold it, for an offer the turn doesn't carry
 * itself: drawn from the fix's own words, waiting on the user.
 */
export function fixOffer(
  fix: RepairFix & { proposalId: string },
): AssistantProposal {
  return {
    id: fix.proposalId,
    tool: fix.kind,
    summary: fix.title,
    options: fix.options ?? [],
    recommended: fix.options?.find((o) => o.recommended)?.id,
    card: fix.card,
    status: 'pending',
  }
}

/**
 * The idea a same-idea finding's posts share (CON-495, boards 3–5): "All
 * from 'Breakfast on the terrace'". A deleted idea has no title, and says
 * nothing.
 */
export function sharedIdeaLine(
  t: TFunction,
  finding: Pick<CalendarFinding, 'ideas'>,
): string | undefined {
  const title = finding.ideas?.[0]?.title
  return title ? t('assistant.findings.fromIdea', { title }) : undefined
}
