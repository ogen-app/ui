import { describe, expect, it } from 'vitest'
import { accountLabel, resolvePublishingAccount } from './publishingAccount.ts'
import type { PublisherAccount } from '@/types/campaigns'

function account(overrides: Partial<PublisherAccount> = {}): PublisherAccount {
  return {
    id: 'acc-1',
    username: 'acme-corp',
    display_name: 'Acme Corp',
    avatar_url: '',
    is_active: true,
    connected_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const ONE = [account()]
const TWO = [
  account(),
  account({ id: 'acc-2', username: 'acme-labs', display_name: 'Acme Labs' }),
]

// The case names mirror TestCheckAccountSelection in
// src/post_actions/schedule/account_gate_test.go — this is the same rule set
// on the other side of the wire, and the parity is the point.
describe('resolvePublishingAccount', () => {
  it('requires a choice when the platform has two accounts and none is named', () => {
    const r = resolvePublishingAccount(TWO, '')
    expect(r.ambiguous).toBe(true)
    expect(r.account).toBeNull()
    expect(r.accounts).toHaveLength(2)
  })

  it('accepts an explicit valid choice', () => {
    const r = resolvePublishingAccount(TWO, 'acc-2')
    expect(r.account?.id).toBe('acc-2')
    expect(r.ambiguous).toBe(false)
    expect(r.mismatched).toBe(false)
  })

  it('flags a choice that is not among the connected accounts', () => {
    // Covers both server reasons at once: account_unavailable (disconnected)
    // and account_platform_mismatch (left behind by a platform change). The
    // client cannot tell them apart and the fix is the same either way.
    const r = resolvePublishingAccount(TWO, 'ghost')
    expect(r.mismatched).toBe(true)
    expect(r.account).toBeNull()
  })

  it('names a disconnected choice from the hydrated relation, still mismatched', () => {
    const gone = account({ id: 'acc-gone', display_name: 'Retired Page' })
    const r = resolvePublishingAccount(TWO, 'acc-gone', gone)
    expect(r.account?.display_name).toBe('Retired Page')
    // Naming it is not rescuing it — a disconnected account cannot publish.
    expect(r.mismatched).toBe(true)
  })

  it('ignores a hydrated account that is not the one named', () => {
    const other = account({ id: 'acc-other' })
    const r = resolvePublishingAccount(TWO, 'ghost', other)
    expect(r.account).toBeNull()
    expect(r.mismatched).toBe(true)
  })

  it('resolves a single account with no choice made', () => {
    // The submit worker auto-selects it, so the UI must not ask.
    const r = resolvePublishingAccount(ONE, '')
    expect(r.account?.id).toBe('acc-1')
    expect(r.ambiguous).toBe(false)
  })

  it('is not ambiguous with nothing connected', () => {
    // Nothing to choose between. The server fails this later as
    // no_account_connected, which is a different message in a different place.
    const r = resolvePublishingAccount([], '')
    expect(r.account).toBeNull()
    expect(r.ambiguous).toBe(false)
    expect(r.mismatched).toBe(false)
  })
})

describe('accountLabel', () => {
  it('prefers the display name', () => {
    expect(accountLabel(account())).toBe('Acme Corp')
  })

  it('falls back to the handle when there is no display name', () => {
    expect(accountLabel(account({ display_name: '' }))).toBe('acme-corp')
  })
})
