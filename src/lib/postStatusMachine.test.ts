import { describe, expect, it } from 'vitest'
import {
  canEditPublishingAccount,
  canEditScheduledAt,
  getActionMeta,
  getTransitionBlockers,
  isSubmitted,
  isTerminalStatus,
  type TransitionContext,
} from './postStatusMachine.ts'
import type { Post, PostStatus } from '@/types/posts'

const EVERY_STATUS: PostStatus[] = [
  'draft',
  'ready_for_publish',
  'scheduled',
  'scheduled_for_manual_publishing',
  'failed',
  'published',
  'not_published',
]

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
    published_url: '',
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

// The rule the whole read-only post surface hangs off (CON-251): a post locks
// when a copy of it exists outside Ogen.
describe('isSubmitted', () => {
  it('locks the two statuses where something else holds a copy', () => {
    // Zernio holds the submission; the network holds the post.
    expect(isSubmitted('scheduled')).toBe(true)
    expect(isSubmitted('published')).toBe(true)
  })

  it('leaves a manual schedule open', () => {
    // Nothing has been submitted anywhere — the date is a reminder to a
    // human, and the post stays theirs to change until they go and post it.
    expect(isSubmitted('scheduled_for_manual_publishing')).toBe(false)
  })

  it('reopens the statuses the copy came back from', () => {
    // Both are reached *because* the post needs changing, so locking them
    // would remove the only thing left to do.
    expect(isSubmitted('failed')).toBe(false)
    expect(isSubmitted('not_published')).toBe(false)
  })

  it('leaves the pre-submission statuses open', () => {
    expect(isSubmitted('draft')).toBe(false)
    expect(isSubmitted('ready_for_publish')).toBe(false)
  })

  it('is not the same question as terminality', () => {
    // The trap this predicate exists to avoid. `isTerminalStatus` is true of
    // `published` alone, so a gate written that way locks every published post
    // correctly, passes review, and then silently freezes whatever gets an
    // empty edge list next. `scheduled` is where the two already part company.
    expect(isSubmitted('scheduled')).toBe(true)
    expect(isTerminalStatus('scheduled')).toBe(false)
  })

  it('is the same rule the date and account locks use', () => {
    // Not a restatement of their implementation — an assertion that the three
    // stay one rule, so a change to what "locked" means cannot reach the
    // document and leave the date picker behind.
    for (const status of EVERY_STATUS) {
      expect(canEditScheduledAt(status)).toBe(!isSubmitted(status))
      expect(canEditPublishingAccount(status)).toBe(!isSubmitted(status))
    }
  })
})
