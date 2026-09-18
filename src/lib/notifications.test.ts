import { describe, expect, it } from 'vitest'

import {
  channelName,
  notificationCopy,
  notificationTarget,
} from '@/lib/notifications'
import type { AppNotification } from '@/types/notifications'

/**
 * Two rules are worth pinning here, and both are about what happens when the
 * server says something this build has not been taught.
 *
 * `type` is an open vocabulary — new producers ship without warning — so the
 * fallback to the server's own English is the normal path for a new one, not an
 * error case. And a destination is built from the entity rather than from
 * `action_url`, so a row about something deleted renders as a row rather than
 * as a link into a blank screen.
 */

function row(over: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'n1',
    seq: 1,
    level: 'error',
    type: 'post.publish_failed',
    title: 'Post failed to publish',
    body: '',
    entity_type: 'post',
    entity_id: 'p1',
    action_url: '/posts/p1',
    data: { platform: 'linkedin' },
    read_at: null,
    created_at: '2026-09-03T09:00:00Z',
    expires_at: null,
    ...over,
  }
}

const inCampaign = (id: string) => (postId: string) =>
  postId === 'p1' ? id : null
const nowhere = () => null

describe('notificationCopy', () => {
  it('names a catalogue key and the data to fill it with', () => {
    const copy = notificationCopy(row())
    expect(copy).toEqual({
      key: 'activity.notification.postPublishFailed',
      vars: { channel: 'LinkedIn' },
    })
  })

  it('says nothing about a type it has never heard of', () => {
    // Null means "render the server's title" — English, untranslatable, and
    // true. Better than a generic sentence that says less than the row already
    // does.
    expect(notificationCopy(row({ type: 'post.quality_assessed' }))).toBeNull()
  })

  it('carries a count where the copy has plural forms', () => {
    const copy = notificationCopy(
      row({
        type: 'campaign.content_plan_ready',
        entity_type: 'campaign',
        data: { post_count: 12 },
      }),
    )
    expect(copy?.vars).toEqual({ count: 12 })
  })

  it('has copy for every producer the server runs today', () => {
    // The half CON-285 wired after CON-242 opened the vocabulary. A type
    // missing from the table is not an error — it renders the server's own
    // English — which is exactly why it is worth pinning: the failure is
    // invisible in English and total in every other language.
    const emitted = [
      ['post.manual_publish_due', 'postManualPublishDue'],
      ['url_asset.crawled', 'urlAssetCrawled'],
      ['url_asset.failed', 'urlAssetFailed'],
      ['content_plan.failed', 'contentPlanFailed'],
      ['assistant.completed', 'assistantCompleted'],
      ['assistant.failed', 'assistantFailed'],
      ['assessment.completed', 'assessmentCompleted'],
      ['assessment.failed', 'assessmentFailed'],
    ]
    for (const [type, leaf] of emitted) {
      // `data: null` on purpose: none of these sentences interpolates
      // anything, so none of them may be gated on a blob that might not come.
      expect(notificationCopy(row({ type, data: null }))).toEqual({
        key: `activity.notification.${leaf}`,
        vars: {},
      })
    }
  })

  it('does not read a platform sqid as a channel name', () => {
    // `post.manual_publish_due` carries `platform_id` — a catalogue row's id,
    // not a network (CON-292). Translating one needs the fetched list, so the
    // sentence says nothing about the channel rather than printing a sqid.
    expect(
      notificationCopy(
        row({
          type: 'post.manual_publish_due',
          data: { platform_id: 'Xk3mQ9' },
        }),
      ),
    ).toEqual({ key: 'activity.notification.postManualPublishDue', vars: {} })
  })

  it('falls back to the server title when the sentence cannot be filled', () => {
    // `data` is an unvalidated blob, so a known type can arrive without the
    // value its copy interpolates. Rendering the key anyway would print a
    // literal `{{channel}}` — or, for the plural-only keys, the key's own name
    // — so the row takes the server-title fallback, same as an unknown type.
    expect(notificationCopy(row({ data: null }))).toBeNull()
    expect(
      notificationCopy(
        row({
          type: 'campaign.content_plan_ready',
          entity_type: 'campaign',
          data: {},
        }),
      ),
    ).toBeNull()
    // A type whose sentence interpolates nothing needs nothing.
    expect(
      notificationCopy(
        row({ type: 'asset.ready', entity_type: 'asset', data: null }),
      ),
    ).toEqual({ key: 'activity.notification.assetReady', vars: {} })
  })
})

describe('channelName', () => {
  it('reads both vocabularies and passes through what it cannot place', () => {
    // The connect flow speaks Zernio's ids end to end; our own records carry
    // ours. Which one a producer sends is not something the client decides.
    expect(channelName('linkedin')).toBe('LinkedIn')
    expect(channelName('threads')).toBe('Threads')
  })
})

describe('notificationTarget', () => {
  it('routes a post through the campaign that holds it', () => {
    expect(notificationTarget(row(), inCampaign('c1'))).toEqual({
      to: '/campaigns/$campaignId/posts/$postId',
      params: { campaignId: 'c1', postId: 'p1' },
    })
  })

  it('does not link a post whose campaign is out of reach', () => {
    // Deleted, or in a workspace this reader has left. A row that says what
    // happened beats one that navigates into a 404.
    expect(notificationTarget(row(), nowhere)).toBeNull()
  })

  it('ignores the server’s own link, including the absolute one', () => {
    // Connection rows carry a full `https://app…` URL where entity rows carry a
    // path. Routing off `entity_type` is what makes that difference not matter.
    const target = notificationTarget(
      row({
        type: 'connection.action_required',
        entity_type: 'social_account',
        entity_id: 'acc1',
        action_url: 'https://app.example.com/workspace-settings?reconnect=acc1',
      }),
      nowhere,
    )
    expect(target).toEqual({ to: '/workspace-settings' })
  })

  it('addresses campaigns and assets by their own routes', () => {
    expect(
      notificationTarget(
        row({ entity_type: 'campaign', entity_id: 'c9' }),
        nowhere,
      ),
    ).toEqual({
      to: '/campaigns/$campaignId/overview',
      params: { campaignId: 'c9' },
    })
    expect(
      notificationTarget(
        row({ entity_type: 'asset', entity_id: 'a9' }),
        nowhere,
      ),
    ).toEqual({ to: '/assets/$assetId', params: { assetId: 'a9' } })
  })

  it('goes nowhere for an entity kind this build does not place', () => {
    expect(
      notificationTarget(
        row({ entity_type: 'invitation', entity_id: 'i1' }),
        nowhere,
      ),
    ).toBeNull()
    expect(
      notificationTarget(row({ entity_type: '', entity_id: '' }), nowhere),
    ).toBeNull()
  })
})
