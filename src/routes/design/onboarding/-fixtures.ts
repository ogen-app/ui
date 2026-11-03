/**
 * TEMPORARY — fixtures for the solopreneur onboarding harness.
 *
 * One persona, so a moderator can hand a tester a website and a role and every
 * screen agrees with it: Maya Lind, an independent brand designer working
 * alone. Testers who type their own site still get Maya's read — the domain
 * they typed is echoed back, the findings are not. Brief them with the
 * persona rather than letting them discover the seam.
 */

export const PERSONA = {
  firstName: 'Maya',
  business: 'Studio Lind',
  website: 'mayalind.studio',
}

/** What the read "visits", in order, with how long each takes in the harness. */
export const READ_PAGES = [
  { path: '/', label: 'Home page', ms: 1400 },
  { path: '/about', label: 'About', ms: 1200 },
  { path: '/services', label: 'Services', ms: 1300 },
  {
    path: '/work/harbour-coffee',
    label: 'Case study: Harbour Coffee',
    ms: 1100,
  },
  {
    path: '/journal/rebrand-checklist',
    label: 'Journal: the rebrand checklist',
    ms: 1000,
  },
]

/**
 * What the read learned, in the words a tester would use — no voice,
 * audience or guardrail anywhere. The `afterPage` index is when each finding
 * surfaces during the read, so the wait shows its work.
 */
export const FINDINGS = {
  what: {
    afterPage: 0,
    text: 'Brand identity and websites for small, independent food and hospitality businesses — cafés, bakeries, roasters.',
  },
  who: {
    afterPage: 1,
    text: 'Owners of independent cafés and food brands who are opening, growing, or have outgrown a DIY look.',
  },
  tone: {
    afterPage: 2,
    words: ['Warm', 'Plain-spoken', 'Practical'],
    sample:
      'Your logo isn’t your brand. Your brand is the reason someone walks past three cafés to get to yours.',
  },
  facts: {
    afterPage: 3,
    items: [
      'Works solo, based in Lisbon, clients across Europe',
      'Brand projects start at €4,500 and take about six weeks',
      'Recent work: Harbour Coffee, Pão Real bakery, Oddbird natural wine bar',
      'Offers a free 30-minute “brand check” call',
    ],
  },
}

/** Every tone word the review offers, the read's picks among them. */
export const TONE_OPTIONS = [
  'Warm',
  'Plain-spoken',
  'Practical',
  'Playful',
  'Expert',
  'Bold',
  'Calm',
  'Witty',
]

export type PlatformId =
  'linkedin' | 'instagram' | 'facebook' | 'twitter' | 'threads' | 'tiktok'

/** The order the channel step offers them in. */
export const OFFERED_PLATFORMS: PlatformId[] = [
  'linkedin',
  'instagram',
  'facebook',
  'twitter',
  'threads',
  'tiktok',
]

/** Pre-ticked from what the read found linked on the site. */
export const FOUND_PLATFORMS: PlatformId[] = ['linkedin', 'instagram']

export const RHYTHMS = [
  { id: 2, label: '2 a week', note: 'Easy to keep up' },
  { id: 3, label: '3 a week', note: 'Most people start here' },
  { id: 5, label: 'Every weekday', note: 'For a big push' },
] as const

export type Rhythm = (typeof RHYTHMS)[number]['id']

export type DraftPost = {
  id: string
  /** 0 = Monday of the first week. */
  day: number
  time: string
  /** The kind of post, in plain words. */
  angle: string
  body: string
  /** Whether the draft wants a picture it does not have yet. */
  wantsImage: boolean
}

/**
 * Five drafts, Monday to Friday. The harness shows as many as the chosen
 * rhythm asks for (2 → Tue/Thu, 3 → Mon/Wed/Fri, 5 → all) and deals the
 * chosen platforms out round-robin.
 */
export const DRAFTS: DraftPost[] = [
  {
    id: 'p1',
    day: 0,
    time: '09:00',
    angle: 'Introduce yourself',
    body:
      'I’m Maya, and I design brands for independent cafés and food businesses.\n\n' +
      'Not the big chains — the place on the corner that roasts its own beans, the bakery that sells out by eleven.\n\n' +
      'If you’re opening something this year, I’d love to hear about it.',
    wantsImage: true,
  },
  {
    id: 'p2',
    day: 1,
    time: '09:00',
    angle: 'Behind a project',
    body:
      'Harbour Coffee came to me with a logo they’d made in an afternoon and a queue out the door.\n\n' +
      'The coffee was never the problem. Nobody walking past could tell it was a specialty roaster.\n\n' +
      'Six weeks later: one mark, two colours, a cup you photograph. Here’s what changed.',
    wantsImage: true,
  },
  {
    id: 'p3',
    day: 2,
    time: '12:30',
    angle: 'A useful tip',
    body:
      'Before you pay anyone for a rebrand, check three things:\n\n' +
      '1. Can someone tell what you sell from across the street?\n' +
      '2. Does your menu look like it belongs to your sign?\n' +
      '3. Would you photograph your own cup?\n\n' +
      'Two “no”s and it’s time.',
    wantsImage: false,
  },
  {
    id: 'p4',
    day: 3,
    time: '09:00',
    angle: 'An opinion',
    body:
      'Your logo isn’t your brand.\n\n' +
      'Your brand is the reason someone walks past three cafés to get to yours. The logo is just how they recognise it when they arrive.',
    wantsImage: false,
  },
  {
    id: 'p5',
    day: 4,
    time: '16:00',
    angle: 'An offer',
    body:
      'I keep two Fridays a month for free 30-minute brand checks.\n\n' +
      'Bring your sign, your menu and your Instagram. You’ll leave with the three changes I’d make first — whether or not we ever work together.',
    wantsImage: false,
  },
]

export const RHYTHM_DAYS: Record<Rhythm, number[]> = {
  2: [1, 3],
  3: [0, 2, 4],
  5: [0, 1, 2, 3, 4],
}

/** Monday of next week, so the plan always reads as upcoming. */
export function firstMonday(now = new Date()): Date {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  const toMonday = (8 - d.getDay()) % 7 || 7
  d.setDate(d.getDate() + toMonday)
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}
