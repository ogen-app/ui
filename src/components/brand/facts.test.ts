import { describe, expect, it } from 'vitest'
import {
  DUE_WITHIN_DAYS,
  countBySubject,
  daysBetween,
  emptyFact,
  expiryDistance,
  factMatches,
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

describe('factMatches', () => {
  const row = fact({
    statement: 'Half of family offices still reconcile in spreadsheets.',
    source: 'Wealth Briefing survey, 2026',
  })

  it('matches nothing away — an empty box is not a filter', () => {
    expect(factMatches(row, '')).toBe(true)
    expect(factMatches(row, '   ')).toBe(true)
  })

  it('reads the statement and the source, whatever the case', () => {
    expect(factMatches(row, 'SPREADSHEETS')).toBe(true)
    expect(factMatches(row, 'wealth briefing')).toBe(true)
  })

  // Nobody types a search expecting the word order to be the part that
  // matters, and a single substring match makes it the part that matters.
  it('takes the words in any order, across both fields', () => {
    expect(factMatches(row, 'family spreadsheets')).toBe(true)
    expect(factMatches(row, 'spreadsheets survey')).toBe(true)
  })

  it('needs every word', () => {
    expect(factMatches(row, 'family transcripts')).toBe(false)
  })

  // The kind and the subject are a column and a tab. A query aimed at a
  // sentence about a problem must not return every problem on file.
  it('does not read the axes the table already filters on', () => {
    expect(factMatches(fact({ subject: 'problem' }), 'problem')).toBe(false)
    expect(factMatches(fact({ kind: 'judgement' }), 'judgement')).toBe(false)
  })
})

describe('expiryDistance', () => {
  it('counts days while days are the honest unit', () => {
    expect(expiryDistance(12)).toEqual({ value: 12, unit: 'day' })
    expect(expiryDistance(59)).toEqual({ value: 59, unit: 'day' })
  })

  // The threshold is two months rather than one: everything from six weeks up
  // would otherwise round to "next month", which says less than the day count
  // it replaced.
  it('switches to months only once a month count can say two', () => {
    expect(expiryDistance(60)).toEqual({ value: 2, unit: 'month' })
    expect(expiryDistance(300)).toEqual({ value: 10, unit: 'month' })
  })

  it('counts years past two of them, rather than reading out 47 months', () => {
    expect(expiryDistance(800)).toEqual({ value: 2, unit: 'year' })
    expect(expiryDistance(1461)).toEqual({ value: 4, unit: 'year' })
  })

  // Signed, because the column's loudest row is a fact already being repeated
  // past its date — and `Intl.RelativeTimeFormat` reads the sign, not a flag.
  it('keeps the sign, so an expired fact reads as the past', () => {
    expect(expiryDistance(-3)).toEqual({ value: -3, unit: 'day' })
    expect(expiryDistance(-200)).toEqual({ value: -7, unit: 'month' })
  })

  it('reads today as zero days — the day it goes off, not a month either way', () => {
    expect(expiryDistance(0)).toEqual({ value: 0, unit: 'day' })
  })
})
