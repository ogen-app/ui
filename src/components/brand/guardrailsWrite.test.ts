import { describe, expect, it } from 'vitest'
import { assemble, comparable, statement } from './guardrailsWrite'
import type { BrandGuardrails } from './types'

/**
 * The one write on the guardrails screen that can destroy another section
 * (CON-316): `facts` is presence-aware on the `PUT`, and `[]` deletes the
 * whole ledger. With the ledger on, the key must be absent — not empty.
 */

const STORED: BrandGuardrails = {
  facts: ['Founded in 2019.'],
  mayClaim: ['Licensed in the EU.'],
  neverClaim: [],
  bannedWords: [],
  disclaimer: '',
  updatedAt: '2026-09-01T00:00:00Z',
}

const DRAFT = {
  facts: ['Founded in 2019.'],
  mayClaim: ['Licensed in the EU and the UK.', '  '],
  neverClaim: [],
  bannedWords: [],
  disclaimer: '',
}

describe('assemble', () => {
  it('leaves facts out entirely while the ledger is on', () => {
    const written = assemble(DRAFT, true)
    expect(written).not.toHaveProperty('facts')
    expect(written.mayClaim).toEqual(['Licensed in the EU and the UK.'])
  })

  it('still sends the statement list with the ledger off', () => {
    expect(assemble(DRAFT, false).facts).toEqual(['Founded in 2019.'])
  })
})

describe('comparable', () => {
  // A teammate adding a fact moves the projection under an open screen; that
  // must not read as an unsaved change to the rules.
  it('ignores the ledger projection while the ledger is on', () => {
    const moved = { ...STORED, facts: [...STORED.facts, 'A second fact.'] }
    expect(statement(comparable(moved, true))).toEqual(
      statement(comparable(STORED, true)),
    )
  })

  it('keeps the statements in the comparison with the ledger off', () => {
    const moved = { ...STORED, facts: [...STORED.facts, 'A second fact.'] }
    expect(statement(comparable(moved, false))).not.toEqual(
      statement(comparable(STORED, false)),
    )
  })

  // Rules empty, facts on the ledger: blank, so the editor blocks the save
  // rather than sending the all-empty body the server answers 422 to.
  it('reads rules-only emptiness as blank while the ledger is on', () => {
    const empty = assemble(
      { ...DRAFT, mayClaim: [], facts: ['Founded in 2019.'] },
      true,
    )
    expect(statement(empty)).toEqual(statement(null))
  })
})
