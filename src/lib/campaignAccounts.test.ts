import { describe, expect, it } from 'vitest'

import {
  PLACEHOLDER_ACCOUNT_ID,
  accountRows,
  activateTarget,
  deactivateTarget,
  deriveTargetPlatforms,
  parseAccountTargets,
  seedAccountTargets,
  togglePostType,
  type CampaignAccountTarget,
} from './campaignAccounts.ts'
import {
  buildPlatformView,
  getPlatformByZernioId,
  type PlatformView,
} from './platformDictionary.ts'
import { makePlatform } from './platformFixtures.ts'
import type { PublisherAccount } from '@/types/campaigns'

const FACEBOOK = 'facebook'
const LINKEDIN = 'linkedin'
const INSTAGRAM = 'instagram'

function account(id: string, username: string): PublisherAccount {
  return {
    id,
    username,
    display_name: username,
    avatar_url: '',
    is_active: true,
    connected_at: '2026-07-01T00:00:00Z',
  }
}

/**
 * A platform view carrying `accounts` behind one connected publisher.
 *
 * The slug doubles as the row's sqid here. Nothing in this file resolves one
 * into the other — the views are handed to `accountRows` already joined — so a
 * second identifier would only be a second thing to keep in step.
 */
function view(zernioId: string, accounts: PublisherAccount[]): PlatformView {
  const info = getPlatformByZernioId(zernioId)!
  const platform = makePlatform({
    id: zernioId,
    zernio_id: zernioId,
    name: info.name,
    publishers: [
      {
        id: 'zernio',
        name: 'Zernio',
        state: 'ready',
        // The server sets `connected` from `len(accounts) > 0`.
        connected: accounts.length > 0,
        supported_post_types: info.postTypes.map((pt) => pt.slug),
        accounts,
      },
    ],
  })
  return buildPlatformView(platform, info)
}

describe('seedAccountTargets', () => {
  it('turns every targeted platform into a placeholder rather than guessing an account', () => {
    expect(
      seedAccountTargets([{ id: FACEBOOK, post_types: ['reel', 'story'] }]),
    ).toEqual([
      {
        platform_id: FACEBOOK,
        account_id: PLACEHOLDER_ACCOUNT_ID,
        post_types: ['reel', 'story'],
      },
    ])
  })
})

describe('parseAccountTargets', () => {
  it('falls back to null so the caller seeds from the campaign', () => {
    expect(parseAccountTargets(null)).toBeNull()
    expect(parseAccountTargets('')).toBeNull()
    expect(parseAccountTargets('{ not json')).toBeNull()
    expect(parseAccountTargets('{"a":1}')).toBeNull()
  })

  it('reads a stored list back and drops entries with no platform', () => {
    const raw = JSON.stringify([
      { platform_id: FACEBOOK, account_id: 'a1', post_types: ['reel'] },
      { account_id: 'a2', post_types: ['story'] },
    ])
    expect(parseAccountTargets(raw)).toEqual([
      { platform_id: FACEBOOK, account_id: 'a1', post_types: ['reel'] },
    ])
  })

  it('treats a missing account id as the placeholder kind', () => {
    expect(
      parseAccountTargets(JSON.stringify([{ platform_id: FACEBOOK }])),
    ).toEqual([
      {
        platform_id: FACEBOOK,
        account_id: PLACEHOLDER_ACCOUNT_ID,
        post_types: [],
      },
    ])
  })
})

describe('activateTarget', () => {
  it('adds an account with every allowed post type switched on', () => {
    const next = activateTarget([], FACEBOOK, 'a1', ['reel', 'story'])
    expect(next).toEqual([
      {
        platform_id: FACEBOOK,
        account_id: 'a1',
        post_types: ['reel', 'story'],
      },
    ])
  })

  it('lets two accounts on one platform be targeted at once', () => {
    const next = activateTarget(
      activateTarget([], FACEBOOK, 'a1', ['reel']),
      FACEBOOK,
      'a2',
      ['story'],
    )
    expect(next.map((t) => t.account_id)).toEqual(['a1', 'a2'])
  })

  it('is a no-op on a row that is already targeted', () => {
    const targets = activateTarget([], FACEBOOK, 'a1', ['reel'])
    expect(activateTarget(targets, FACEBOOK, 'a1', ['story'])).toEqual(targets)
  })

  it('retires the placeholder when a real account takes its place, keeping its post types', () => {
    const targets: CampaignAccountTarget[] = [
      {
        platform_id: FACEBOOK,
        account_id: PLACEHOLDER_ACCOUNT_ID,
        post_types: ['reel'],
      },
      {
        platform_id: LINKEDIN,
        account_id: PLACEHOLDER_ACCOUNT_ID,
        post_types: ['poll'],
      },
    ]
    expect(
      activateTarget(targets, FACEBOOK, 'a1', ['reel', 'story', 'poll']),
    ).toEqual([
      {
        platform_id: LINKEDIN,
        account_id: PLACEHOLDER_ACCOUNT_ID,
        post_types: ['poll'],
      },
      // The placeholder's own selection, not the defaults — this is the same
      // row gaining a name.
      { platform_id: FACEBOOK, account_id: 'a1', post_types: ['reel'] },
    ])
  })

  it('leaves other platforms alone when a placeholder is superseded', () => {
    const targets: CampaignAccountTarget[] = [
      {
        platform_id: LINKEDIN,
        account_id: PLACEHOLDER_ACCOUNT_ID,
        post_types: ['poll'],
      },
    ]
    const next = activateTarget(targets, FACEBOOK, 'a1', ['reel'])
    expect(next).toHaveLength(2)
    expect(next[0]).toEqual(targets[0])
  })
})

describe('deactivateTarget / togglePostType', () => {
  const targets: CampaignAccountTarget[] = [
    { platform_id: FACEBOOK, account_id: 'a1', post_types: ['reel'] },
    { platform_id: FACEBOOK, account_id: 'a2', post_types: ['reel', 'story'] },
  ]

  it('removes one account without touching its sibling on the same platform', () => {
    expect(deactivateTarget(targets, FACEBOOK, 'a1')).toEqual([targets[1]])
  })

  it('toggles a post type on one account only', () => {
    const next = togglePostType(targets, FACEBOOK, 'a2', 'story')
    expect(next[0].post_types).toEqual(['reel'])
    expect(next[1].post_types).toEqual(['reel'])
  })

  it('adds a post type that was switched off', () => {
    expect(
      togglePostType(targets, FACEBOOK, 'a1', 'story')[0].post_types,
    ).toEqual(['reel', 'story'])
  })
})

describe('deriveTargetPlatforms', () => {
  it('collapses accounts to one entry per platform, unioning their post types', () => {
    expect(
      deriveTargetPlatforms([
        { platform_id: FACEBOOK, account_id: 'a1', post_types: ['reel'] },
        {
          platform_id: FACEBOOK,
          account_id: 'a2',
          post_types: ['story', 'reel'],
        },
        {
          platform_id: LINKEDIN,
          account_id: PLACEHOLDER_ACCOUNT_ID,
          post_types: ['poll'],
        },
      ]),
    ).toEqual([
      { id: FACEBOOK, post_types: ['reel', 'story'] },
      { id: LINKEDIN, post_types: ['poll'] },
    ])
  })

  it('is empty when the campaign targets nothing', () => {
    expect(deriveTargetPlatforms([])).toEqual([])
  })
})

describe('accountRows', () => {
  it('lists real accounts before placeholders', () => {
    const views = [view(LINKEDIN, []), view(FACEBOOK, [account('a1', 'acme')])]
    expect(accountRows(views, []).map((r) => r.key)).toEqual([
      `${FACEBOOK}:a1`,
      `${LINKEDIN}:`,
    ])
  })

  it('offers one row per connected account and no placeholder beside them', () => {
    const views = [view(FACEBOOK, [account('a1', 'one'), account('a2', 'two')])]
    const rows = accountRows(views, [])
    expect(rows.map((r) => r.account?.id)).toEqual(['a1', 'a2'])
  })

  it('keeps an already-targeted placeholder listed once its platform is connected', () => {
    const views = [view(FACEBOOK, [account('a1', 'acme')])]
    const rows = accountRows(views, [
      {
        platform_id: FACEBOOK,
        account_id: PLACEHOLDER_ACCOUNT_ID,
        post_types: ['reel'],
      },
    ])
    const placeholder = rows.find((r) => r.account === null)
    expect(placeholder).toBeDefined()
    // …carrying the accounts it can be swapped for, so the card can offer it.
    expect(placeholder!.supersededBy.map((a) => a.id)).toEqual(['a1'])
  })

  it('offers the placeholder where nothing is connected, with nothing to swap to', () => {
    const rows = accountRows([view(FACEBOOK, [])], [])
    expect(rows).toHaveLength(1)
    expect(rows[0].account).toBeNull()
    expect(rows[0].supersededBy).toEqual([])
  })

  it('marks which rows the campaign targets, and lifts them above the rest', () => {
    const views = [view(FACEBOOK, [account('a1', 'one'), account('a2', 'two')])]
    const rows = accountRows(views, [
      { platform_id: FACEBOOK, account_id: 'a2', post_types: ['reel'] },
    ])
    expect(rows.map((r) => r.account?.id)).toEqual(['a2', 'a1'])
    expect(rows.map((r) => r.selection !== undefined)).toEqual([true, false])
  })

  it('orders active rows by when they were chosen, not by platform', () => {
    const views = [
      view(FACEBOOK, [account('a1', 'one'), account('a2', 'two')]),
      view(LINKEDIN, [account('l1', 'work')]),
    ]
    // Chosen LinkedIn first, then the second Facebook page.
    const rows = accountRows(views, [
      { platform_id: LINKEDIN, account_id: 'l1', post_types: ['post'] },
      { platform_id: FACEBOOK, account_id: 'a2', post_types: ['reel'] },
    ])
    expect(rows.map((r) => r.account?.id)).toEqual(['l1', 'a2', 'a1'])
  })

  it('keeps active placeholders under the active accounts, and both above the inactive rows', () => {
    const views = [
      view(FACEBOOK, [account('a1', 'one')]),
      view(LINKEDIN, []),
      view(INSTAGRAM, [account('i1', 'gram')]),
    ]
    const rows = accountRows(views, [
      // The placeholder was chosen first and still sits below the account.
      {
        platform_id: LINKEDIN,
        account_id: PLACEHOLDER_ACCOUNT_ID,
        post_types: ['post'],
      },
      { platform_id: FACEBOOK, account_id: 'a1', post_types: ['reel'] },
    ])
    expect(rows.map((r) => r.key)).toEqual([
      `${FACEBOOK}:a1`,
      `${LINKEDIN}:`,
      `${INSTAGRAM}:i1`,
    ])
  })
})
