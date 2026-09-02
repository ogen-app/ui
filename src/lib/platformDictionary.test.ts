import { afterEach, describe, expect, it } from 'vitest'
import type { Platform, PublisherAccount } from '@/types/campaigns'
import { clearFlagOverrides, setFlagOverride } from '@/config/flagOverrides.ts'
import { makePlatform } from './platformFixtures.ts'
import {
  PLATFORMS,
  buildPlatformView,
  buildPlatformViews,
  connectedAccounts,
  getPlatformInfo,
  getPostTypeLabel,
  releasedPostTypes,
} from './platformDictionary.ts'

// Sqids from the dictionary itself.
const YOUTUBE = '8S8bWQTG6qD'
const INSTAGRAM = 'rzgpTkARLH0L'
const LINKEDIN = 'AXqWG7U2qnpt'
const TWITTER = '81mUCmc2xsKd'
const THREADS = 'pQ4yxT3SuE57'

function apiPlatform(id: string, supported: string[]): Platform {
  return makePlatform({
    id,
    name: 'whatever the API calls it',
    publishers: [
      {
        id: 'pub1',
        name: 'Zernio',
        state: 'ok',
        connected: true,
        supported_post_types: supported,
        accounts: [],
      },
    ],
  })
}

// The CON-145 gates (YouTube hidden, video post types withheld) came out
// when the video pipeline landed — CON-148 made video publishable and
// CON-163 gave YouTube its preview, so the dictionary offers both.
describe('video ungating (CON-148/163)', () => {
  it('offers YouTube alongside the other platforms', () => {
    expect(PLATFORMS.some((p) => p.zernioId === 'youtube')).toBe(true)
    expect(getPlatformInfo(YOUTUBE)?.name).toBe('YouTube')
    expect(getPostTypeLabel(YOUTUBE, 'short')).toBe('Short')
  })

  it('builds a view for it when the API returns it', () => {
    const views = buildPlatformViews([
      apiPlatform(YOUTUBE, ['video']),
      apiPlatform(INSTAGRAM, ['image-post']),
    ])
    expect(views.map((v) => v.info.zernioId)).toEqual(['youtube', 'instagram'])
  })

  it('keeps video formats in a view when a publisher supports them', () => {
    const [view] = buildPlatformViews([
      apiPlatform(INSTAGRAM, ['image-post', 'reel', 'carousel']),
    ])
    expect(view.allowed.map((pt) => pt.slug)).toEqual([
      'image-post',
      'carousel',
      'reel',
    ])
  })
})

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

function linkedInView(accounts: PublisherAccount[]) {
  const platform: Platform = makePlatform({
    text_constraints: { max_content_chars: 3000, max_title_chars: 0 },
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
  })
  const info = getPlatformInfo(LINKEDIN)
  if (!info) throw new Error('LinkedIn missing from the dictionary')
  return buildPlatformView(platform, info)
}

describe('connectedAccounts', () => {
  it('counts accounts, not publishers', () => {
    // The bug this replaced: `connectedPublishers.length` is 1 here too, so
    // a second and third account were invisible to every caller that used it.
    const three = linkedInView([
      account('acc-1'),
      account('acc-2'),
      account('acc-3'),
    ])
    expect(three.connectedPublishers).toHaveLength(1)
    expect(connectedAccounts(three)).toHaveLength(3)
  })

  it('is empty when nothing is connected', () => {
    const none = linkedInView([])
    expect(none.connectedPublishers).toHaveLength(0)
    expect(connectedAccounts(none)).toEqual([])
  })

  it('ignores accounts on a publisher that is not connected', () => {
    const stale = linkedInView([account('acc-1')])
    stale.connectedPublishers = []
    expect(connectedAccounts(stale)).toEqual([])
  })
})

// A post type this build has written but not released (CON-196). The gate is
// on the entry rather than on the slug, which is the part worth pinning: X has
// offered `thread` since long before sequences, and a flag that withdrew it
// would change how the app behaves with the feature off.
describe('flagged post types', () => {
  it('withholds a flagged type even when a publisher supports it', () => {
    const [view] = buildPlatformViews([
      apiPlatform(THREADS, ['text-post', 'image-post', 'thread']),
    ])
    expect(view.allowed.map((pt) => pt.slug)).toEqual([
      'text-post',
      'image-post',
    ])
    expect(view.available.map((pt) => pt.slug)).not.toContain('thread')
  })

  it('leaves an unflagged type of the same slug alone', () => {
    const [view] = buildPlatformViews([
      apiPlatform(TWITTER, ['text-post', 'thread']),
    ])
    expect(view.allowed.map((pt) => pt.slug)).toEqual(['text-post', 'thread'])
  })

  // The editor's picker does not go through `buildPlatformView` — it asks the
  // campaign which types it offers, and shows the unconnected ones rather than
  // hiding them. So the release gate has to exist on its own, or the flag
  // leaks through the one menu that can actually set the post type.
  it("withholds a flagged type from the editor's picker too", () => {
    expect(releasedPostTypes(THREADS).map((pt) => pt.slug)).not.toContain(
      'thread',
    )
    expect(releasedPostTypes(TWITTER).map((pt) => pt.slug)).toContain('thread')
  })

  it('has no types for a platform it does not know', () => {
    expect(releasedPostTypes('not-a-platform')).toEqual([])
  })

  // The other half of the same gate, and the point of the feature: with the
  // flag on, Threads has to offer the type its publisher has never heard of.
  // `supportedPlatforms` in the Go repo lists `thread` for `twitter` only, so
  // intersecting with the publisher would hide CON-196 from the network it is
  // named after — for exactly as long as the server takes to learn the slug,
  // which is what running ahead behind a flag exists to avoid.
  describe('with the flag on', () => {
    afterEach(() => clearFlagOverrides())

    function threadsView(supported: string[], connected = true) {
      setFlagOverride('thread-sequence', true)
      const platform = makePlatform({
        id: THREADS,
        publishers: [
          {
            id: 'pub1',
            name: 'Zernio',
            state: 'ok',
            connected,
            supported_post_types: supported,
            accounts: [],
          },
        ],
      })
      const info = getPlatformInfo(THREADS)
      if (!info) throw new Error('Threads missing from the dictionary')
      return buildPlatformView(platform, info)
    }

    it('stands in for the slug the publisher has not learned yet', () => {
      const view = threadsView(['text-post', 'image-post'])
      expect(view.allowed.map((pt) => pt.slug)).toContain('thread')
      // Available, not dormant: the publisher is connected, and the only
      // thing it is missing is a word for what we are asking it to send.
      expect(view.available.map((pt) => pt.slug)).toContain('thread')
      expect(view.unavailable.map((pt) => pt.slug)).not.toContain('thread')
    })

    it('still waits on the connection, like every other type', () => {
      const view = threadsView(['text-post'], false)
      expect(view.allowed.map((pt) => pt.slug)).toContain('thread')
      expect(view.available).toEqual([])
      expect(view.unavailable.map((pt) => pt.slug)).toContain('thread')
    })

    it('invents nothing for a platform with no publisher at all', () => {
      setFlagOverride('thread-sequence', true)
      const info = getPlatformInfo(THREADS)
      if (!info) throw new Error('Threads missing from the dictionary')
      const view = buildPlatformView(makePlatform({ id: THREADS }), info)
      expect(view.allowed).toEqual([])
    })

    it('does not stand in for an unflagged type', () => {
      setFlagOverride('thread-sequence', true)
      // X's `thread` carries no flag, so the publisher is still the whole
      // answer for it: a server that stopped reporting the slug really has
      // withdrawn it, and the app has to follow.
      const [view] = buildPlatformViews([apiPlatform(TWITTER, ['text-post'])])
      expect(view.allowed.map((pt) => pt.slug)).toEqual(['text-post'])
    })
  })
})
