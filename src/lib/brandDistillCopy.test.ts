import { describe, expect, it } from 'vitest'
import { i18next } from '@/i18n'
import { evidenceLabel, questionText, savedSentence } from './brandDistillCopy'

const t = i18next.t.bind(i18next)

describe('evidenceLabel', () => {
  it('names the question an answer was given to', () => {
    expect(
      evidenceLabel(t, { kind: 'answer', questionId: 'q_not_for' }, [
        {
          questionId: 'q_not_for',
          question: 'Who are you not for?',
          answer: 'x',
        },
      ]),
    ).toBe('your answer to “who are you not for”')
  })

  it('reads a passage by its page or file', () => {
    expect(evidenceLabel(t, { label: 'Brand book.pdf · Page 12' }, [])).toBe(
      'Brand book.pdf · Page 12',
    )
  })
})

describe('questionText', () => {
  it('words a starter by its id, and keeps a stranger’s own words', () => {
    expect(
      questionText(t, { id: 'q_proof', text: 'server', section: 'facts' }),
    ).toBe('What can you prove?')
    expect(
      questionText(t, { id: 'r0_q1', text: 'How long?', section: 'voices' }),
    ).toBe('How long?')
  })
})

describe('savedSentence', () => {
  it('says what the commit saved, from where, and what it declined', () => {
    expect(
      savedSentence(
        t,
        {
          runId: 'r1',
          source: { route: 'website', label: 'acme-roasters.com' },
          result: {
            applied: {
              voices: [{ proposalId: 'v1', id: '1' }],
              audiences: [{ proposalId: 'a1', id: '2' }],
              guardrails: ['g:mayClaim:1', 'g:neverClaim:1', 'g:bannedWords:1'],
              facts: [{ proposalId: 'f1', id: '3' }],
            },
            skipped: [
              { proposalId: 'f2', reason: 'duplicate' },
              { proposalId: 'f3', reason: 'duplicate' },
            ],
          },
        },
        'en',
      ),
    ).toBe(
      '1 voice, 1 audience, 2 guardrail lines, 1 banned word, and 1 fact, read off acme-roasters.com. 2 facts were already in your ledger, so they were left as they were.',
    )
  })
})
