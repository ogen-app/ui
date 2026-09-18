import { afterEach, describe, expect, it } from 'vitest'
import type { Platform, PublisherAccount } from '@/types/campaigns'
import { clearFlagOverrides, setFlagOverride } from '@/config/flagOverrides.ts'
import { makePlatform } from './platformFixtures.ts'
import { getPlatformMedia } from './platformMedia.ts'
import type { PlatformInfo } from './platformDictionary.ts'
import {
  PLATFORMS,
  buildPlatformView,
  buildPlatformViews,
  connectedAccounts,
  getPlatformByZernioId,
  getPostTypeLabel,
  releasedPostTypes,
} from './platformDictionary.ts'

// Zernio wire slugs — what the dictionary is keyed by (CON-292). The fixtures
// below reuse each as its row's sqid too; nothing here joins the two.
const YOUTUBE = 'youtube'
const INSTAGRAM = 'instagram'
const LINKEDIN = 'linkedin'
const TWITTER = 'twitter'
const THREADS = 'threads'

function apiPlatform(zernioId: string, supported: string[]): Platform {
  return makePlatform({
    id: zernioId,
    zernio_id: zernioId,
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
    expect(getPlatformByZernioId(YOUTUBE)?.name).toBe('YouTube')
    expect(getPostTypeLabel(getPlatformByZernioId(YOUTUBE), 'short')).toBe(
      'Short',
    )
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

// CON-292 made the catalogue the operator's: rows are added and enabled in
// Harbor, and their sqids are minted there. So the join has to be `zernio_id`
// or pre-built support for a platform somebody adds later is unreachable.
describe('the operator-controlled catalogue (CON-292)', () => {
  it('joins a row to its support by zernio_id, whatever its sqid is', () => {
    // The sqid here is one no build could have hardcoded — which is the case
    // this is about. What makes it resolve is the slug beside it.
    const [view] = buildPlatformViews([
      makePlatform({
        id: 'a-sqid-minted-after-this-build-shipped',
        zernio_id: 'linkedin',
        name: 'LinkedIn',
      }),
    ])
    expect(view.info.name).toBe('LinkedIn')
    expect(view.platform.id).toBe('a-sqid-minted-after-this-build-shipped')
  })

  it('drops a row this build ships no support for', () => {
    // Deliberate, not a gap: a network with no mark, no preview frame, no
    // caption fold and no media rules is broken in five places rather than
    // merely plain. The order is the launch order — support first, toggle
    // second.
    const views = buildPlatformViews([
      apiPlatform(LINKEDIN, ['text-post']),
      makePlatform({ id: 'p9', zernio_id: 'bluesky', name: 'Bluesky' }),
    ])
    expect(views.map((v) => v.info.zernioId)).toEqual(['linkedin'])
  })

  it('keeps the order the server sent, which is the operator’s', () => {
    const views = buildPlatformViews([
      apiPlatform(THREADS, ['text-post']),
      apiPlatform(LINKEDIN, ['text-post']),
      apiPlatform(YOUTUBE, ['video']),
    ])
    expect(views.map((v) => v.info.zernioId)).toEqual([
      'threads',
      'linkedin',
      'youtube',
    ])
  })

  // Seeded disabled by the same migration, so each is a one-toggle launch
  // rather than a deploy. They reach no tenant until an operator says so —
  // the list endpoint filters on `enabled`, which is why nothing here has to.
  it.each(['tiktok', 'pinterest', 'reddit'])(
    'ships support for %s ahead of its switch',
    (slug) => {
      const info = getPlatformByZernioId(slug)
      expect(info).toBeDefined()
      expect(info!.postTypes.length).toBeGreaterThan(0)
      // A mark of its own: the neutral fallback is what an *unknown* platform
      // would get, and these are not unknown.
      expect(info!.icon).toBeDefined()
    },
  )

  // The half of "support" that fails silently. `getPlatformMedia` answers `{}`
  // for a platform with no row, and an empty policy means the editor runs *no*
  // image checks rather than permissive ones — so a launch that forgot this
  // table would let an oversized file through to a publish-time rejection.
  it('carries media rules for every platform it offers', () => {
    const missing = PLATFORMS.filter(
      (p) => !getPlatformMedia(p.zernioId).image,
    ).map((p) => p.zernioId)
    // YouTube publishes video only — it takes no images, so it has no row and
    // wants none.
    expect(missing).toEqual(['youtube'])
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
  const info = getPlatformByZernioId(LINKEDIN)
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

// A post type this build has written but not released. The gate is on the
// entry rather than on the slug, so one network can offer a type while another
// is still holding it back.
//
// No entry carries a flag today: `thread` was the last and it was released on
// both X and Threads once ogen#156 fixed CON-284's divider. So the gate is
// exercised against an entry built here, borrowing an unrelated flag id — what
// is under test is the mechanism, not which feature happens to use it.
describe('the release gate', () => {
  afterEach(() => clearFlagOverrides())

  const unreleased: PlatformInfo = {
    zernioId: 'threads',
    name: 'Threads',
    icon: PLATFORMS[0].icon,
    color: '#000000',
    postTypes: [
      { slug: 'text-post', label: 'Text post' },
      { slug: 'half-built', label: 'Half-built', flag: 'tasks' },
    ],
  }

  function view(supported: string[]) {
    return buildPlatformView(
      makePlatform({
        id: THREADS,
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
      }),
      unreleased,
    )
  }

  it('withholds a flagged type even when a publisher supports it', () => {
    const v = view(['text-post', 'half-built'])
    expect(v.allowed.map((pt) => pt.slug)).toEqual(['text-post'])
    expect(v.available.map((pt) => pt.slug)).not.toContain('half-built')
  })

  // The editor's picker does not go through `buildPlatformView` — it asks the
  // campaign which types it offers, and shows the unconnected ones rather than
  // hiding them. So the release gate has to exist on its own, or the flag
  // leaks through the one menu that can actually set the post type.
  it("withholds it from the editor's picker too", () => {
    expect(releasedPostTypes(unreleased).map((pt) => pt.slug)).not.toContain(
      'half-built',
    )
  })

  it('lets the publisher answer once the flag is on', () => {
    setFlagOverride('tasks', true)
    const v = view(['text-post', 'half-built'])
    expect(v.allowed.map((pt) => pt.slug)).toContain('half-built')
    expect(v.available.map((pt) => pt.slug)).toContain('half-built')
  })

  it('still drops it where the publisher does not declare it', () => {
    setFlagOverride('tasks', true)
    expect(view(['text-post']).allowed.map((pt) => pt.slug)).not.toContain(
      'half-built',
    )
  })

  it('has no types for a platform it does not know', () => {
    expect(releasedPostTypes(getPlatformByZernioId('not-a-platform'))).toEqual(
      [],
    )
  })
})

// `thread` is released on both networks again (CON-284 / ogen#156). The
// publisher is the whole answer for it now, exactly as for every other type.
describe('thread, released', () => {
  it('is offered on X and on Threads when the publisher declares it', () => {
    for (const id of [TWITTER, THREADS]) {
      const [v] = buildPlatformViews([apiPlatform(id, ['text-post', 'thread'])])
      expect(v.allowed.map((pt) => pt.slug)).toContain('thread')
      expect(v.available.map((pt) => pt.slug)).toContain('thread')
    }
  })

  it('disappears where the publisher has withdrawn the slug', () => {
    const [v] = buildPlatformViews([apiPlatform(THREADS, ['text-post'])])
    expect(v.allowed.map((pt) => pt.slug)).not.toContain('thread')
  })

  it("reaches the editor's picker on both", () => {
    expect(
      releasedPostTypes(getPlatformByZernioId(TWITTER)).map((pt) => pt.slug),
    ).toContain('thread')
    expect(
      releasedPostTypes(getPlatformByZernioId(THREADS)).map((pt) => pt.slug),
    ).toContain('thread')
  })

  it('names an existing thread post', () => {
    expect(getPostTypeLabel(getPlatformByZernioId(TWITTER), 'thread')).toBe(
      'Thread',
    )
  })
})
