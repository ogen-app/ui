import type { OverviewInput, OverviewPost } from '@/lib/campaignOverview'
import { attentionItems } from '@/lib/campaignReadiness'
import { buildPlatformViews } from '@/lib/platformDictionary'
import { withoutServerChecked } from '@/lib/serverCheckedRules'
import type { CalendarFinding } from '@/types/assistant'
import type { Campaign, CampaignPhaseWindow, Platform } from '@/types/campaigns'
import type { PostStatus } from '@/types/posts'

/**
 * One campaign, seen on different days. "Spring launch" runs 1 Oct – 3 Dec
 * with a goal of 16 posts a month on four networks; `postsAt(now)` writes its
 * posts as they would stand on a given day — what is behind it published,
 * the next ten days scheduled, the fortnight after drafted, further out only
 * partly planned. Switching stage moves the clock and nothing else, so the
 * figures stay one story.
 *
 * Ignored by the router: the leading dash.
 */

export const STAGES = [
  'new',
  'planning',
  'launched',
  'running',
  'closing',
  'ended',
] as const
export type HarnessStage = (typeof STAGES)[number]

/** The day each stage is read on. Running is "today" in the harness's world. */
export const NOW: Record<HarnessStage, Date> = {
  new: new Date(2026, 8, 20, 10, 0),
  planning: new Date(2026, 8, 22, 10, 0),
  launched: new Date(2026, 9, 4, 11, 0),
  running: new Date(2026, 10, 18, 11, 0),
  closing: new Date(2026, 10, 25, 11, 0),
  ended: new Date(2026, 11, 10, 11, 0),
}

export type Edges = {
  noGoal: boolean
  signedOut: boolean
  failures: boolean
  heavyProblems: boolean
  emptyWeek: boolean
  noAnalytics: boolean
}

export const NO_EDGES: Edges = {
  noGoal: false,
  signedOut: false,
  failures: false,
  heavyProblems: false,
  emptyWeek: false,
  noAnalytics: false,
}

export const CAMPAIGN_ID = 'cmp_spring'

// --- Platforms --------------------------------------------------------------

const NETWORKS = [
  {
    id: 'pl_li',
    zernio: 'linkedin',
    name: 'LinkedIn',
    types: ['text-post', 'image-post', 'carousel'],
  },
  {
    id: 'pl_x',
    zernio: 'twitter',
    name: 'X',
    types: ['text-post', 'image-post', 'thread'],
  },
  {
    id: 'pl_ig',
    zernio: 'instagram',
    name: 'Instagram',
    types: ['image-post', 'carousel', 'reel'],
  },
  {
    id: 'pl_th',
    zernio: 'threads',
    name: 'Threads',
    types: ['text-post', 'image-post'],
  },
] as const

function platform(n: (typeof NETWORKS)[number], connected: boolean): Platform {
  // Only the fields `buildPlatformView` reads; the rest is the editor's.
  return {
    id: n.id,
    name: n.name,
    zernio_id: n.zernio,
    enabled: true,
    connect_supported: true,
    post_types: Object.fromEntries(n.types.map((t) => [t, t])),
    supported_post_types: [...n.types],
    publishers: [
      {
        id: `pub_${n.id}`,
        name: 'Zernio',
        state: connected ? 'connected' : 'disconnected',
        connected,
        supported_post_types: [...n.types],
        accounts: connected
          ? [
              {
                id: `acc_${n.id}`,
                username: 'springco',
                display_name: 'Spring & Co',
                is_active: true,
              },
            ]
          : [],
      },
    ],
  } as unknown as Platform
}

export function platformViews(edges: Edges) {
  return buildPlatformViews(
    NETWORKS.map((n) =>
      platform(n, !(edges.signedOut && n.zernio === 'instagram')),
    ),
  )
}

// --- Campaign ---------------------------------------------------------------

function baseCampaign(): Campaign {
  return {
    id: CAMPAIGN_ID,
    name: 'Spring launch',
    description: 'Launch of the spring collection.',
    target_persona: '',
    key_messages: 'New season, same craft.',
    tone_guidelines: '',
    brand_voice_id: null,
    brand_audience_id: null,
    use_assets: false,
    asset_ids: [],
    target_platforms: NETWORKS.map((n) => ({
      id: n.id,
      post_types: [...n.types],
    })),
    campaign_type_id: 'type_conversion',
    type_locked: true,
    archived_at: null,
    start_date: '2026-10-01T00:00:00Z',
    end_date: '2026-12-03T00:00:00Z',
    estimated_post_count: 16,
    goal_cadence: 'month',
    publishing_time: '09:30',
    timezone: 'Europe/Zurich',
    publishing_days: ['mon', 'tue', 'thu', 'fri'],
    spread_minutes: 15,
    language: 'en',
    budget: null,
    currency: 'EUR',
    tag_ids: [],
    tags: [],
    platforms: [],
    created_by: 'usr_1',
    created_at: '2026-09-10T08:00:00Z',
    updated_at: '2026-09-10T08:00:00Z',
  }
}

export function campaignFor(stage: HarnessStage, edges: Edges): Campaign {
  if (stage === 'new') {
    return {
      ...baseCampaign(),
      name: 'Holiday gift guide',
      start_date: null,
      end_date: null,
      estimated_post_count: null,
      target_platforms: [],
      type_locked: false,
    }
  }
  return {
    ...baseCampaign(),
    estimated_post_count: edges.noGoal ? null : 16,
  }
}

/** Conversion's three phases, split evenly over the 64 days. */
export const PHASES: CampaignPhaseWindow[] = [
  {
    phase_id: 'ph1',
    sequence: 1,
    name: 'Capture',
    purpose: '',
    start_date: '2026-10-01',
    end_date: '2026-10-21',
    post_count: 14,
  },
  {
    phase_id: 'ph2',
    sequence: 2,
    name: 'Nurture & Persuade',
    purpose: '',
    start_date: '2026-10-22',
    end_date: '2026-11-11',
    post_count: 16,
  },
  {
    phase_id: 'ph3',
    sequence: 3,
    name: 'Close & Validate',
    purpose: '',
    start_date: '2026-11-12',
    end_date: '2026-12-03',
    post_count: 15,
  },
]

// --- Posts ------------------------------------------------------------------

const TITLES = [
  'Five pieces, one wardrobe',
  'Behind the loom: how the spring linen is made',
  'Meet the designers',
  'Spring colour story',
  'What our customers wore first',
  'The care guide nobody reads (but should)',
  'Early-access list opens',
  'Three ways to wear the field jacket',
  'From sketch to sample',
  'Our sourcing, in numbers',
  'Studio playlist for spring',
  'The last restock before summer',
  'Ask us anything: fabrics',
  'A week in the workshop',
  'Why we make fewer things',
  'The weekend edit',
]

const DAY = 86_400_000
const PUBLISHING = new Set([1, 2, 4, 5])

/**
 * The campaign's posts on `now`. Deterministic: the same day always gives
 * the same calendar.
 */
export function postsAt(
  stage: HarnessStage,
  now: Date,
  edges: Edges,
): OverviewPost[] {
  if (stage === 'new') return []
  const posts: OverviewPost[] = []
  const start = new Date(2026, 9, 1)
  const end = new Date(2026, 11, 3)
  let n = 0
  for (let d = new Date(start); d <= end; d = new Date(d.getTime() + DAY)) {
    if (!PUBLISHING.has(d.getDay())) continue
    // Tuesdays carry a second post in the afternoon.
    const slots = d.getDay() === 2 ? [9.5, 14] : [9.5]
    for (const hour of slots) {
      const at = new Date(d)
      at.setHours(Math.floor(hour), (hour % 1) * 60)
      const ahead = (at.getTime() - now.getTime()) / DAY
      const i = n++
      // Further out, the plan thins: every third slot isn't written yet.
      if (ahead > 21 && i % 3 === 0) continue
      // A week out and more, the odd day still has nothing on it.
      if (ahead > 7 && d.getDate() % 9 === 0) continue
      const net = NETWORKS[i % NETWORKS.length]
      let status: PostStatus
      if (ahead < 0) {
        status = edges.failures && i === 7 ? 'failed' : 'published'
      } else if (ahead <= 10) {
        // Instagram carousels go out by hand.
        status =
          net.zernio === 'instagram'
            ? 'scheduled_for_manual_publishing'
            : 'scheduled'
      } else if (ahead <= 21) {
        status = i % 2 ? 'ready_for_publish' : 'draft'
      } else {
        status = 'planned'
      }
      if (
        edges.emptyWeek &&
        ahead > -3 &&
        ahead < 7 &&
        status !== 'published'
      ) {
        continue
      }
      const iso = at.toISOString()
      posts.push({
        id: `post_${i}`,
        campaign_id: CAMPAIGN_ID,
        title: TITLES[i % TITLES.length],
        status,
        scheduled_at: iso,
        published_at: status === 'published' ? iso : null,
        platform_id: net.id,
        platform_post_type: net.types[i % net.types.length],
        campaign_type_phase_id: null,
        media_urls: [],
        created_at: '2026-09-15T08:00:00Z',
        updated_at: '2026-09-15T08:00:00Z',
      })
    }
  }
  // A published campaign with a failure in it: the last failed post is the
  // one closest to now, which is the one the user is likeliest to remember.
  if (edges.failures) {
    const past = posts.filter((p) => p.status === 'published')
    const last = past[past.length - 1]
    if (last) last.status = 'failed'
  }
  return posts
}

// --- The server's problems --------------------------------------------------

function problem(
  key: string,
  code: string,
  message: string,
  blocksPublishing: boolean,
  fixes: CalendarFinding['fixes'],
): CalendarFinding {
  return {
    key,
    code,
    severity: 'warning',
    message,
    blocksPublishing,
    postIds: [],
    posts: [],
    fixes,
  }
}

const OPEN = (postId: string) => ({
  kind: 'open_post',
  title: 'Open post',
  postId,
})

export function problemsFor(
  stage: HarnessStage,
  edges: Edges,
): OverviewInput['problems'] {
  if (stage === 'new') return { problems: [], dismissed: [] }
  const base = [
    problem(
      'p_media_1',
      'missing_media',
      '“Spring colour story” needs an image for Instagram',
      true,
      [
        { kind: 'revise_post', title: 'Add an image' },
        OPEN('post_12'),
        { kind: 'convert_post_type', title: 'Make it a text post' },
      ],
    ),
    problem(
      'p_media_2',
      'missing_media',
      '“Meet the designers” needs an image for Instagram',
      true,
      [{ kind: 'revise_post', title: 'Add an image' }],
    ),
    problem(
      'p_media_3',
      'missing_media',
      '“The weekend edit” needs an image for Instagram',
      true,
      [{ kind: 'revise_post', title: 'Add an image' }],
    ),
    problem(
      'p_len_1',
      'over_length',
      '“Our sourcing, in numbers” is 41 characters over X’s limit',
      false,
      [
        { kind: 'revise_post', title: 'Shorten it' },
        { kind: 'convert_post_type', title: 'Make it a thread' },
      ],
    ),
  ]
  const heavy = edges.heavyProblems
    ? [
        problem(
          'p_gap_1',
          'phase_gap',
          'Nurture & Persuade has no posts in its last week',
          false,
          [{ kind: 'plan_window', title: 'Plan the week' }],
        ),
        problem(
          'p_coll_1',
          'slot_collision',
          'Two posts go out on LinkedIn at 09:30 on Thursday',
          false,
          [{ kind: 'move_post', title: 'Move one' }],
        ),
        problem(
          'p_coll_2',
          'slot_collision',
          'Two posts go out on X at 14:00 on Tuesday',
          false,
          [{ kind: 'move_post', title: 'Move one' }],
        ),
        problem(
          'p_type_1',
          'post_type_disabled',
          '“Studio playlist for spring” is a reel, which the campaign no longer uses',
          true,
          [
            { kind: 'enable_post_type', title: 'Turn reels back on' },
            { kind: 'convert_post_type', title: 'Make it a carousel' },
          ],
        ),
        problem(
          'p_brief_1',
          'off_brief',
          '“The weekend edit” doesn’t mention the spring collection',
          false,
          [],
        ),
        problem(
          'p_media_4',
          'missing_media',
          '“A week in the workshop” needs an image for Instagram',
          true,
          [{ kind: 'revise_post', title: 'Add an image' }],
        ),
      ]
    : []
  return {
    problems: stage === 'ended' ? [] : [...base, ...heavy],
    dismissed: [
      problem(
        'p_tone_1',
        'tone',
        '“Why we make fewer things” reads more formal than the voice',
        false,
        [],
      ),
    ],
  }
}

// --- Analytics --------------------------------------------------------------

export function performanceFor(edges: Edges) {
  if (edges.noAnalytics) return { lastWeek: null, total: null }
  return {
    lastWeek: {
      reach: 18_420,
      interactions: 932,
      best: {
        postId: 'post_31',
        title: 'Three ways to wear the field jacket',
        platformId: 'pl_ig',
        reach: 6_120,
      },
    },
    total: {
      reach: 214_300,
      interactions: 9_870,
      best: {
        postId: 'post_4',
        title: 'What our customers wore first',
        platformId: 'pl_ig',
        reach: 31_800,
      },
    },
  }
}

/** Everything the model takes, for one stage and set of edge cases. */
export function harnessInput(stage: HarnessStage, edges: Edges): OverviewInput {
  const now = NOW[stage]
  const campaign = campaignFor(stage, edges)
  const views = platformViews(edges)
  const posts = postsAt(stage, now, edges)
  const problems = problemsFor(stage, edges)
  return {
    campaign,
    posts,
    platformViews: views,
    phases: stage === 'new' ? null : PHASES,
    attention: withoutServerChecked(
      attentionItems(campaign, posts, views, now),
      true,
    ),
    problems,
    ...performanceFor(edges),
    now,
  }
}
