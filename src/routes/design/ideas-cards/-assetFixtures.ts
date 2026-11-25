import type { AssetListKind } from '@/types/assetList'
import { CAMPAIGNS } from './fixtures'

/**
 * Assets for the harness — every state a row has to hold: read with ideas
 * waiting, read with every idea decided, read with none, cut short, still
 * reading, failed, never analysed, and one still uploading; documents, a web
 * page, a recording, a note and a table on Knowledge, pictures on Media.
 */
export type HarnessAsset = {
  id: string
  title: string
  kind: AssetListKind
  shelf: 'knowledge' | 'media'
  gist: string | null
  /** What the file is: pages, a domain, a length, a size. */
  facts: string
  addedAt: string
  state: 'ideas' | 'reading' | 'failed' | 'noIdeas' | 'unanalysed' | 'uploading'
  ideas?: { waiting: number; yes: number; later: number; no: number }
  nextIdea?: string
  partial?: string
  failure?: string
  progress?: number
  campaigns: { id: string; name: string }[]
  tags: string[]
}

export const ASSETS: HarnessAsset[] = [
  {
    id: 'a0',
    title: 'Garden photographs — Valadier terrace.pdf',
    kind: 'pdf',
    shelf: 'knowledge',
    gist: null,
    facts: '18 MB',
    addedAt: '2026-11-19',
    state: 'uploading',
    progress: 64,
    campaigns: [CAMPAIGNS.russie],
    tags: [],
  },
  {
    id: 'a1',
    title: 'Hotel de Russie — Heritage brochure',
    kind: 'pdf',
    shelf: 'knowledge',
    gist: 'Two centuries of the hotel in 24 pages: Valadier’s terraced garden, the guests who wrote from it, and the 2026 restoration of the façade.',
    facts: '24 pages',
    addedAt: '2026-11-19',
    state: 'ideas',
    ideas: { waiting: 4, yes: 2, later: 0, no: 1 },
    nextIdea: 'The garden that was a Renaissance villa’s orchard',
    campaigns: [CAMPAIGNS.russie],
    tags: ['heritage'],
  },
  {
    id: 'a2',
    title: 'Interview with the head concierge',
    kind: 'audio',
    shelf: 'knowledge',
    gist: null,
    facts: '42 min',
    addedAt: '2026-11-19',
    state: 'reading',
    campaigns: [CAMPAIGNS.russie],
    tags: [],
  },
  {
    id: 'a3',
    title: 'Room inventory 2026',
    kind: 'spreadsheet',
    shelf: 'knowledge',
    gist: 'Every room and suite with its view, size and the year it was last redone.',
    facts: '3 sheets',
    addedAt: '2026-11-17',
    state: 'ideas',
    ideas: { waiting: 1, yes: 1, later: 0, no: 0 },
    nextIdea: 'Three rooms with a view of Piazza del Popolo',
    campaigns: [CAMPAIGNS.russie],
    tags: [],
  },
  {
    id: 'a4',
    title: 'De Russie Spa — full menu 2026',
    kind: 'pdf',
    shelf: 'knowledge',
    gist: 'Treatments, rituals and prices, with the therapists’ notes on each.',
    facts: '180 pages',
    addedAt: '2026-11-15',
    state: 'ideas',
    ideas: { waiting: 1, yes: 0, later: 1, no: 0 },
    partial: 'Read the first 100 pages',
    campaigns: [CAMPAIGNS.russie],
    tags: ['spa'],
  },
  {
    id: 'a5',
    title: 'Press kit 2025',
    kind: 'pdf',
    shelf: 'knowledge',
    gist: null,
    facts: '6 MB',
    addedAt: '2026-11-14',
    state: 'failed',
    failure: 'The file is password-protected.',
    campaigns: [],
    tags: [],
  },
  {
    id: 'a6',
    title: 'Winter at Alpine Escapes',
    kind: 'web',
    shelf: 'knowledge',
    gist: 'The lodge’s winter page: ski-in breakfasts, the first lift at 7:40, and the sauna on the ridge.',
    facts: 'alpine-escapes.ch',
    addedAt: '2026-11-13',
    state: 'ideas',
    ideas: { waiting: 1, yes: 0, later: 0, no: 0 },
    campaigns: [CAMPAIGNS.alps],
    tags: [],
  },
  {
    id: 'a7',
    title: 'Spring menu',
    kind: 'presentation',
    shelf: 'knowledge',
    gist: 'The chef’s spring tasting menu, course by course, with the producers behind each.',
    facts: '18 slides',
    addedAt: '2026-11-04',
    state: 'ideas',
    ideas: { waiting: 0, yes: 3, later: 0, no: 2 },
    campaigns: [CAMPAIGNS.russie, CAMPAIGNS.alps],
    tags: ['food'],
  },
  {
    id: 'a8',
    title: 'Brand voice notes',
    kind: 'note',
    shelf: 'knowledge',
    gist: 'Warm, never breathless. No exclamation marks. Rome is a character, not a backdrop.',
    facts: '1 page',
    addedAt: '2026-10-30',
    state: 'noIdeas',
    campaigns: [],
    tags: ['voice'],
  },
  {
    id: 'a9',
    title: 'Guest survey — summer 2026',
    kind: 'csv',
    shelf: 'knowledge',
    gist: null,
    facts: '1,204 rows',
    addedAt: '2026-10-29',
    state: 'unanalysed',
    campaigns: [],
    tags: ['research'],
  },
  {
    id: 'm1',
    title: 'Secret garden, morning light',
    kind: 'image',
    shelf: 'media',
    gist: null,
    facts: '4032 × 3024',
    addedAt: '2026-11-19',
    state: 'unanalysed',
    campaigns: [CAMPAIGNS.russie],
    tags: ['garden'],
  },
  {
    id: 'm2',
    title: 'Piazza del Popolo from Suite 501',
    kind: 'image',
    shelf: 'media',
    gist: null,
    facts: '3000 × 2000',
    addedAt: '2026-11-16',
    state: 'unanalysed',
    campaigns: [CAMPAIGNS.russie],
    tags: [],
  },
  {
    id: 'm3',
    title: 'The lodge in first snow',
    kind: 'image',
    shelf: 'media',
    gist: null,
    facts: '6000 × 4000',
    addedAt: '2026-11-08',
    state: 'unanalysed',
    campaigns: [CAMPAIGNS.alps],
    tags: ['winter'],
  },
]

/** What the server says each shelf holds over the whole match. */
export const SHELF_TOTALS = { knowledge: 128, media: 41 }

/** Every waiting idea on the shelf, and the documents they came from. */
export const WAITING = { ideas: 46, documents: 9 }
