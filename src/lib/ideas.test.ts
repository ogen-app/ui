import { describe, expect, it } from 'vitest'
import {
  countIdeas,
  decideIdea,
  decidedIdeas,
  hasWokenUp,
  isWaiting,
  newIdea,
  parseIdeas,
  postponeUntil,
  returnToInbox,
  triageQueue,
  waitingSince,
  type Idea,
} from './ideas'

const NOW = new Date('2026-09-17T09:00:00Z')

function idea(fields: Partial<Idea> & { id: string }): Idea {
  return {
    title: 'An idea',
    note: '',
    campaignId: null,
    verdict: null,
    createdAt: '2026-09-01T09:00:00Z',
    createdBy: null,
    decidedAt: null,
    decidedBy: null,
    remindAt: null,
    ...fields,
  }
}

describe('postponeUntil', () => {
  it('measures a horizon in whole days from now', () => {
    expect(postponeUntil(NOW, 'week')).toBe('2026-09-24T09:00:00.000Z')
    expect(postponeUntil(NOW, 'month')).toBe('2026-10-17T09:00:00.000Z')
    expect(postponeUntil(NOW, 'quarter')).toBe('2026-12-16T09:00:00.000Z')
  })
})

describe('waking up', () => {
  it('keeps a postponement asleep until its day', () => {
    const later = idea({
      id: 'a',
      verdict: 'later',
      remindAt: '2026-09-18T09:00:00Z',
    })
    expect(hasWokenUp(later, NOW)).toBe(false)
    expect(isWaiting(later, NOW)).toBe(false)
  })

  it('returns it to the inbox on the day, without changing what is stored', () => {
    const due = idea({
      id: 'a',
      verdict: 'later',
      remindAt: '2026-09-17T08:59:00Z',
    })
    expect(hasWokenUp(due, NOW)).toBe(true)
    expect(isWaiting(due, NOW)).toBe(true)
    // The record still says `later`. Waking is a reading of the date, never a
    // fourth stored state — which is what keeps it from needing a sweep.
    expect(due.verdict).toBe('later')
  })

  /*
   * Shouldn't happen — every postponement sets a date — but the store is
   * schemaless and an older build's row could be missing one. Staying in the
   * Later pile is the safe failure; the alternative reappears in the inbox on
   * every render and can never be got rid of.
   */
  it('never wakes a postponement that was given no date', () => {
    const undated = idea({ id: 'a', verdict: 'later', remindAt: null })
    expect(hasWokenUp(undated, NOW)).toBe(false)
    expect(isWaiting(undated, NOW)).toBe(false)
  })

  it('ignores a wake-up on any other verdict', () => {
    const archived = idea({
      id: 'a',
      verdict: 'no',
      remindAt: '2026-01-01T00:00:00Z',
    })
    expect(hasWokenUp(archived, NOW)).toBe(false)
  })
})

describe('triageQueue', () => {
  it('asks the longest-unanswered idea first', () => {
    const queue = triageQueue(
      [
        idea({ id: 'new', createdAt: '2026-09-16T09:00:00Z' }),
        idea({ id: 'old', createdAt: '2026-08-01T09:00:00Z' }),
      ],
      NOW,
    )
    expect(queue.map((i) => i.id)).toEqual(['old', 'new'])
  })

  it('leaves the decided out of it', () => {
    const queue = triageQueue(
      [
        idea({ id: 'yes', verdict: 'yes', decidedAt: '2026-09-02T09:00:00Z' }),
        idea({ id: 'no', verdict: 'no', decidedAt: '2026-09-02T09:00:00Z' }),
        idea({ id: 'open' }),
      ],
      NOW,
    )
    expect(queue.map((i) => i.id)).toEqual(['open'])
  })

  /*
   * A woken idea has been waiting since it woke, not since it was written. The
   * other order buries today's returning ideas under everything ever captured,
   * which is the failure a wake-up exists to prevent.
   */
  it('dates a woken postponement from the day it came back', () => {
    const woken = idea({
      id: 'woken',
      createdAt: '2026-01-01T09:00:00Z',
      verdict: 'later',
      remindAt: '2026-09-16T09:00:00Z',
    })
    expect(waitingSince(woken)).toBe('2026-09-16T09:00:00Z')
    const queue = triageQueue(
      [woken, idea({ id: 'older', createdAt: '2026-06-01T09:00:00Z' })],
      NOW,
    )
    expect(queue.map((i) => i.id)).toEqual(['older', 'woken'])
  })
})

describe('decideIdea', () => {
  it('records the verdict and when it was given', () => {
    const decided = decideIdea(idea({ id: 'a' }), 'yes', {
      at: NOW,
      by: 'usr_1',
    })
    expect(decided.verdict).toBe('yes')
    expect(decided.decidedAt).toBe(NOW.toISOString())
    expect(decided.decidedBy).toBe('usr_1')
  })

  it('carries the wake-up on a postponement', () => {
    const at = postponeUntil(NOW, 'month')
    const decided = decideIdea(idea({ id: 'a' }), 'later', {
      at: NOW,
      remindAt: at,
    })
    expect(decided.remindAt).toBe(at)
  })

  /*
   * The rule most easily left out and most expensive to get wrong: postpone to
   * next month, archive this afternoon, and a surviving wake-up pulls the idea
   * back out of the archive on a day nobody chose.
   */
  it('clears the wake-up when the verdict is not a postponement', () => {
    const postponed = decideIdea(idea({ id: 'a' }), 'later', {
      at: NOW,
      remindAt: postponeUntil(NOW, 'month'),
    })
    for (const verdict of ['yes', 'no'] as const) {
      expect(decideIdea(postponed, verdict, { at: NOW }).remindAt).toBeNull()
    }
  })
})

describe('returnToInbox', () => {
  it('takes the whole decision back, not just the verdict', () => {
    const decided = decideIdea(idea({ id: 'a' }), 'later', {
      at: NOW,
      by: 'usr_1',
      remindAt: postponeUntil(NOW, 'week'),
    })
    const back = returnToInbox(decided)
    expect(back).toMatchObject({
      verdict: null,
      decidedAt: null,
      decidedBy: null,
      remindAt: null,
    })
    expect(isWaiting(back, NOW)).toBe(true)
  })
})

describe('countIdeas', () => {
  it('counts every idea exactly once', () => {
    const ideas = [
      idea({ id: 'open' }),
      idea({ id: 'yes', verdict: 'yes' }),
      idea({ id: 'no', verdict: 'no' }),
      idea({
        id: 'asleep',
        verdict: 'later',
        remindAt: '2026-12-01T09:00:00Z',
      }),
      idea({
        id: 'woken',
        verdict: 'later',
        remindAt: '2026-09-01T09:00:00Z',
      }),
    ]
    const counts = countIdeas(ideas, NOW)
    // The woken one is waiting and is *not* also counted as later: the tabs are
    // navigation, and figures that do not sum to the list are a screen people
    // stop trusting.
    expect(counts).toEqual({ waiting: 2, yes: 1, later: 1, no: 1 })
    const total = counts.waiting + counts.yes + counts.later + counts.no
    expect(total).toBe(ideas.length)
  })
})

describe('decidedIdeas', () => {
  it('shows the most recent decision first', () => {
    const pile = decidedIdeas(
      [
        idea({ id: 'first', verdict: 'no', decidedAt: '2026-09-01T09:00:00Z' }),
        idea({ id: 'last', verdict: 'no', decidedAt: '2026-09-10T09:00:00Z' }),
      ],
      'no',
      NOW,
    )
    expect(pile.map((i) => i.id)).toEqual(['last', 'first'])
  })

  it('drops a postponement that has gone back to the inbox', () => {
    const pile = decidedIdeas(
      [
        idea({
          id: 'woken',
          verdict: 'later',
          remindAt: '2026-09-01T09:00:00Z',
        }),
        idea({
          id: 'asleep',
          verdict: 'later',
          remindAt: '2026-12-01T09:00:00Z',
        }),
      ],
      'later',
      NOW,
    )
    expect(pile.map((i) => i.id)).toEqual(['asleep'])
  })
})

describe('newIdea', () => {
  it('is a question and nothing else', () => {
    const captured = newIdea({ id: 'a', title: '  A teardown  ', at: NOW })
    expect(captured.title).toBe('A teardown')
    expect(captured.verdict).toBeNull()
    expect(captured.decidedAt).toBeNull()
    expect(isWaiting(captured, NOW)).toBe(true)
  })
})

describe('parseIdeas', () => {
  it('reads a stored list back', () => {
    expect(parseIdeas([idea({ id: 'a' })])).toHaveLength(1)
  })

  it('skips a malformed row rather than refusing the whole list', () => {
    const parsed = parseIdeas([
      idea({ id: 'good' }),
      { id: 'bad' },
      { nonsense: true },
      null,
    ])
    expect(parsed.map((i) => i.id)).toEqual(['good'])
  })

  it('fills in a note the row predates', () => {
    const { note, ...withoutNote } = idea({ id: 'a' })
    expect(note).toBe('')
    expect(parseIdeas([withoutNote])[0]?.note).toBe('')
  })

  it('refuses an unknown verdict', () => {
    expect(parseIdeas([{ ...idea({ id: 'a' }), verdict: 'maybe' }])).toEqual([])
  })

  it('has nothing to read when the store held something else', () => {
    expect(parseIdeas(null)).toEqual([])
    expect(parseIdeas({ ideas: [] })).toEqual([])
    expect(parseIdeas('[]')).toEqual([])
  })
})
