/**
 * TEMPORARY — fixtures for the marketer onboarding harness.
 *
 * One persona, close to our first real lead: Lena Brunner, a freelance
 * marketer in Lucerne whose first client is Haus Aurelia, a family-owned
 * five-star lake hotel (invented — the hotel, the family and every fact below
 * are fiction). Testers who type their own website still get Haus Aurelia's
 * read; brief them with the persona rather than letting them find the seam.
 *
 * What the read finds depends on what was given: every item names its
 * source, and an item whose document was not uploaded is left out. That is
 * deliberate — giving Ogen the brand book should visibly buy something.
 */

export const PERSONA = {
  firstName: 'Lena',
  lastName: 'Brunner',
}

export const CLIENT = {
  name: 'Haus Aurelia',
  website: 'haus-aurelia.ch',
  place: 'Weggis, Lake Lucerne',
}

/* ------------------------------------------------------------------------ */
/* Sources                                                                  */
/* ------------------------------------------------------------------------ */

export type SourceId =
  | 'web'
  | 'brandbook'
  | 'presskit'
  | 'offers'
  | 'notes'
  /** Added by the person during the review. */
  | 'you'

export type SourceFile = {
  id: Exclude<SourceId, 'web' | 'notes' | 'you'>
  name: string
  kind: string
  pages: number
}

/** Dropped in one at a time by clicking the upload area — a fake picker. */
export const SOURCE_FILES: SourceFile[] = [
  {
    id: 'brandbook',
    name: 'Haus Aurelia – Brand book 2025.pdf',
    kind: 'Brand guidelines',
    pages: 24,
  },
  {
    id: 'presskit',
    name: 'Press kit 2026 (EN).pdf',
    kind: 'Press kit',
    pages: 12,
  },
  {
    id: 'offers',
    name: 'Winter offers 2026–27.docx',
    kind: 'Offer sheet',
    pages: 3,
  },
]

export const WEB_PAGES = [
  { path: '/', label: 'Home page' },
  { path: '/rooms', label: 'Rooms & suites' },
  { path: '/lindenstube', label: 'Restaurant Lindenstube' },
  { path: '/spa', label: 'Spa & lido' },
  { path: '/weddings', label: 'Weddings & events' },
  { path: '/family', label: 'Our family' },
]

/** How a source is cited beside what was learned from it. */
export function sourceLabel(id: SourceId, page?: string): string {
  switch (id) {
    case 'web':
      return page ? `${CLIENT.website}${page}` : CLIENT.website
    case 'notes':
      return 'your notes'
    case 'you':
      return 'you'
    default: {
      const file = SOURCE_FILES.find((f) => f.id === id)!
      return page ? `${file.kind}, ${page}` : file.kind
    }
  }
}

/* ------------------------------------------------------------------------ */
/* The brand the read proposes                                              */
/* ------------------------------------------------------------------------ */

export type Cited = { source: SourceId; ref?: string }

export type VoiceTrait = Cited & {
  id: string
  word: string
  means: string
  avoid: string
}

export type Audience = Cited & {
  id: string
  name: string
  who: string
  wants: string
}

export type Rule = Cited & {
  id: string
  kind: 'never' | 'always'
  text: string
}

export type Fact = Cited & { id: string; text: string }

export type Language = { code: 'en' | 'de' | 'fr' | 'it'; label: string }

export const LANGUAGES: Language[] = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'German' },
  { code: 'fr', label: 'French' },
  { code: 'it', label: 'Italian' },
]

export type Brand = {
  positioning: string
  traits: VoiceTrait[]
  soundsLike: string
  notLike: string
  languages: Language['code'][]
  audiences: Audience[]
  rules: Rule[]
  facts: Fact[]
}

export const PROPOSED: Brand = {
  positioning:
    'A family-run lake hotel for people who want to be left in peace, well looked after — 38 rooms, a serious kitchen and a private lido on Lake Lucerne, 45 minutes from Zurich.',
  traits: [
    {
      id: 'understated',
      word: 'Understated',
      means: 'Say what is there and let it carry the weight.',
      avoid: 'luxury, exclusive, breathtaking, hidden gem',
      source: 'brandbook',
      ref: 'p. 6',
    },
    {
      id: 'warm',
      word: 'Warm',
      means: 'The family speaking — “we”, a welcome, never “the property”.',
      avoid: '“Guests are invited to…”, corporate third person',
      source: 'web',
      ref: '/family',
    },
    {
      id: 'precise',
      word: 'Precise',
      means: 'Name the dish, the trail, the hour the sun reaches the terrace.',
      avoid: 'Superlatives that could describe any hotel',
      source: 'web',
      ref: '/lindenstube',
    },
  ],
  soundsLike: 'The lido opens at seven. By nine, the lake is still yours.',
  notLike: 'Experience unparalleled luxury at our exclusive lakeside retreat!',
  languages: ['en', 'de'],
  audiences: [
    {
      id: 'couples',
      name: 'International couples',
      who: 'UK, US and Gulf travellers, 35–65, on a Switzerland trip of a week or more.',
      wants:
        'Two to four quiet nights between cities; the restaurant and the lake view decide it.',
      source: 'web',
      ref: '/rooms',
    },
    {
      id: 'weekenders',
      name: 'Swiss weekenders',
      who: 'Couples from Zurich, Basel and Bern, booking three to six weeks ahead.',
      wants:
        'One or two nights of spa and a proper dinner without a long drive.',
      source: 'offers',
    },
    {
      id: 'events',
      name: 'Small weddings & private events',
      who: 'Couples and planners organising 20 to 80 guests, a year or more ahead.',
      wants:
        'Exclusive use of the terrace, a kitchen that cooks for them, rooms for everyone.',
      source: 'web',
      ref: '/weddings',
    },
  ],
  rules: [
    {
      id: 'prices',
      kind: 'never',
      text: 'Never publish prices. Rates are given on the booking page only.',
      source: 'brandbook',
      ref: 'p. 19',
    },
    {
      id: 'faces',
      kind: 'never',
      text: 'No guest faces without written consent.',
      source: 'brandbook',
      ref: 'p. 21',
    },
    {
      id: 'names',
      kind: 'never',
      text: 'Never name a guest, however well known.',
      source: 'presskit',
      ref: 'p. 11',
    },
    {
      id: 'luxury',
      kind: 'never',
      text: 'Never use the word “luxury” — the family dislikes it.',
      source: 'notes',
    },
    {
      id: 'michelin',
      kind: 'always',
      text: 'The restaurant has 16 GaultMillau points — never say “Michelin”.',
      source: 'presskit',
      ref: 'p. 4',
    },
    {
      id: 'direct',
      kind: 'always',
      text: 'Link to the hotel’s own booking page, never to a booking platform.',
      source: 'notes',
    },
  ],
  facts: [
    {
      id: 'family',
      text: 'Family-owned since 1911, fourth generation on site',
      source: 'web',
      ref: '/family',
    },
    {
      id: 'rooms',
      text: '38 rooms and suites, every one facing the lake',
      source: 'web',
      ref: '/rooms',
    },
    {
      id: 'gault',
      text: 'Restaurant Lindenstube, 16 GaultMillau points',
      source: 'presskit',
      ref: 'p. 4',
    },
    {
      id: 'spa',
      text: '1,200 m² spa with an indoor–outdoor pool, open until 21:00',
      source: 'web',
      ref: '/spa',
    },
    {
      id: 'lido',
      text: 'Private lido, open May to September',
      source: 'web',
      ref: '/spa',
    },
    {
      id: 'zurich',
      text: '45 minutes from Zurich airport',
      source: 'presskit',
      ref: 'p. 2',
    },
    {
      id: 'winter',
      text: 'Winter weekends: two nights, spa, one dinner, late check-out at 14:00 when booked direct',
      source: 'offers',
    },
    {
      id: 'events-cap',
      text: 'Events for up to 80 guests; exclusive use of the terrace from 40',
      source: 'presskit',
      ref: 'p. 9',
    },
  ],
}

/** The proposal narrowed to what the given sources could have taught. */
export function proposalFrom(given: SourceId[]): Brand {
  const has = (c: Cited) => given.includes(c.source)
  const voiced = PROPOSED.traits.filter(has)
  return {
    ...PROPOSED,
    traits: voiced,
    // The sample line comes from the brand book when there is one.
    soundsLike: given.includes('brandbook')
      ? PROPOSED.soundsLike
      : 'Our family has run this house since 1911.',
    audiences: PROPOSED.audiences.filter(has),
    rules: PROPOSED.rules.filter(has),
    facts: PROPOSED.facts.filter(has),
  }
}

export const TRAIT_OPTIONS = [
  'Understated',
  'Warm',
  'Precise',
  'Playful',
  'Confident',
  'Poetic',
  'Expert',
  'Calm',
]

/* ------------------------------------------------------------------------ */
/* Accounts                                                                 */
/* ------------------------------------------------------------------------ */

export type PlatformId =
  'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'threads' | 'twitter'

export type Account = {
  platform: PlatformId
  handle: string
  /** What the read found it used for — one line. */
  note: string
}

/** Linked from the client's site, so offered first. */
export const FOUND_ACCOUNTS: Account[] = [
  {
    platform: 'instagram',
    handle: '@hausaurelia',
    note: 'Main channel — 18.4k followers',
  },
  {
    platform: 'facebook',
    handle: 'Haus Aurelia Weggis',
    note: 'Older Swiss guests, events',
  },
  {
    platform: 'linkedin',
    handle: 'Haus Aurelia (company page)',
    note: 'Corporate retreats and planners',
  },
]

export const OTHER_PLATFORMS: PlatformId[] = ['tiktok', 'threads', 'twitter']

/* ------------------------------------------------------------------------ */
/* First campaign                                                           */
/* ------------------------------------------------------------------------ */

export type Goal = 'bookings' | 'enquiries' | 'awareness' | 'event'

export const GOALS: { id: Goal; label: string }[] = [
  { id: 'bookings', label: 'Direct bookings' },
  { id: 'enquiries', label: 'Enquiries' },
  { id: 'awareness', label: 'Awareness' },
  { id: 'event', label: 'Fill an event' },
]

export type Brief = {
  idea: IdeaId
  name: string
  goal: Goal
  audienceIds: string[]
  weeks: number
  perWeek: number
  platforms: PlatformId[]
  measure: string
  target: string
  messages: string[]
  cta: string
  languages: Language['code'][]
}

export type IdeaId = 'winter' | 'festive' | 'weddings'

export type Bilingual = Record<'en' | 'de', string>

export type Draft = {
  id: string
  /** 0 = Monday of the campaign's first week. */
  day: number
  time: string
  angle: string
  audienceId: string
  platform: PlatformId
  body: Bilingual
  wantsImage: boolean
  /** Fact ids the draft leans on — shown as "Ogen used". */
  uses: string[]
}

export type Slot = { angle: string; audienceId: string }

export type Idea = {
  id: IdeaId
  name: string
  why: string
  brief: Omit<Brief, 'idea' | 'platforms'>
  /** The first week, written. */
  drafts: Draft[]
  /** What every later week is planned to carry, cycled. */
  slots: Slot[]
}

export const IDEAS: Idea[] = [
  {
    id: 'winter',
    name: 'Winter wellness weekends',
    why: 'Your offer sheet has a two-night spa package, and Swiss weekenders book winter stays three to six weeks ahead — now is when they decide.',
    brief: {
      name: 'Winter wellness weekends',
      goal: 'bookings',
      audienceIds: ['weekenders', 'couples'],
      weeks: 12,
      perWeek: 3,
      measure: 'Clicks to the booking page',
      target: '400 a month',
      messages: [
        'Two nights of quiet, an hour from home',
        'The spa is open until nine — the evening is part of the stay',
        'Book direct for a late check-out on Sunday',
      ],
      cta: 'Book your winter weekend',
      languages: ['en', 'de'],
    },
    drafts: [
      {
        id: 'w1',
        day: 0,
        time: '08:30',
        angle: 'The package, plainly',
        audienceId: 'weekenders',
        platform: 'instagram',
        wantsImage: true,
        uses: ['winter', 'spa', 'gault'],
        body: {
          en:
            'Two nights. The spa until nine. Dinner at the Lindenstube, and breakfast whenever you come down.\n\n' +
            'Our winter weekends run from December to February. Book direct and your room is yours until two on Sunday.',
          de:
            'Zwei Nächte. Das Spa bis neun Uhr abends. Abendessen in der Lindenstube und Frühstück, wann immer Sie herunterkommen.\n\n' +
            'Unsere Winterwochenenden gibt es von Dezember bis Februar. Direkt gebucht, bleibt Ihr Zimmer am Sonntag bis 14 Uhr.',
        },
      },
      {
        id: 'w2',
        day: 2,
        time: '12:00',
        angle: 'A detail only we have',
        audienceId: 'couples',
        platform: 'instagram',
        wantsImage: true,
        uses: ['spa', 'rooms'],
        body: {
          en:
            'On a clear January morning the sun clears the mountains at half past eight and lands on the outdoor pool.\n\n' +
            'It lasts about forty minutes. Most of the house is in the water by then.',
          de:
            'An einem klaren Januarmorgen kommt die Sonne um halb neun über die Berge und fällt direkt ins Aussenbecken.\n\n' +
            'Das dauert etwa vierzig Minuten. Bis dahin ist fast das ganze Haus im Wasser.',
        },
      },
      {
        id: 'w3',
        day: 4,
        time: '17:00',
        angle: 'From the family',
        audienceId: 'weekenders',
        platform: 'facebook',
        wantsImage: false,
        uses: ['family'],
        body: {
          en:
            'Our family has run Haus Aurelia since 1911. In winter, when the lake goes quiet, it feels most like it did then — a fire in the hall, a kitchen cooking for a few tables, and time.\n\n' +
            'Winter weekends from 1 December.',
          de:
            'Seit 1911 führt unsere Familie das Haus Aurelia. Im Winter, wenn es am See still wird, ist es am ehesten wie damals – ein Feuer in der Halle, eine Küche für wenige Tische, und Zeit.\n\n' +
            'Winterwochenenden ab 1. Dezember.',
        },
      },
    ],
    slots: [
      { angle: 'The winter tasting menu', audienceId: 'weekenders' },
      { angle: 'A spa evening, hour by hour', audienceId: 'weekenders' },
      { angle: 'A walk from the door', audienceId: 'couples' },
      { angle: 'Behind the kitchen', audienceId: 'couples' },
      { angle: 'A guest’s weekend (with consent)', audienceId: 'weekenders' },
      { angle: 'Reminder: weekends still open', audienceId: 'weekenders' },
      { angle: 'The fire in the hall', audienceId: 'couples' },
      { angle: 'Breakfast until noon', audienceId: 'weekenders' },
      { angle: 'Snow on the lake', audienceId: 'couples' },
      { angle: 'The pastry kitchen’s winter bake', audienceId: 'weekenders' },
      { angle: 'Room 12, the corner suite', audienceId: 'couples' },
      { angle: 'The wine cellar', audienceId: 'weekenders' },
      { angle: 'The quietest week of the year', audienceId: 'weekenders' },
      { angle: 'Valentine’s at the lake', audienceId: 'couples' },
      { angle: 'A sauna, then the cold lake', audienceId: 'weekenders' },
      { angle: 'From Zurich in 45 minutes', audienceId: 'couples' },
      { angle: 'Last February weekends', audienceId: 'weekenders' },
    ],
  },
  {
    id: 'festive',
    name: 'Christmas & New Year at the lake',
    why: 'The last rooms over the holidays are the most valuable nights of the winter, and they go to whoever asks first.',
    brief: {
      name: 'Christmas & New Year at the lake',
      goal: 'bookings',
      audienceIds: ['couples', 'weekenders'],
      weeks: 7,
      perWeek: 2,
      measure: 'Holiday nights booked direct',
      target: 'Sell out 31 December',
      messages: [
        'A small house over the holidays — 38 rooms, one table each',
        'New Year’s Eve dinner at the Lindenstube',
        'Book direct; we hold the last rooms for direct guests',
      ],
      cta: 'Ask about the holidays',
      languages: ['en', 'de'],
    },
    drafts: [
      {
        id: 'f1',
        day: 1,
        time: '09:00',
        angle: 'A few rooms left',
        audienceId: 'couples',
        platform: 'instagram',
        wantsImage: true,
        uses: ['rooms'],
        body: {
          en:
            'Thirty-eight rooms, and over New Year a handful are still free.\n\n' +
            'We keep the last ones for guests who book with us directly.',
          de:
            'Achtunddreissig Zimmer – und über Neujahr sind noch einige frei.\n\n' +
            'Die letzten halten wir für Gäste, die direkt bei uns buchen.',
        },
      },
      {
        id: 'f2',
        day: 3,
        time: '18:00',
        angle: 'The New Year’s Eve menu',
        audienceId: 'weekenders',
        platform: 'facebook',
        wantsImage: true,
        uses: ['gault'],
        body: {
          en:
            'Seven courses at the Lindenstube on the last night of the year — lake fish, a game course from the valley, and midnight on the terrace.\n\n' +
            'The menu is in the link.',
          de:
            'Sieben Gänge in der Lindenstube am letzten Abend des Jahres – Fisch aus dem See, ein Wildgang aus dem Tal und um Mitternacht die Terrasse.\n\n' +
            'Das Menü finden Sie im Link.',
        },
      },
    ],
    slots: [
      { angle: 'Christmas Eve at the house', audienceId: 'couples' },
      { angle: 'A gift: a night at the lake', audienceId: 'weekenders' },
      { angle: 'Last rooms', audienceId: 'couples' },
    ],
  },
  {
    id: 'weddings',
    name: 'Weddings 2027',
    why: 'Couples planning a summer 2027 wedding are choosing venues this winter, and your events page has no dates on it yet.',
    brief: {
      name: 'Weddings 2027',
      goal: 'enquiries',
      audienceIds: ['events'],
      weeks: 10,
      perWeek: 2,
      measure: 'Wedding enquiries',
      target: '12 enquiries',
      messages: [
        'The terrace is yours from 40 guests',
        'A kitchen that cooks for your wedding, not a banquet',
        'Rooms for everyone, so nobody drives home',
      ],
      cta: 'Ask for 2027 dates',
      languages: ['en', 'de'],
    },
    drafts: [
      {
        id: 'd1',
        day: 1,
        time: '10:00',
        angle: '2027 dates are open',
        audienceId: 'events',
        platform: 'instagram',
        wantsImage: true,
        uses: ['events-cap'],
        body: {
          en:
            'Summer 2027 dates are open.\n\n' +
            'From forty guests the terrace is yours alone — the lake on one side, the kitchen on the other, and rooms upstairs for everyone.',
          de:
            'Die Daten für Sommer 2027 sind offen.\n\n' +
            'Ab vierzig Gästen gehört die Terrasse Ihnen allein – auf der einen Seite der See, auf der anderen die Küche, und oben Zimmer für alle.',
        },
      },
      {
        id: 'd2',
        day: 3,
        time: '12:00',
        angle: 'For planners',
        audienceId: 'events',
        platform: 'linkedin',
        wantsImage: false,
        uses: ['events-cap', 'zurich'],
        body: {
          en:
            'For planners with a 2027 lake wedding: 80 guests, 38 rooms, 45 minutes from Zurich airport, and one kitchen that cooks the whole day.\n\n' +
            'Our events team sends dates and a floor plan within a day.',
          de:
            'Für Planerinnen und Planer mit einer Hochzeit am See 2027: 80 Gäste, 38 Zimmer, 45 Minuten vom Flughafen Zürich und eine Küche, die den ganzen Tag kocht.\n\n' +
            'Unser Eventteam schickt Daten und Raumplan innert eines Tages.',
        },
      },
    ],
    slots: [
      { angle: 'A wedding day, hour by hour', audienceId: 'events' },
      { angle: 'Meet the events team', audienceId: 'events' },
      { angle: 'The menu tasting', audienceId: 'events' },
    ],
  },
]

/** The days a week's posts fall on, by how many there are. */
export const WEEK_DAYS: Record<number, number[]> = {
  1: [2],
  2: [1, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
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
