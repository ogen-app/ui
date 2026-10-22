import type { FactKind, FactSubject } from '@/components/brand/facts'
import type {
  DistillCommit,
  DistillEvidence,
  DistillProposal,
  DistillRun,
  DistillStatus,
  ProposedAudience,
  ProposedFact,
  ProposedLine,
  ProposedVoice,
} from '@/types/brandDistill'

/**
 * The rules of reading a brand off what the workspace has (CON-399/400) that
 * are not a screen: where a run is, what the review has decided, and the body
 * the decisions commit as.
 *
 * **The review is the client's, and only the client's.** The server holds the
 * proposal; what the user keeps, drops and rewrites is held here until the one
 * request that saves it. That is the whole contract — nothing is written
 * before the commit — and it is why the decisions are keyed by `proposalId`
 * rather than by position: a gap-question round makes a *new* run, and the ids
 * of items that carried over unchanged survive into it, so the same review
 * applies to the child without a mapping step. An id the child does not have
 * is simply never read again.
 */

/** A run the server is still working on. */
export function isRunOpen(status: DistillStatus): boolean {
  return (
    status === 'pending' ||
    status === 'collecting' ||
    status === 'reading' ||
    status === 'composing'
  )
}

/**
 * The run a workspace should be returned to: one being worked on, or one
 * waiting for review. The list is newest first, so the first match is it.
 */
export function resumableRun(runs: DistillRun[]): DistillRun | undefined {
  return runs.find((r) => isRunOpen(r.status) || r.status === 'ready')
}

/** What a run read — the three routes, plus a mix of them. */
export type RunRoute = 'website' | 'document' | 'questions'

export function runRoute(run: DistillRun): RunRoute {
  if (run.website) return 'website'
  if (run.sources.length > 0) return 'document'
  return 'questions'
}

/** `acme-roasters.com`, from whatever form the address was given in. */
export function siteHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * A page of the site, as the reading list names it: the host for the
 * homepage, the path for every other page — the host is in the heading
 * already, and ten rows each repeating it are ten rows that differ only at
 * the end.
 */
export function pagePath(url: string): string {
  try {
    const { hostname, pathname } = new URL(url)
    return pathname === '/' || pathname === ''
      ? hostname.replace(/^www\./, '')
      : pathname.replace(/\/$/, '')
  } catch {
    return url
  }
}

/**
 * What a page was chosen for, judged from its path the way the server chose it
 * (`branddistill/pages.go`, `kindWords` and `articleSections`). A mirror of a
 * server rule, like the rest of `lib/`: the server is the source of truth and
 * this is only ever a label — a page it cannot place gets none.
 */
export type PageKind =
  'home' | 'about' | 'product' | 'pricing' | 'legal' | 'article'

const KIND_WORDS: [Exclude<PageKind, 'home' | 'article'>, string[]][] = [
  [
    'legal',
    [
      'terms',
      'legal',
      'disclaimer',
      'disclaimers',
      'compliance',
      'imprint',
      'impressum',
      'terms-of-sale',
      'terms-of-service',
      'terms-and-conditions',
    ],
  ],
  ['pricing', ['pricing', 'prices', 'plans', 'price']],
  [
    'about',
    [
      'about',
      'about-us',
      'company',
      'story',
      'our-story',
      'mission',
      'who-we-are',
      'values',
      'manifesto',
    ],
  ],
  [
    'product',
    [
      'product',
      'products',
      'features',
      'solutions',
      'services',
      'platform',
      'how-it-works',
      'shop',
      'use-cases',
    ],
  ],
]

const ARTICLE_SECTIONS = [
  'blog',
  'news',
  'insights',
  'journal',
  'articles',
  'stories',
  'resources',
  'magazine',
  'posts',
]

export function pageKind(url: string): PageKind | null {
  let segments: string[]
  try {
    segments = new URL(url).pathname.split('/').filter(Boolean)
  } catch {
    return null
  }
  if (segments.length === 0) return 'home'
  if (segments.length > 1 && ARTICLE_SECTIONS.includes(segments[0]))
    return 'article'
  for (const [kind, words] of KIND_WORDS) {
    if (segments.some((s) => words.includes(s.toLowerCase()))) return kind
  }
  return null
}

/**
 * The four steps a run is shown as, and which of them it is on.
 *
 * The server's statuses are not the steps one for one, and the difference is
 * the user's: *collecting* is finding the pages and then fetching them, and
 * *reading* is the model reading what was fetched — to somebody watching, both
 * halves of that are "reading the pages". Drafting is `composing`. Checking is
 * the grounding pass the server runs inside it before `ready`, so it has no
 * status of its own and is only ever ticked by the run finishing.
 *
 * A questions-only run skips the first two: there is nothing to find or read.
 */
export type ReadStep = 'finding' | 'reading' | 'drafting' | 'checking'

export function readSteps(run: DistillRun): ReadStep[] {
  const route = runRoute(run)
  if (route === 'questions') return ['drafting', 'checking']
  if (route === 'document') return ['reading', 'drafting', 'checking']
  return ['finding', 'reading', 'drafting', 'checking']
}

/** The step in hand; everything before it is done. */
export function currentStep(run: DistillRun): ReadStep {
  if (run.status === 'composing') return 'drafting'
  if (run.status === 'reading') return 'reading'
  if (runRoute(run) === 'website' && run.sources.length === 0) return 'finding'
  if (runRoute(run) === 'questions') return 'drafting'
  return 'reading'
}

/** A source the run has finished with, one way or another. */
export function isSourceSettled(status: string): boolean {
  return status !== 'pending'
}

/** The sources that will actually be read — skipped and thin ones are not. */
export function readableCount(run: DistillRun): number {
  return run.sources.filter(
    (s) => s.status === 'ready' || s.status === 'partial',
  ).length
}

// ---------------------------------------------------------------------------
// The review
// ---------------------------------------------------------------------------

export type VoiceDraft = Pick<ProposedVoice, 'name' | 'whenToUse'> & {
  samples: string[]
}
export type AudienceDraft = Pick<
  ProposedAudience,
  'name' | 'who' | 'readsOn' | 'scrollsPastWhen' | 'believesWhen'
>
export type FactDraft = {
  statement: string
  subject: FactSubject
  kind: FactKind
  expiresAt: string | null
}

/**
 * What the user has decided about a proposal.
 *
 * **Everything starts kept** — the job is to drop, not to approve thirty items
 * one by one — so the review records only the exceptions: what was dropped,
 * and what was rewritten. A proposal nobody touched commits whole.
 */
export type DistillReview = {
  dropped: string[]
  voices: Record<string, Partial<VoiceDraft>>
  audiences: Record<string, Partial<AudienceDraft>>
  /** Guardrail lines and banned words, by proposal id. */
  lines: Record<string, string>
  facts: Record<string, Partial<FactDraft>>
  /**
   * Whose disclaimer wins. `yours` until somebody explicitly picks the site's
   * — the one place a commit replaces something the workspace already had.
   */
  disclaimer: 'yours' | 'site'
}

export const EMPTY_REVIEW: DistillReview = {
  dropped: [],
  voices: {},
  audiences: {},
  lines: {},
  facts: {},
  disclaimer: 'yours',
}

export function isDropped(review: DistillReview, id: string): boolean {
  return review.dropped.includes(id)
}

export function toggleDropped(
  review: DistillReview,
  id: string,
): DistillReview {
  return {
    ...review,
    dropped: isDropped(review, id)
      ? review.dropped.filter((d) => d !== id)
      : [...review.dropped, id],
  }
}

export function voiceDraft(
  voice: ProposedVoice,
  review: DistillReview,
): VoiceDraft {
  return {
    name: voice.name,
    whenToUse: voice.whenToUse,
    samples: voice.samples.map((s) => s.text),
    ...review.voices[voice.proposalId],
  }
}

export function audienceDraft(
  audience: ProposedAudience,
  review: DistillReview,
): AudienceDraft {
  return {
    name: audience.name,
    who: audience.who,
    readsOn: audience.readsOn,
    scrollsPastWhen: audience.scrollsPastWhen,
    believesWhen: audience.believesWhen,
    ...review.audiences[audience.proposalId],
  }
}

export function lineText(line: ProposedLine, review: DistillReview): string {
  return review.lines[line.proposalId] ?? line.text
}

export function factDraft(
  fact: ProposedFact,
  review: DistillReview,
): FactDraft {
  return {
    statement: fact.statement,
    subject: fact.subject,
    kind: fact.kind,
    expiresAt: fact.expiresAt,
    ...review.facts[fact.proposalId],
  }
}

/**
 * Whether the disclaimer is a choice between two texts or a line like any
 * other. It is a choice only when the workspace already runs one — with
 * nothing of yours to keep, the site's is simply proposed, kept until dropped.
 */
export function disclaimerIsChoice(proposal: DistillProposal): boolean {
  return Boolean(proposal.guardrails.disclaimer?.current?.trim())
}

/** Every keep-or-drop decision in a proposal, as ids. */
function decidableIds(proposal: DistillProposal): string[] {
  const g = proposal.guardrails
  return [
    ...proposal.voices.map((v) => v.proposalId),
    ...proposal.audiences.map((a) => a.proposalId),
    ...g.mayClaim.map((l) => l.proposalId),
    ...g.neverClaim.map((l) => l.proposalId),
    ...g.bannedWords.map((l) => l.proposalId),
    ...(g.disclaimer && !disclaimerIsChoice(proposal)
      ? [g.disclaimer.proposalId]
      : []),
    ...proposal.facts.map((f) => f.proposalId),
  ]
}

/** `N of M kept`, the save bar's status. */
export function keptTally(
  proposal: DistillProposal,
  review: DistillReview,
): { kept: number; total: number } {
  const ids = decidableIds(proposal)
  return {
    kept: ids.filter((id) => !isDropped(review, id)).length,
    total: ids.length,
  }
}

/**
 * The commit body: the kept items, with every edit applied.
 *
 * A blank survivor is left out rather than sent — a line edited down to
 * nothing is a line the user removed by other means, and the server would
 * refuse it as invalid and fail the whole save over it.
 */
export function buildCommit(
  proposal: DistillProposal,
  review: DistillReview,
): DistillCommit {
  const kept = <T extends { proposalId: string }>(items: T[]) =>
    items.filter((i) => !isDropped(review, i.proposalId))
  const lines = (items: ProposedLine[]) =>
    kept(items)
      .map((l) => ({ proposalId: l.proposalId, text: lineText(l, review) }))
      .filter((l) => l.text.trim() !== '')

  const g = proposal.guardrails
  const disclaimer = g.disclaimer
  const sendDisclaimer =
    disclaimer &&
    (disclaimerIsChoice(proposal)
      ? review.disclaimer === 'site'
      : !isDropped(review, disclaimer.proposalId))

  return {
    voices: kept(proposal.voices)
      .map((v) => {
        const draft = voiceDraft(v, review)
        return {
          proposalId: v.proposalId,
          name: draft.name.trim(),
          whenToUse: draft.whenToUse,
          isDefault: v.isDefault,
          samples: draft.samples.filter((s) => s.trim() !== ''),
          rules: v.rules,
          channelNotes: v.channelNotes ?? {},
        }
      })
      .filter((v) => v.name !== ''),
    audiences: kept(proposal.audiences)
      .map((a) => ({ proposalId: a.proposalId, ...audienceDraft(a, review) }))
      .filter((a) => a.name.trim() !== ''),
    guardrails: {
      mayClaim: lines(g.mayClaim),
      neverClaim: lines(g.neverClaim),
      bannedWords: lines(g.bannedWords),
      ...(sendDisclaimer && disclaimer
        ? {
            disclaimer: {
              proposalId: disclaimer.proposalId,
              text: lineText(disclaimer, review),
            },
          }
        : {}),
    },
    facts: kept(proposal.facts)
      .map((f) => ({
        proposalId: f.proposalId,
        source: f.source,
        ...factDraft(f, review),
      }))
      .filter((f) => f.statement.trim() !== ''),
  }
}

/** Whether a commit body would save anything at all. */
export function commitIsEmpty(commit: DistillCommit): boolean {
  const g = commit.guardrails
  return (
    commit.voices.length +
      commit.audiences.length +
      commit.facts.length +
      g.mayClaim.length +
      g.neverClaim.length +
      g.bannedWords.length ===
      0 && !g.disclaimer
  )
}

/** The evidence an item leads with — the one the server derives origin from. */
export function primaryEvidence(
  evidence: DistillEvidence[] | undefined,
): DistillEvidence | undefined {
  return evidence?.[0]
}
