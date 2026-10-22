import type { FactKind, FactSubject } from '@/components/brand/facts'
import type { VoiceRules } from '@/components/brand/types'

/**
 * A brand distillation run on the wire — `/api/brand/distills` (CON-399 §7).
 *
 * A run reads a website, some assets and/or answers and **proposes** voices,
 * audiences, guardrail lines and facts. Nothing in a proposal is brand
 * material until it is committed; until then it is the server's draft and this
 * client's review of it.
 *
 * camelCase, like the rest of `/api/brand`.
 */
export type DistillStatus =
  | 'pending'
  | 'collecting'
  | 'reading'
  | 'composing'
  | 'ready'
  | 'committed'
  | 'superseded'
  | 'discarded'
  | 'expired'
  | 'failed'

/**
 * Where one source of a run is. `thin` is a website page that came back with
 * too little text to read (under 200 words) — not a failure, a finding.
 */
export type DistillSourceStatus =
  | 'pending'
  | 'ready'
  | 'partial'
  | 'failed'
  | 'timed_out'
  | 'skipped_quota'
  | 'thin'

export type DistillSource = {
  assetId: string
  title: string
  /** The asset type — `URL`, `PDF`, `DOC`, `MD`, `IMG`, `AUDIO`. */
  type: string
  /** Imported by the website read, or chosen by the user. */
  role: 'website' | 'asset'
  status: DistillSourceStatus
  /** A website page's address. */
  url?: string
  /** The run's read cap stopped part-way through this one. */
  truncated: boolean
}

export type DistillWebsite = {
  url: string
  /** False when the site map failed and only the homepage was read. */
  mapped: boolean
  pagesFound: number
}

export type DistillAnswer = {
  questionId: string
  /** The question as it was shown — the model reads this, not the id. */
  question: string
  answer: string
}

/**
 * Where an item came from: a passage quoted word for word, or an answer.
 * `quote` is what the server checked against the source; `label` names the
 * page or the file and the place in it ("Brand book.pdf · Page 12").
 */
export type DistillEvidence = {
  kind?: 'answer'
  questionId?: string
  ref?: string
  assetId?: string
  label?: string
  quote?: string
}

export type ProposedSample = { text: string; evidence: DistillEvidence }

export type ProposedVoice = {
  proposalId: string
  name: string
  whenToUse: string
  isDefault: boolean
  /** Fewer than three samples held up against the source. Kept, not blocked. */
  thin: boolean
  samples: ProposedSample[]
  rules: VoiceRules
  channelNotes: Record<string, string>
  evidence: DistillEvidence[]
}

export type ProposedAudience = {
  proposalId: string
  name: string
  who: string
  readsOn: string
  scrollsPastWhen: string
  believesWhen: string
  evidence: DistillEvidence[]
}

export type ProposedLine = {
  proposalId: string
  text: string
  evidence: DistillEvidence[]
}

export type ProposedDisclaimer = ProposedLine & {
  /** The workspace's own disclaimer, null when it has none. */
  current: string | null
}

export type ProposedFact = {
  proposalId: string
  statement: string
  subject: FactSubject
  kind: FactKind
  /** `YYYY-MM-DD`, only when the source dates the claim. */
  expiresAt: string | null
  source: string
  evidence: DistillEvidence[]
}

export type DistillSection = 'voices' | 'audiences' | 'guardrails' | 'facts'

export type DistillQuestion = {
  id: string
  /** The server's English; the client words a starter question by its id. */
  text: string
  section: DistillSection
  /** Why it is asked — only on a gap question. */
  why?: string
}

export type DistillProposal = {
  voices: ProposedVoice[]
  audiences: ProposedAudience[]
  guardrails: {
    mayClaim: ProposedLine[]
    neverClaim: ProposedLine[]
    bannedWords: ProposedLine[]
    disclaimer: ProposedDisclaimer | null
  }
  facts: ProposedFact[]
  questions: DistillQuestion[]
  coverage: Partial<
    Record<DistillSection, { level: 'found' | 'thin' | 'none'; note: string }>
  >
  /** What was left out, by reason — counted, never listed. */
  dropped: { ungrounded: number; duplicate: number; limit: number }
}

export type DistillFailureCode =
  | 'no_usable_sources'
  | 'scraping_unavailable'
  | 'model_refused'
  | 'invalid_output'
  | 'internal'
  | 'tenant_inactive'
  | 'entitlement_disabled'
  | 'limit_reached'

export type DistillRun = {
  id: string
  status: DistillStatus
  parentRunId: string | null
  childRunId: string | null
  website: DistillWebsite | null
  sources: DistillSource[]
  answers: DistillAnswer[]
  /** Null until the run is ready, and always on the list read. */
  proposal: DistillProposal | null
  failure: { code: DistillFailureCode | string; reason: string } | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
  finishedAt: string | null
  committedAt: string | null
}

/** What to read: at least one of the three. */
export type DistillRequest = {
  websiteUrl?: string
  assetIds?: string[]
  answers?: DistillAnswer[]
}

export type CommitLine = { proposalId: string; text: string }

/** The kept items, edits included. Anything left out is not saved. */
export type DistillCommit = {
  voices: {
    proposalId: string
    name: string
    whenToUse: string
    isDefault: boolean
    samples: string[]
    rules: VoiceRules
    channelNotes: Record<string, string>
  }[]
  audiences: Omit<ProposedAudience, 'evidence'>[]
  guardrails: {
    mayClaim: CommitLine[]
    neverClaim: CommitLine[]
    bannedWords: CommitLine[]
    /** Sent only when the site's disclaimer was picked over the workspace's. */
    disclaimer?: CommitLine
  }
  facts: Omit<ProposedFact, 'evidence'>[]
}

export type DistillSkipReason = 'duplicate' | 'limit' | string

export type DistillCommitResult = {
  applied: {
    voices: { proposalId: string; id: string }[]
    audiences: { proposalId: string; id: string }[]
    guardrails: string[]
    facts: { proposalId: string; id: string }[]
  }
  skipped: { proposalId: string; reason: DistillSkipReason }[]
}
