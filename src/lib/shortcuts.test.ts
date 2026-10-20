import { describe, expect, it } from 'vitest'
import { campaignIdOf, goTarget } from './shortcuts'

describe('goTarget', () => {
  it('goes to the workspace’s places outside a campaign', () => {
    expect(goTarget('i', null)).toEqual({ to: '/ideas' })
    expect(goTarget('s', null)).toEqual({ to: '/workspace-settings' })
  })

  it('goes to the campaign’s own section inside one', () => {
    expect(goTarget('a', 'c1')).toEqual({
      to: '/campaigns/$campaignId/assets',
      params: { campaignId: 'c1' },
    })
    expect(goTarget('s', 'c1')?.to).toBe('/campaigns/$campaignId/settings')
  })

  it('keeps Campaigns and Foundation the workspace’s at both levels', () => {
    expect(goTarget('c', 'c1')).toEqual({ to: '/campaigns' })
    expect(goTarget('f', 'c1')).toEqual({ to: '/foundation' })
  })

  it('sends the campaign-only letters nowhere outside a campaign', () => {
    for (const key of ['t', 'p', 'r']) expect(goTarget(key, null)).toBeNull()
    expect(goTarget('x', 'c1')).toBeNull()
  })
})

describe('campaignIdOf', () => {
  it('reads the id off any campaign route, the post editor’s included', () => {
    expect(campaignIdOf('/campaigns/c1/strategy')).toBe('c1')
    expect(campaignIdOf('/campaigns/c1/posts/p1')).toBe('c1')
  })

  it('finds none on the list or elsewhere', () => {
    expect(campaignIdOf('/campaigns')).toBeNull()
    expect(campaignIdOf('/ideas')).toBeNull()
  })
})
