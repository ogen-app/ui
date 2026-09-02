import { describe, expect, it } from 'vitest'
import {
  getActionMeta,
  getTransitionBlockers,
  type TransitionContext,
} from './postStatusMachine.ts'
import type { Post } from '@/types/posts'

// Platform Sqid from platformDictionary.ts.
const LINKEDIN = 'AXqWG7U2qnpt'

function post(overrides: Partial<Post> = {}): Post {
  return {
    id: 'p1',
    campaign_id: 'c1',
    platform_id: LINKEDIN,
    platform_post_type: 'text-post',
    social_account_id: '',
    title: '',
    content: 'Hello',
    media_urls: [],
    // Far enough out that the future-date rule never trips these cases.
    scheduled_at: '2099-01-01T00:00:00Z',
    published_at: null,
    status: 'ready_for_publish',
    cta_type: 'none',
    cta_url: '',
    target_audience_notes: '',
    used_asset_ids: [],
    campaign_type_phase_id: null,
    created_by: 'u1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    campaign: null,
    platform: null,
    used_assets: [],
    campaign_type_phase: null,
    ...overrides,
  }
}

const RESOLVED: TransitionContext = {
  account: { ambiguous: false, mismatched: false },
}
const AMBIGUOUS: TransitionContext = {
  account: { ambiguous: true, mismatched: false },
}
const MISMATCHED: TransitionContext = {
  account: { ambiguous: false, mismatched: true },
}

function fields(blockers: { field: string }[]): string[] {
  return blockers.map((b) => b.field)
}

// Mirrors checkAccountSelection in src/post_actions/schedule/schedule.go.
describe('getTransitionBlockers — account selection', () => {
  it('blocks auto-publish when the platform is ambiguous and none is chosen', () => {
    const blockers = getTransitionBlockers(post(), 'scheduled', AMBIGUOUS)
    expect(fields(blockers)).toEqual(['social_account_id'])
  })

  it('blocks auto-publish when the chosen account is no longer connected', () => {
    const blockers = getTransitionBlockers(
      post({ social_account_id: 'acc-gone' }),
      'scheduled',
      MISMATCHED,
    )
    expect(fields(blockers)).toEqual(['social_account_id'])
  })

  it('reports one account blocker at a time, preferring the disconnected one', () => {
    const both: TransitionContext = {
      account: { ambiguous: true, mismatched: true },
    }
    const blockers = getTransitionBlockers(post(), 'scheduled', both)
    expect(blockers).toHaveLength(1)
    expect(blockers[0].message).toMatch(/connected account/)
  })

  it('lets a resolved account through', () => {
    expect(getTransitionBlockers(post(), 'scheduled', RESOLVED)).toEqual([])
  })

  it('leaves manual publishing alone', () => {
    // The server gates only auto-publish: a manual post never reaches the
    // submit worker, so which account it would go out as is moot.
    const blockers = getTransitionBlockers(
      post(),
      'scheduled_for_manual_publishing',
      AMBIGUOUS,
    )
    expect(blockers).toEqual([])
  })

  it('leaves the earlier edges alone', () => {
    expect(
      getTransitionBlockers(
        post({ status: 'draft' }),
        'ready_for_publish',
        AMBIGUOUS,
      ),
    ).toEqual([])
  })

  it('reports the account alongside the other missing fields', () => {
    const blockers = getTransitionBlockers(
      post({ platform_post_type: '', scheduled_at: null }),
      'scheduled',
      AMBIGUOUS,
    )
    expect(fields(blockers)).toEqual([
      'platform_post_type',
      'scheduled_at',
      'social_account_id',
    ])
  })
})

// The mechanism is the whole point of these three edges: each one has a
// dedicated endpoint that does work the plain status PUT skips, and the PUT
// is silently accepted by the server, so a regression here doesn't fail —
// it publishes, cancels or verifies incorrectly.
describe('action mechanisms', () => {
  it('completes a manual publish by verifying the URL, not by a status PUT', () => {
    // A PUT here would mark the post published with no publisher linkage,
    // stranding it outside analytics forever (CON-149).
    expect(
      getActionMeta('scheduled_for_manual_publishing', 'published')?.mechanism,
    ).toBe('verify')
  })

  it('unschedules through the cancel endpoint', () => {
    expect(getActionMeta('scheduled', 'ready_for_publish')?.mechanism).toBe(
      'cancel',
    )
    expect(getActionMeta('scheduled', 'draft')?.mechanism).toBe('cancel')
  })

  it('schedules auto-publish through the schedule endpoint', () => {
    expect(getActionMeta('ready_for_publish', 'scheduled')?.mechanism).toBe(
      'schedule',
    )
  })

  it('keeps the manual-publish schedule edge on the PUT path', () => {
    // Deliberately not 'schedule': the schedule endpoint would re-route an
    // allowlisted platform to auto-publish against the user's explicit choice.
    expect(
      getActionMeta('ready_for_publish', 'scheduled_for_manual_publishing')
        ?.mechanism,
    ).toBeUndefined()
  })
})
