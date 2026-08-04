import { describe, expect, it } from 'vitest'
import { buildPlatformView, connectedAccounts, getPlatformInfo } from './platformDictionary.ts'
import type { Platform, PublisherAccount } from '@/types/campaigns'

// Platform Sqid from the dictionary below.
const LINKEDIN = 'AXqWG7U2qnpt'

function account(id: string): PublisherAccount {
  return {
    id,
    username: id,
    display_name: id,
    avatar_url: '',
    is_active: true,
    connected_at: '2026-01-01T00:00:00Z',
  }
}

function view(accounts: PublisherAccount[]) {
  const platform: Platform = {
    id: LINKEDIN,
    name: 'LinkedIn',
    post_types: {},
    cadence: '',
    constraints: '',
    text_constraints: { max_content_chars: 3000, max_title_chars: 0 },
    video_constraints: {
      max_file_size_bytes: 0,
      allowed_formats: [],
      max_duration_seconds: 0,
      min_duration_seconds: 0,
      max_width: 0,
      max_height: 0,
      allowed_aspect_ratios: [],
      max_attachments_per_post: 0,
      requires_video_title: false,
    },
    created_at: '',
    updated_at: '',
    publishers: [
      {
        id: 'zernio',
        name: 'Zernio',
        state: 'ok',
        // Mirrors the server: a publisher is connected once it holds any
        // account (`len(accounts) > 0` in src/handlers/platforms.go).
        connected: accounts.length > 0,
        supported_post_types: [],
        accounts,
      },
    ],
  }
  const info = getPlatformInfo(LINKEDIN)
  if (!info) throw new Error('LinkedIn missing from the dictionary')
  return buildPlatformView(platform, info)
}

describe('connectedAccounts', () => {
  it('counts accounts, not publishers', () => {
    // The bug this replaced: `connectedPublishers.length` is 1 here too, so
    // a second and third account were invisible to every caller that used it.
    const three = view([account('acc-1'), account('acc-2'), account('acc-3')])
    expect(three.connectedPublishers).toHaveLength(1)
    expect(connectedAccounts(three)).toHaveLength(3)
  })

  it('is empty when nothing is connected', () => {
    const none = view([])
    expect(none.connectedPublishers).toHaveLength(0)
    expect(connectedAccounts(none)).toEqual([])
  })

  it('ignores accounts on a publisher that is not connected', () => {
    const stale = view([account('acc-1')])
    stale.connectedPublishers = []
    expect(connectedAccounts(stale)).toEqual([])
  })
})
