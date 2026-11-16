/**
 * TEMPORARY — fixtures for the onboarding preview. One persona: Lena Brunner,
 * a freelance marketer, and her client Haus Aurelia, a family-run lake hotel
 * in Weggis (invented — the hotel, the family and every fact are fiction).
 */
import type {
  DistillEvidence,
  DistillRun,
  DistillSource,
} from '@/types/brandDistill'
import type { OnboardingBrief } from '@/components/onboarding/steps/CampaignStep'
import type { PlannedPost } from '@/components/onboarding/steps/PlanningStep'
import type { StarterQuestion } from '@/components/onboarding/steps/SourcesStep'

export const CLIENT = {
  name: 'Haus Aurelia',
  site: 'haus-aurelia.ch',
  favicon: `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='#17324D'/><path d='M10 22 16 9l6 13' fill='none' stroke='#fff' stroke-width='2.4' stroke-linejoin='round'/><path d='M7 21c3-1.6 6 1.6 9 0s6-1.6 9 0' fill='none' stroke='#E0663A' stroke-width='2' stroke-linecap='round'/></svg>`,
  )}`,
}

/** What the file picker hands over, one per click. */
export const FILES = [
  { name: 'Haus Aurelia – Brand book 2025.pdf', type: 'PDF', pages: 24 },
  { name: 'Press kit 2026 (EN).pdf', type: 'PDF', pages: 12 },
  { name: 'Winter offers 2026–27.docx', type: 'DOC', pages: 3 },
]

export const STARTER_QUESTIONS: StarterQuestion[] = [
  { id: 'q_offer', text: 'What do you sell, and who buys it?' },
  { id: 'q_apart', text: 'Why do people choose you over the place next door?' },
  { id: 'q_never_post', text: 'A sentence you would never post.' },
]

const PAGES = [
  ['/', 'Home'],
  ['/rooms', 'Rooms & suites'],
  ['/lindenstube', 'Restaurant Lindenstube'],
  ['/spa', 'Spa & lido'],
  ['/weddings', 'Weddings & events'],
  ['/family', 'Our family'],
] as const

function site(path: string): DistillEvidence {
  const page = PAGES.find(([p]) => p === path)!
  return {
    assetId: `page-${path}`,
    label: `${CLIENT.site}${path === '/' ? '' : path} · ${page[1]}`,
  }
}

const brandbook = (page: number, quote: string): DistillEvidence => ({
  assetId: 'doc-brandbook',
  label: `Brand book 2025.pdf · Page ${page}`,
  quote,
})
const presskit = (page: number, quote: string): DistillEvidence => ({
  assetId: 'doc-presskit',
  label: `Press kit 2026 (EN).pdf · Page ${page}`,
  quote,
})

/** The run's sources: the site's pages, then the documents. */
export function runSources(withDocs: boolean): DistillSource[] {
  const pages: DistillSource[] = PAGES.map(([path, title]) => ({
    assetId: `page-${path}`,
    title,
    type: 'URL',
    role: 'website',
    status: 'pending',
    url: `https://${CLIENT.site}${path}`,
    truncated: false,
  }))
  const docs: DistillSource[] = withDocs
    ? [
        {
          assetId: 'doc-brandbook',
          title: 'Haus Aurelia – Brand book 2025.pdf',
          type: 'PDF',
          role: 'asset',
          status: 'pending',
          truncated: false,
        },
        {
          assetId: 'doc-presskit',
          title: 'Press kit 2026 (EN).pdf',
          type: 'PDF',
          role: 'asset',
          status: 'pending',
          truncated: false,
        },
      ]
    : []
  return [...pages, ...docs]
}

const now = new Date().toISOString()

export function baseRun(sources: DistillSource[]): DistillRun {
  return {
    id: 'onboarding-preview-run',
    status: 'collecting',
    parentRunId: null,
    childRunId: null,
    website: { url: `https://${CLIENT.site}`, mapped: true, pagesFound: 23 },
    sources,
    answers: [],
    proposal: null,
    failure: null,
    createdBy: null,
    createdAt: now,
    updatedAt: now,
    finishedAt: null,
    committedAt: null,
  }
}

export const PROPOSAL: NonNullable<DistillRun['proposal']> = {
  voices: [
    {
      proposalId: 'v1',
      name: 'The family',
      whenToUse: 'Everyday posts: the lake, the kitchen, the seasons.',
      isDefault: true,
      thin: false,
      samples: [
        {
          text: 'The lido opens at seven. By nine, the lake is still yours.',
          evidence: site('/spa'),
        },
        {
          text: 'Marta has been baking the Zopf on Sundays since 1998. Ask her for the recipe; she will not give it to you.',
          evidence: site('/family'),
        },
        {
          text: 'Tonight in the Lindenstube: perch from the lake, brown butter, the first wild garlic.',
          evidence: site('/lindenstube'),
        },
      ],
      rules: {
        emoji: 'never',
        formality: 'neutral',
        person: 'we',
        length: 'short',
        opening: '',
        closing: '',
      },
      channelNotes: {},
      evidence: [
        brandbook(6, 'Say what is there and let it carry the weight.'),
      ],
    },
  ],
  audiences: [
    {
      proposalId: 'a1',
      name: 'International couples',
      who: 'UK, US and Gulf travellers, 35–65, on a Switzerland trip of a week or more.',
      readsOn: 'Instagram, travel press',
      scrollsPastWhen: 'It looks like every other five-star hotel.',
      believesWhen: 'They see the actual room, the actual view, a named dish.',
      evidence: [site('/rooms')],
    },
    {
      proposalId: 'a2',
      name: 'Zurich weekenders',
      who: 'Swiss couples and families from Zurich and Lucerne, 45 minutes away.',
      readsOn: 'Instagram, Facebook',
      scrollsPastWhen: 'An offer reads like a discount.',
      believesWhen: 'A date, a price and what is included.',
      evidence: [
        presskit(3, 'Two in three guests come from within two hours.'),
      ],
    },
  ],
  guardrails: {
    mayClaim: [
      {
        proposalId: 'g1',
        text: 'Family-run since 1911, now in its fourth generation.',
        evidence: [site('/family')],
      },
      {
        proposalId: 'g2',
        text: 'A private lido on Lake Lucerne.',
        evidence: [site('/spa')],
      },
    ],
    neverClaim: [
      {
        proposalId: 'g3',
        text: 'That the hotel is “the best” on the lake.',
        evidence: [brandbook(9, 'We never claim to be the best.')],
      },
    ],
    bannedWords: [
      {
        proposalId: 'g4',
        text: 'luxury',
        evidence: [brandbook(9, 'Words we do not use: luxury, exclusive.')],
      },
      {
        proposalId: 'g5',
        text: 'exclusive',
        evidence: [brandbook(9, 'Words we do not use: luxury, exclusive.')],
      },
    ],
    disclaimer: null,
  },
  facts: [
    {
      proposalId: 'f1',
      statement: '38 rooms and suites, 21 of them facing the lake.',
      subject: 'us',
      kind: 'documented',
      expiresAt: null,
      source: 'Press kit',
      evidence: [presskit(4, '38 rooms and suites, 21 with lake views.')],
    },
    {
      proposalId: 'f2',
      statement: 'Restaurant Lindenstube holds 16 Gault&Millau points.',
      subject: 'us',
      kind: 'measured',
      expiresAt: '2026-12-31',
      source: 'Press kit',
      evidence: [presskit(6, '16 points, Gault&Millau 2026.')],
    },
  ],
  questions: [
    {
      id: 'gap_offers',
      text: 'Which offers run this winter, and until when?',
      section: 'facts',
      why: 'The site lists none with dates.',
    },
  ],
  coverage: {
    voices: { level: 'found', note: '' },
    audiences: { level: 'found', note: '' },
    guardrails: { level: 'found', note: '' },
    facts: { level: 'thin', note: 'No current offers with dates.' },
  },
  dropped: { ungrounded: 2, duplicate: 1, limit: 0 },
}

export const CAMPAIGN_TYPES = [
  { id: 'seasonal', name: 'Seasonal' },
  { id: 'launch', name: 'Launch' },
  { id: 'event', name: 'Event' },
  { id: 'always-on', name: 'Always on' },
]

export const BRIEF: OnboardingBrief = {
  name: 'Winter on the lake',
  typeId: 'seasonal',
  goal: 'Fill midweek nights from January to March with couples from Zurich and abroad: the lido sauna, the Lindenstube’s winter menu, and the quiet.',
  start: '2027-01-04',
  end: '2027-03-28',
  platforms: [],
  perWeek: 3,
}

export const PLANNED: PlannedPost[] = [
  {
    id: 'p1',
    platform: 'instagram',
    date: '2027-01-04',
    postType: 'image-post',
    title: 'The lake at seven, in January',
  },
  {
    id: 'p2',
    platform: 'facebook',
    date: '2027-01-06',
    postType: 'text-post',
    title: 'Midweek winter nights: what is included',
  },
  {
    id: 'p3',
    platform: 'instagram',
    date: '2027-01-08',
    postType: 'carousel',
    title: 'The Lindenstube’s winter menu, course by course',
  },
  {
    id: 'p4',
    platform: 'instagram',
    date: '2027-01-11',
    postType: 'reel',
    title: 'The sauna on the lido, before breakfast',
  },
  {
    id: 'p5',
    platform: 'facebook',
    date: '2027-01-13',
    postType: 'image-post',
    title: 'Marta’s Sunday Zopf',
  },
  {
    id: 'p6',
    platform: 'instagram',
    date: '2027-01-15',
    postType: 'image-post',
    title: 'Room 14, and the view from the bed',
  },
]
