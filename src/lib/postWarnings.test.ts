import { describe, expect, it } from 'vitest'
import type { PublishingAccountResolution } from '@/lib/publishingAccount'
import { postWarnings, worstWarning } from './postWarnings'

const acme = {
  id: 'a1',
  username: 'acme',
  display_name: 'Acme',
  avatar_url: '',
  is_active: true,
  connected_at: '2026-01-01T00:00:00Z',
}
const one: PublishingAccountResolution = {
  accounts: [acme],
  account: acme,
  ambiguous: false,
  mismatched: false,
}
const none: PublishingAccountResolution = {
  accounts: [],
  account: null,
  ambiguous: false,
  mismatched: false,
}

const draft = {
  status: 'draft' as const,
  platform_id: 'li',
  platform_post_type: 'text',
  grounding_mode: null,
}

const kinds = (...args: Parameters<typeof postWarnings>) =>
  postWarnings(...args).map((w) => w.kind)

describe('postWarnings', () => {
  it('says nothing about a draft that can go out', () => {
    expect(
      kinds(draft, { targets: [{ id: 'li', post_types: [] }], account: one }),
    ).toEqual([])
  })

  it('flags a failed and a missed publish', () => {
    expect(
      kinds(
        { ...draft, status: 'failed' },
        { targets: undefined, account: one },
      ),
    ).toEqual(['failed'])
    expect(
      kinds(
        { ...draft, status: 'not_published' },
        { targets: undefined, account: none },
      ),
    ).toEqual(['missed'])
  })

  it('asks for a platform before an account', () => {
    expect(
      kinds(
        { ...draft, platform_id: '' },
        { targets: undefined, account: null },
      ),
    ).toEqual(['noPlatform'])
  })

  it('names the account gap, but not while the platform list is loading', () => {
    expect(kinds(draft, { targets: undefined, account: none })).toEqual([
      'noAccount',
    ])
    expect(
      kinds(draft, {
        targets: undefined,
        account: { ...one, mismatched: true },
      }),
    ).toEqual(['accountGone'])
    expect(kinds(draft, { targets: undefined, account: null })).toEqual([])
  })

  it('leaves a published post alone about its channel', () => {
    expect(
      kinds(
        { ...draft, status: 'published', platform_id: '' },
        { targets: undefined, account: null },
      ),
    ).toEqual([])
  })

  it('flags a post outside its campaign, and one written without sources', () => {
    expect(
      kinds(
        { ...draft, grounding_mode: 'exploratory' },
        { targets: [{ id: 'x', post_types: [] }], account: one },
      ),
    ).toEqual(['outsidePlatform', 'notGrounded'])
  })
})

describe('worstWarning', () => {
  it('ranks blocking over warning over notice', () => {
    expect(worstWarning([])).toBeNull()
    expect(
      worstWarning([
        { kind: 'notGrounded', level: 'notice' },
        { kind: 'outsidePlatform', level: 'warning' },
      ]),
    ).toBe('warning')
    expect(
      worstWarning([
        { kind: 'outsidePlatform', level: 'warning' },
        { kind: 'failed', level: 'blocking' },
      ]),
    ).toBe('blocking')
  })
})
