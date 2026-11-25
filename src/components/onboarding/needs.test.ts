import { describe, expect, it } from 'vitest'
import { needsAdded, needsFrom, verdictOf } from './needs'

/**
 * The sheet's needs (CON-525): the read's coverage, section by section, and
 * the accounts. What is pinned is that "what sets them apart" is the
 * positioning section's own verdict, and that a source says only what it
 * added.
 */

const levels = (needs: ReturnType<typeof needsFrom>) =>
  Object.fromEntries(needs.map((n) => [n.id, n.level]))

describe('needsFrom', () => {
  it('reads every need off the coverage, and the accounts off the count', () => {
    const needs = needsFrom({
      coverage: {
        positioning: { level: 'found', note: '' },
        voices: { level: 'thin', note: '' },
        audiences: { level: 'none', note: '' },
        facts: { level: 'found', note: '' },
      },
      connected: 2,
    })
    expect(levels(needs)).toEqual({
      apart: 'enough',
      voice: 'thin',
      audience: 'missing',
      onlyThey: 'enough',
      never: 'missing',
      channels: 'enough',
    })
  })

  it('is all missing before anything is read', () => {
    const needs = needsFrom({ coverage: undefined, connected: 0 })
    expect(needs.every((n) => n.level === 'missing')).toBe(true)
    expect(verdictOf(needs)).toBe('none')
  })
})

describe('needsAdded', () => {
  it('names what one source went towards, in the sheet’s order', () => {
    expect(
      needsAdded({
        guardrails: { level: 'thin', note: '' },
        voices: { level: 'found', note: '' },
        positioning: { level: 'thin', note: '' },
        facts: { level: 'none', note: '' },
      }),
    ).toEqual(['apart', 'voice', 'never'])
    expect(needsAdded({})).toEqual([])
  })
})
