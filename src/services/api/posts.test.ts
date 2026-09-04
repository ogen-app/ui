import { describe, expect, it } from 'vitest'
import { postToPayload } from './posts'
import type { Post } from '@/types/posts'

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 'po1',
    campaign_id: 'c1',
    platform_id: 'p1',
    platform_post_type: 'text-post',
    social_account_id: '',
    title: 'Launch day',
    content: 'We shipped it.',
    media_urls: [],
    scheduled_at: null,
    published_at: '2026-09-01T10:00:00Z',
    published_url: 'https://linkedin.com/feed/update/123',
    status: 'published',
    cta_type: 'none',
    cta_url: '',
    target_audience_notes: '',
    used_asset_ids: [],
    campaign_type_phase_id: null,
    publisher_post_id: 'zern-1',
    created_by: 'u1',
    created_at: '2026-09-01T09:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
    campaign: null,
    platform: null,
    used_assets: [],
    campaign_type_phase: null,
    ...overrides,
  } as Post
}

/**
 * The post PUT is whole-resource and the handler assigns every field from the
 * request, so anything this builder forgets is a field the next autosave
 * clears. `published_url` is the one that bites (CON-165): it is written
 * server-side, so nothing in the editor touches it, and an omission would only
 * show up as published posts quietly losing their permalink the first time
 * anyone edited them.
 */
describe('postToPayload', () => {
  it('round-trips the permalink rather than dropping it', () => {
    const payload = postToPayload(makePost())
    expect(payload.published_url).toBe('https://linkedin.com/feed/update/123')
  })

  it('carries an empty permalink as empty, not as absent', () => {
    // Absent and "" mean the same thing to the server here, but only because
    // it defaults the field; asserting the shape keeps the intent explicit.
    const payload = postToPayload(makePost({ published_url: '' }))
    expect('published_url' in payload).toBe(true)
    expect(payload.published_url).toBe('')
  })

  it('leaves out the fields the API does not take', () => {
    const payload = postToPayload(makePost())
    expect('publisher_post_id' in payload).toBe(false)
    expect('id' in payload).toBe(false)
  })
})
