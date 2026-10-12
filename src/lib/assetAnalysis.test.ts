import { describe, expect, it } from 'vitest'
import type { AssetAnalysis } from '@/types/assetAnalysis'
import {
  analysisInFlight,
  formatClock,
  insightState,
  isAnalyzable,
  isEmptyReading,
  isMissingLens,
  metaStatus,
  missingLens,
  parseIdeaNote,
  pickLens,
  summaryParts,
  timeLabelSeconds,
} from './assetAnalysis'

const lens = (overrides: Partial<AssetAnalysis> = {}): AssetAnalysis => ({
  id: 'an-1',
  asset_id: 'a1',
  campaign_id: null,
  campaign_name: null,
  status: 'ready',
  strategy: 'full',
  summary: 'A summary.',
  language: 'en',
  key_points: [],
  topics: [],
  entities: [],
  relevance: null,
  partial_source: false,
  truncated: false,
  failure_code: '',
  failure_reason: '',
  analyzed_at: '2026-10-12T10:00:00Z',
  ideas: [],
  ...overrides,
})

describe('isAnalyzable', () => {
  it('analyses everything with text and never an image', () => {
    expect(isAnalyzable(null)).toBe(true)
    expect(isAnalyzable('PDF')).toBe(true)
    expect(isAnalyzable('AUDIO')).toBe(true)
    expect(isAnalyzable('IMG')).toBe(false)
  })
})

describe('pickLens', () => {
  const workspace = lens()
  const spring = lens({ id: 'an-2', campaign_id: 'c-spring' })
  const lenses = [workspace, spring]

  it('honours an explicit lens that still exists', () => {
    expect(pickLens(lenses, { requested: 'c-spring' })).toBe(spring)
    expect(
      pickLens(lenses, { requested: 'workspace', routeCampaignId: 'c-spring' }),
    ).toBe(workspace)
  })

  it('falls back to the route campaign, then the workspace', () => {
    expect(
      pickLens(lenses, { requested: 'gone', routeCampaignId: 'c-spring' }),
    ).toBe(spring)
    expect(pickLens(lenses, { routeCampaignId: 'c-other' })).toBe(workspace)
    expect(pickLens([spring], {})).toBe(spring)
    expect(pickLens([], {})).toBeUndefined()
  })
})

describe('insightState', () => {
  it('waits on the asset before the analysis', () => {
    expect(insightState('processing', lens())).toBe('reading')
    expect(insightState('failed', lens())).toBe('assetFailed')
  })

  it('reads the lens once the asset is settled', () => {
    expect(insightState('ready', undefined)).toBe('analysing')
    expect(
      insightState('partial', lens({ status: 'running', summary: '' })),
    ).toBe('analysing')
    // Re-reading keeps the reading it already has on screen.
    expect(insightState('ready', lens({ status: 'running' }))).toBe('ready')
    expect(insightState('ready', lens())).toBe('ready')
    expect(insightState('ready', lens({ status: 'failed' }))).toBe('failed')
    expect(
      insightState(
        'ready',
        lens({ status: 'skipped', failure_code: 'limit_reached' }),
      ),
    ).toBe('limitReached')
    expect(
      insightState(
        'ready',
        lens({ status: 'skipped', failure_code: 'entitlement_disabled' }),
      ),
    ).toBe('notInPlan')
  })
})

describe('summaryParts', () => {
  it('takes headings out and leaves the text between them whole', () => {
    expect(
      summaryParts(
        '## Small models win\n\nThis is a **position** paper.\n### Claim ##\n- one\n- two',
      ),
    ).toEqual([
      { kind: 'heading', level: 2, text: 'Small models win' },
      { kind: 'text', text: 'This is a **position** paper.' },
      { kind: 'heading', level: 3, text: 'Claim' },
      { kind: 'text', text: '- one\n- two' },
    ])
  })

  it('leaves a hash that is not a heading alone', () => {
    expect(summaryParts('#hashtag and C# code')).toEqual([
      { kind: 'text', text: '#hashtag and C# code' },
    ])
  })
})

describe('isEmptyReading', () => {
  it('knows a reading of nothing from one with something in it', () => {
    expect(isEmptyReading(lens({ summary: '' }))).toBe(true)
    expect(isEmptyReading(lens())).toBe(false)
    expect(isEmptyReading(lens({ summary: '', status: 'running' }))).toBe(false)
  })
})

describe('missingLens', () => {
  it('stands in for a campaign with no analysis row', () => {
    const l = missingLens('a1', { id: 'c9', name: 'Old campaign' })
    expect(isMissingLens(l)).toBe(true)
    expect(isMissingLens(lens())).toBe(false)
    expect(l).toMatchObject({
      campaign_id: 'c9',
      campaign_name: 'Old campaign',
    })
  })
})

describe('analysisInFlight', () => {
  it('keeps polling while the asset or any lens is still coming', () => {
    expect(analysisInFlight('processing', [])).toBe(true)
    expect(
      analysisInFlight('ready', [lens(), lens({ status: 'pending' })]),
    ).toBe(true)
    expect(analysisInFlight('ready', [lens()])).toBe(false)
    expect(analysisInFlight('ready', [lens({ status: 'failed' })])).toBe(false)
  })
})

describe('parseIdeaNote', () => {
  it('reads the angle, rationale and sources the backend writes', () => {
    expect(
      parseIdeaNote(
        'Lead with the chart.\n\nFits the data voice.\n\nSources: p. 4, p. 6',
      ),
    ).toEqual({
      angle: 'Lead with the chart.',
      rationale: 'Fits the data voice.',
      sources: ['p. 4', 'p. 6'],
    })
  })

  it('reads whatever is left of a note a person edited', () => {
    expect(parseIdeaNote('Just an angle')).toEqual({
      angle: 'Just an angle',
      rationale: '',
      sources: [],
    })
    expect(parseIdeaNote('')).toEqual({ angle: '', rationale: '', sources: [] })
    expect(parseIdeaNote('Sources: 12:03–12:47').sources).toEqual([
      '12:03–12:47',
    ])
  })
})

describe('timeLabelSeconds', () => {
  it('reads where a time label starts', () => {
    expect(timeLabelSeconds('12:03–12:47')).toBe(723)
    expect(timeLabelSeconds('0:05')).toBe(5)
    expect(timeLabelSeconds('1:02:03–1:05:00')).toBe(3723)
  })

  it('answers null for labels that are not times', () => {
    expect(timeLabelSeconds('p. 4')).toBeNull()
    expect(timeLabelSeconds('Slide 2')).toBeNull()
  })
})

describe('formatClock', () => {
  it('writes minutes and seconds, and hours only when there are some', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(912.7)).toBe('15:12')
    expect(formatClock(3723)).toBe('1:02:03')
    expect(formatClock(Number.NaN)).toBe('0:00')
  })
})

describe('metaStatus', () => {
  const asset = { status: 'ready', type: 'PDF', analysis_status: null } as const

  it('speaks for the asset before the analysis', () => {
    expect(metaStatus({ ...asset, status: 'processing' }, lens())).toBe(
      'reading',
    )
    expect(metaStatus({ ...asset, status: 'failed' }, lens())).toBe(
      'unreadable',
    )
    expect(metaStatus({ ...asset, type: 'IMG' }, undefined)).toBe('ready')
  })

  it('reads the workspace lens, else the asset field', () => {
    expect(metaStatus(asset, lens())).toBe('analysed')
    expect(metaStatus(asset, lens({ status: 'running' }))).toBe('analysing')
    expect(
      metaStatus({ ...asset, analysis_status: 'pending' }, undefined),
    ).toBe('analysing')
    expect(metaStatus(asset, lens({ status: 'failed' }))).toBe('analysisFailed')
    expect(metaStatus(asset, lens({ status: 'skipped' }))).toBe('notAnalysed')
    expect(metaStatus(asset, undefined)).toBe('ready')
  })
})
