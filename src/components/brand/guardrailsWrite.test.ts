import { describe, expect, it } from 'vitest'
import { assemble, comparable, statement } from './guardrailsWrite'
import type { BrandGuardrails } from './types'

/**
 * The one write on the guardrails screen that can destroy another section
 * (CON-316): `facts` is presence-aware on the `PUT`, and `[]` deletes the
 * whole ledger. So the key must be absent — not empty.
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
  mayClaim: ['Licensed in the EU and the UK.', '  '],
  neverClaim: [],
  bannedWords: [],
  disclaimer: '',
}

describe('assemble', () => {
  it('leaves facts out entirely', () => {
    const written = assemble(DRAFT)
    expect(written).not.toHaveProperty('facts')
    expect(written.mayClaim).toEqual(['Licensed in the EU and the UK.'])
  })
})

describe('comparable', () => {
  // A teammate adding a fact moves the projection under an open screen; that
  // must not read as an unsaved change to the rules.
  it('ignores the ledger projection', () => {
    const moved = { ...STORED, facts: [...STORED.facts, 'A second fact.'] }
    expect(comparable(moved)).not.toHaveProperty('facts')
    expect(statement(comparable(moved))).toEqual(statement(comparable(STORED)))
  })

  // Rules empty, facts on the ledger: blank, so the editor blocks the save
  // rather than sending the all-empty body the server answers 422 to.
  it('reads rules-only emptiness as blank', () => {
    const empty = assemble({ ...DRAFT, mayClaim: [] })
    expect(statement(empty)).toEqual(statement(null))
  })
})
