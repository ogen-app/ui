import { describe, expect, it } from 'vitest'
import type {
  DistillProposal,
  DistillRun,
  ProposedLine,
} from '@/types/brandDistill'
import {
  EMPTY_REVIEW,
  buildCommit,
  commitIsEmpty,
  currentStep,
  keptTally,
  pageKind,
  readSteps,
  resumableRun,
  toggleDropped,
  type DistillReview,
} from './brandDistill'

/**
 * The review of a brand read (CON-400): what is decided, and what that
 * commits as. What is pinned is what goes wrong silently — a dropped item
 * saved anyway, an edit lost on the way out, and above all the disclaimer,
 * the one thing a commit can replace.
 */

const line = (proposalId: string, text: string): ProposedLine => ({
  proposalId,
  text,
  evidence: [{ ref: 'a1#0', assetId: 'a1', label: '/about', quote: text }],
})

function proposal(overrides: Partial<DistillProposal> = {}): DistillProposal {
  return {
    voices: [
      {
        proposalId: 'v1',
        name: 'Warm, exacting',
        whenToUse: 'The coffee itself.',
        isDefault: true,
        thin: false,
        samples: [
          { text: 'We roast light.', evidence: { label: '/about' } },
          { text: 'Grind just before.', evidence: { label: '/journal' } },
          { text: 'There are 140 bags.', evidence: { label: '/journal' } },
        ],
        rules: {
          emoji: 'never',
          formality: 'neutral',
          person: 'we',
          length: 'medium',
          opening: '',
          closing: '',
        },
        channelNotes: {},
        evidence: [],
      },
    ],
    audiences: [
      {
        proposalId: 'a1',
        name: 'Home brewers',
        who: 'People who weigh their coffee.',
        readsOn: 'Instagram',
        scrollsPastWhen: 'It sounds like everyone else.',
        believesWhen: 'You name the farm.',
        evidence: [],
      },
    ],
    guardrails: {
      mayClaim: [line('g:mayClaim:1', 'Ships within 48 hours.')],
      neverClaim: [line('g:neverClaim:1', 'Health benefits.')],
      bannedWords: [line('g:bannedWords:1', 'artisanal')],
      disclaimer: {
        ...line('g:disclaimer', 'Prices include VAT; flavour notes vary.'),
        current: 'Prices include VAT.',
      },
    },
    facts: [
      {
        proposalId: 'f1',
        statement: 'Subscriptions start at £9.',
        subject: 'us',
        kind: 'documented',
        expiresAt: '2026-12-31',
        source: 'acme.com/pricing',
        evidence: [],
      },
    ],
    questions: [],
    coverage: {},
    dropped: { ungrounded: 0, duplicate: 0, limit: 0 },
    ...overrides,
  }
}

describe('buildCommit', () => {
  it('sends everything untouched — everything starts kept', () => {
    const body = buildCommit(proposal(), EMPTY_REVIEW)
    expect(body.voices.map((v) => v.proposalId)).toEqual(['v1'])
    expect(body.voices[0].samples).toHaveLength(3)
    expect(body.audiences.map((a) => a.proposalId)).toEqual(['a1'])
    expect(body.guardrails.mayClaim).toEqual([
      { proposalId: 'g:mayClaim:1', text: 'Ships within 48 hours.' },
    ])
    expect(body.facts[0]).toMatchObject({
      proposalId: 'f1',
      source: 'acme.com/pricing',
      expiresAt: '2026-12-31',
    })
  })

  it('leaves dropped items out, and puts them back on undo', () => {
    let review: DistillReview = EMPTY_REVIEW
    review = toggleDropped(review, 'a1')
    review = toggleDropped(review, 'g:bannedWords:1')
    const body = buildCommit(proposal(), review)
    expect(body.audiences).toEqual([])
    expect(body.guardrails.bannedWords).toEqual([])

    const undone = buildCommit(proposal(), toggleDropped(review, 'a1'))
    expect(undone.audiences).toHaveLength(1)
  })

  it('applies edits, and drops a line edited down to nothing', () => {
    const review: DistillReview = {
      ...EMPTY_REVIEW,
      voices: { v1: { name: 'Plainspoken' } },
      lines: { 'g:mayClaim:1': 'Ships within a day.', 'g:neverClaim:1': ' ' },
      facts: { f1: { kind: 'measured', expiresAt: null } },
    }
    const body = buildCommit(proposal(), review)
    expect(body.voices[0].name).toBe('Plainspoken')
    expect(body.guardrails.mayClaim[0].text).toBe('Ships within a day.')
    expect(body.guardrails.neverClaim).toEqual([])
    expect(body.facts[0]).toMatchObject({ kind: 'measured', expiresAt: null })
  })

  it('keeps your disclaimer unless the site’s is explicitly picked', () => {
    expect(
      buildCommit(proposal(), EMPTY_REVIEW).guardrails.disclaimer,
    ).toBeUndefined()
    expect(
      buildCommit(proposal(), { ...EMPTY_REVIEW, disclaimer: 'site' })
        .guardrails.disclaimer,
    ).toEqual({
      proposalId: 'g:disclaimer',
      text: 'Prices include VAT; flavour notes vary.',
    })
  })

  it('sends the site’s disclaimer when there is none of yours, unless dropped', () => {
    const p = proposal()
    p.guardrails.disclaimer = { ...p.guardrails.disclaimer!, current: null }
    expect(buildCommit(p, EMPTY_REVIEW).guardrails.disclaimer?.proposalId).toBe(
      'g:disclaimer',
    )
    expect(
      buildCommit(p, toggleDropped(EMPTY_REVIEW, 'g:disclaimer')).guardrails
        .disclaimer,
    ).toBeUndefined()
  })
})

describe('keptTally', () => {
  it('counts every keep-or-drop decision, not the disclaimer choice', () => {
    expect(keptTally(proposal(), EMPTY_REVIEW)).toEqual({ kept: 6, total: 6 })
    expect(keptTally(proposal(), toggleDropped(EMPTY_REVIEW, 'f1'))).toEqual({
      kept: 5,
      total: 6,
    })
  })
})

describe('commitIsEmpty', () => {
  it('is true only when nothing at all would be saved', () => {
    const all = [
      'v1',
      'a1',
      'g:mayClaim:1',
      'g:neverClaim:1',
      'g:bannedWords:1',
      'f1',
    ]
    const review = all.reduce(toggleDropped, EMPTY_REVIEW)
    expect(commitIsEmpty(buildCommit(proposal(), review))).toBe(true)
    expect(
      commitIsEmpty(buildCommit(proposal(), { ...review, disclaimer: 'site' })),
    ).toBe(false)
  })
})

describe('pageKind', () => {
  it('names a page by its path, the way the server chose it', () => {
    expect(pageKind('https://acme.com/')).toBe('home')
    expect(pageKind('https://acme.com/about/our-story')).toBe('about')
    expect(pageKind('https://acme.com/coffee/subscriptions')).toBeNull()
    expect(pageKind('https://acme.com/pricing')).toBe('pricing')
    expect(pageKind('https://acme.com/terms-of-sale')).toBe('legal')
    expect(pageKind('https://acme.com/journal/why-we-roast-light')).toBe(
      'article',
    )
  })
})

function run(overrides: Partial<DistillRun>): DistillRun {
  return {
    id: 'r1',
    status: 'collecting',
    parentRunId: null,
    childRunId: null,
    website: null,
    sources: [],
    answers: [],
    proposal: null,
    failure: null,
    createdBy: null,
    createdAt: '2026-10-22T10:00:00Z',
    updatedAt: '2026-10-22T10:00:00Z',
    finishedAt: null,
    committedAt: null,
    ...overrides,
  }
}

describe('the steps a run is shown as', () => {
  const website = { url: 'https://acme.com', mapped: true, pagesFound: 84 }
  const source = {
    assetId: 'a',
    title: 'About',
    type: 'URL',
    role: 'website' as const,
    status: 'pending' as const,
    truncated: false,
  }

  it('finds the pages before it has any, then reads them', () => {
    expect(currentStep(run({ website }))).toBe('finding')
    expect(currentStep(run({ website, sources: [source] }))).toBe('reading')
    expect(currentStep(run({ website, status: 'composing' }))).toBe('drafting')
  })

  it('skips the reading steps for answers alone', () => {
    const answers = run({
      status: 'pending',
      answers: [{ questionId: 'q_offer', question: 'q', answer: 'a' }],
    })
    expect(readSteps(answers)).toEqual(['drafting', 'checking'])
    expect(currentStep(answers)).toBe('drafting')
  })
})

describe('resumableRun', () => {
  it('is the newest run still working or waiting to be reviewed', () => {
    expect(
      resumableRun([
        run({ id: 'a', status: 'committed' }),
        run({ id: 'b', status: 'ready' }),
      ])?.id,
    ).toBe('b')
    expect(resumableRun([run({ status: 'discarded' })])).toBeUndefined()
  })
})
