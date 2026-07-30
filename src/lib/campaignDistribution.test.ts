import { describe, expect, it } from 'vitest'
import type { CampaignOverview } from '@/types/campaigns'
import {
  UNASSIGNED_PHASE_KEY,
  channelRows,
  phaseRows,
} from './campaignDistribution.ts'

/**
 * A mid-campaign payload: three phases out of order on the wire, one post
 * outside the plan, two channels carrying work and one carrying none.
 */
function overview(overrides: Partial<CampaignOverview> = {}): CampaignOverview {
  return {
    campaignId: 'c1',
    name: 'Spring launch',
    status: 'active',
    type: 'awareness',
    language: 'en',
    brief: {
      description: '',
      targetPersona: '',
      keyMessages: '',
      toneGuidelines: '',
    },
    phases: [
      { id: 'p2', sequence: 2, name: 'Distribute', purpose: '', postCount: 4 },
      { id: 'p1', sequence: 1, name: 'Tease', purpose: '', postCount: 6 },
      { id: 'p3', sequence: 3, name: 'Sustain', purpose: '', postCount: 1 },
    ],
    totalPosts: 12,
    distribution: {
      unassignedPhasePostCount: 1,
      byStatus: [
        { key: 'draft', label: 'Draft', count: 8 },
        { key: 'scheduled', label: 'Scheduled', count: 4 },
      ],
      byPlatform: [
        { key: 'rzgpTkARLH0L', label: 'Instagram', count: 7 },
        { key: 'AXqWG7U2qnpt', label: 'LinkedIn', count: 5 },
        { key: 'wKe9DxPqLm3v', label: 'X', count: 0 },
      ],
      byContentType: [],
    },
    generatedAt: '2026-07-28T09:00:00Z',
    ...overrides,
  }
}

describe('phaseRows', () => {
  it('orders phases by sequence, not by the order they arrived in', () => {
    expect(phaseRows(overview()).map((r) => r.label)).toEqual([
      'Tease',
      'Distribute',
      'Sustain',
      'Not assigned to a phase',
    ])
  })

  it('accounts for every post the server counted', () => {
    const payload = overview()
    const total = phaseRows(payload).reduce((sum, row) => sum + row.count, 0)
    expect(total).toBe(payload.totalPosts)
  })

  it('adds the unassigned row only when something is unassigned', () => {
    const rows = phaseRows(
      overview({
        phases: [
          { id: 'p1', sequence: 1, name: 'Tease', purpose: '', postCount: 12 },
        ],
        distribution: { ...overview().distribution, unassignedPhasePostCount: 0 },
      }),
    )
    expect(rows.map((r) => r.key)).toEqual(['p1'])
  })

  it('is empty for a type with no phases, unassigned posts or not', () => {
    expect(phaseRows(overview({ phases: [] }))).toEqual([])
  })

  it('keys the remainder distinctly from any phase', () => {
    const rows = phaseRows(overview())
    expect(rows[rows.length - 1].key).toBe(UNASSIGNED_PHASE_KEY)
  })
})

describe('channelRows', () => {
  it('keeps the server order and drops channels with nothing on them', () => {
    expect(channelRows(overview())).toEqual([
      { key: 'rzgpTkARLH0L', label: 'Instagram', count: 7 },
      { key: 'AXqWG7U2qnpt', label: 'LinkedIn', count: 5 },
    ])
  })

  it('renames the server\'s "None" bucket so it does not read as a channel', () => {
    const payload = overview()
    const rows = channelRows({
      ...payload,
      distribution: {
        ...payload.distribution,
        byPlatform: [{ key: '', label: 'None', count: 4 }],
      },
    })
    expect(rows).toEqual([{ key: '', label: 'No channel yet', count: 4 }])
  })

  it('is empty when no channel carries a post', () => {
    const payload = overview()
    expect(
      channelRows({
        ...payload,
        distribution: {
          ...payload.distribution,
          byPlatform: [{ key: 'x', label: 'X', count: 0 }],
        },
      }),
    ).toEqual([])
  })
})
