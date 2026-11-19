import type { IdeaVerdict } from '@/lib/ideas'
import type { AssetListKind } from '@/types/assetList'

/**
 * Ideas for the harness — every shape a row has to hold: analysed from a
 * document (with and without the places it cites), written by a person,
 * suggested by the assistant, woken from Later, already used in posts, long
 * and short titles, one and two lines of summary, and none.
 */
export type HarnessIdea = {
  id: string
  title: string
  summary: string | null
  origin: 'analysed' | 'written' | 'suggested'
  fit?: number
  source?: { title: string; kind: AssetListKind; places?: string[] }
  author?: { id: string; name: string }
  createdAt: string
  campaign?: { id: string; name: string }
  verdict: IdeaVerdict | null
  remindAt?: string
  wokeUp?: boolean
  postCount?: number
  series?: string
}

export const CAMPAIGNS = {
  russie: { id: 'cmp_russie', name: 'Hotel de Russie — Spring' },
  alps: { id: 'cmp_alps', name: 'Alpine Winter Escapes' },
}

const ANNA = { id: 'usr_anna', name: 'Anna Keller' }
const MARC = { id: 'usr_marc', name: 'Marc Dubois' }

export const IDEAS: HarnessIdea[] = [
  {
    id: 'i1',
    title: 'The garden that was a Renaissance villa’s orchard',
    summary:
      'Lead with the secret garden’s history — terraced in 1816 by Valadier — and end on the spring menu served under the same lemon trees.',
    origin: 'analysed',
    fit: 92,
    source: {
      title: 'Hotel de Russie — Heritage brochure',
      kind: 'pdf',
      places: ['p. 4', 'p. 7'],
    },
    createdAt: '2026-11-12',
    campaign: CAMPAIGNS.russie,
    verdict: null,
  },
  {
    id: 'i2',
    title: 'Three rooms with a view of Piazza del Popolo',
    summary: 'A carousel: one room per slide, the view first, the room second.',
    origin: 'analysed',
    fit: 78,
    source: {
      title: 'Room inventory 2026',
      kind: 'spreadsheet',
      places: ['Rooms!B12', 'Rooms!B19', 'Rooms!B23', 'Rooms!B31'],
    },
    createdAt: '2026-11-12',
    campaign: CAMPAIGNS.russie,
    verdict: null,
    postCount: 2,
  },
  {
    id: 'i3',
    title: 'Ask the head concierge for one Rome secret a week',
    summary: null,
    origin: 'written',
    author: ANNA,
    createdAt: '2026-11-15',
    campaign: CAMPAIGNS.russie,
    verdict: null,
  },
  {
    id: 'i4',
    title:
      'Why the spa’s Roman bath ritual takes ninety minutes, and what happens in each of them — a step-by-step reel narrated by the therapist who designed it',
    summary:
      'Long-form reel. Each stage of the ritual is one shot; the therapist’s voice carries it. The point is the slowness, so the edit should be too.',
    origin: 'analysed',
    fit: 64,
    source: {
      title: 'De Russie Spa — treatment guide',
      kind: 'document',
      places: ['§ 3.2'],
    },
    createdAt: '2026-11-10',
    campaign: CAMPAIGNS.russie,
    verdict: null,
    wokeUp: true,
  },
  {
    id: 'i5',
    title: 'Behind the bar: the Stravinskij Negroni',
    summary:
      'The bartender builds it on camera; the caption tells the story of the name.',
    origin: 'suggested',
    createdAt: '2026-11-16',
    campaign: CAMPAIGNS.russie,
    verdict: null,
    series: 'Behind the scenes',
  },
  {
    id: 'i6',
    title: 'First snow at the lodge, the morning after',
    summary:
      'Shot at dawn before anyone has walked on it. No people, no text on the picture.',
    origin: 'written',
    author: MARC,
    createdAt: '2026-11-08',
    campaign: CAMPAIGNS.alps,
    verdict: null,
  },
  {
    id: 'i7',
    title: 'Ski-in breakfast, timed to the first lift',
    summary: 'A day in the life that starts at 7:40.',
    origin: 'analysed',
    fit: 41,
    source: {
      title: 'alpine-escapes.ch/winter',
      kind: 'web',
    },
    createdAt: '2026-11-05',
    campaign: CAMPAIGNS.alps,
    verdict: null,
  },
  {
    id: 'i8',
    title: 'Guest letters from 1960',
    summary:
      'Three handwritten letters from the archive, read aloud by staff who were not born yet.',
    origin: 'analysed',
    fit: 85,
    source: {
      title: 'Hotel de Russie — Heritage brochure',
      kind: 'pdf',
      places: ['p. 12'],
    },
    createdAt: '2026-11-12',
    campaign: CAMPAIGNS.russie,
    verdict: 'yes',
    postCount: 1,
  },
  {
    id: 'i9',
    title: 'Packing list for a February week in the mountains',
    summary: null,
    origin: 'written',
    author: ANNA,
    createdAt: '2026-10-29',
    campaign: CAMPAIGNS.alps,
    verdict: 'later',
    remindAt: '2026-12-15',
  },
  {
    id: 'i10',
    title: 'A sommelier ranks our five house wines',
    summary: 'Too close to last month’s series.',
    origin: 'suggested',
    createdAt: '2026-10-20',
    verdict: 'no',
  },
]

/**
 * What the server says each pile holds over the whole match — more than the
 * page has loaded, which is what "Select all N matching" is for.
 */
export const PILE_TOTALS = { waiting: 46, yes: 12, later: 5, no: 31 }
