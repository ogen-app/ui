import { describe, expect, it } from 'vitest'
import {
  DUE_WITHIN_DAYS,
  countBySubject,
  daysBetween,
  emptyFact,
  factStatus,
  factTally,
  todayISO,
  type BrandFact,
} from './facts'

const TODAY = '2026-09-08'

function fact(over: Partial<BrandFact> = {}): BrandFact {
  return {
    id: 'f1',
    statement: 'Setup takes two weeks.',
    subject: 'us',
    kind: 'documented',
    source: '',
    addedAt: TODAY,
    checkedAt: TODAY,
    expiresAt: '',
    ...over,
  }
}

describe('factStatus', () => {
  // The state the column exists for: a statement the app is still repeating
  // in a confident voice after the date it stopped being true.
  it('reads a past date as expired', () => {
    expect(factStatus(fact({ expiresAt: '2026-09-07' }), TODAY)).toBe('expired')
  })

  it('reads today as still current — it expires at the end of it', () => {
    expect(factStatus(fact({ expiresAt: TODAY }), TODAY)).toBe('due')
  })

  it('warns inside the window and stays quiet outside it', () => {
    expect(factStatus(fact({ expiresAt: '2026-10-08' }), TODAY)).toBe('due')
    expect(factStatus(fact({ expiresAt: '2026-10-09' }), TODAY)).toBe('current')
  })

  // Not a gap in the record: some facts do not go off, and drawing that as a
  // missing field would be the table asking for something that does not exist.
  it('treats no expiry as current', () => {
    expect(factStatus(fact({ expiresAt: '' }), TODAY)).toBe('current')
  })
})

describe('daysBetween', () => {
  it('counts whole days, signed', () => {
    expect(daysBetween(TODAY, '2026-09-09')).toBe(1)
    expect(daysBetween(TODAY, '2026-09-07')).toBe(-1)
    expect(daysBetween(TODAY, TODAY)).toBe(0)
  })

  // The window is read off this, so a month has to cross a month boundary.
  it('crosses months and years', () => {
    expect(daysBetween('2026-12-25', '2027-01-01')).toBe(7)
    expect(daysBetween(TODAY, '2026-10-08')).toBe(DUE_WITHIN_DAYS)
  })
})

describe('factTally', () => {
  it('counts what cannot be repeated and what is about to stop being so', () => {
    expect(
      factTally(
        [
          fact({ id: 'a', expiresAt: '' }),
          fact({ id: 'b', expiresAt: '2026-01-01' }),
          fact({ id: 'c', expiresAt: '2026-09-20' }),
          fact({ id: 'd', expiresAt: '2027-09-20' }),
        ],
        TODAY,
      ),
    ).toEqual({ total: 4, due: 1, expired: 1 })
  })

  it('answers zero for an empty ledger', () => {
    expect(factTally([], TODAY)).toEqual({ total: 0, due: 0, expired: 0 })
  })
})

describe('todayISO', () => {
  // Local time, not UTC: the dates in this table are typed by a person against
  // a calendar, and a workspace west of UTC would otherwise stamp yesterday
  // all evening.
  it('writes the local date, zero-padded', () => {
    expect(todayISO(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05')
  })
})

describe('countBySubject', () => {
  // The tabs and the Overview's three lines read from this, so it has to count
  // the axis and not the kind: a problem somebody measured is still a problem.
  it('counts the axis, not the kind', () => {
    const ledger = [
      fact({ id: 'a', subject: 'us', kind: 'measured' }),
      fact({ id: 'b', subject: 'problem', kind: 'measured' }),
      fact({ id: 'c', subject: 'problem', kind: 'judgement' }),
    ]
    expect(countBySubject(ledger, 'us')).toBe(1)
    expect(countBySubject(ledger, 'problem')).toBe(2)
    expect(countBySubject(ledger, 'opportunity')).toBe(0)
  })
})

describe('emptyFact', () => {
  // The add button is pressed underneath a tab, and a blank row that lands in
  // a different ledger from the one it was added in is the tab lying.
  it('is added into the ledger it was asked for', () => {
    expect(emptyFact('new-0', TODAY, 'opportunity').subject).toBe('opportunity')
    expect(emptyFact('new-0', TODAY).subject).toBe('us')
  })

  // An opening is an absence: there is no system holding it and nothing to
  // count, so `measured` was wrong on nearly every row somebody would write.
  it('opens on the kind its subject usually is', () => {
    expect(emptyFact('new-0', TODAY, 'opportunity').kind).toBe('judgement')
    expect(emptyFact('new-0', TODAY, 'problem').kind).toBe('measured')
    expect(emptyFact('new-0', TODAY).kind).toBe('measured')
  })
})
