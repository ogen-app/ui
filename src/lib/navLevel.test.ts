import { describe, expect, it } from 'vitest'
import { navLevelOf } from './navLevel'

describe('navLevelOf', () => {
  it('puts the workspace destinations on level 0', () => {
    expect(navLevelOf('/campaigns')).toEqual({ level: 0, campaignId: null })
    expect(navLevelOf('/analytics')).toEqual({ level: 0, campaignId: null })
    expect(navLevelOf('/assets')).toEqual({ level: 0, campaignId: null })
    // The workspace bank's document editor, which is a child of `/assets`
    // rather than an escape from it and must not read as a campaign.
    expect(navLevelOf('/assets/a4')).toEqual({ level: 0, campaignId: null })
    expect(navLevelOf('/foundation/voices')).toEqual({
      level: 0,
      campaignId: null,
    })
  })

  it('drills on a campaign and on every section of one', () => {
    expect(navLevelOf('/campaigns/c1')).toEqual({ level: 1, campaignId: 'c1' })
    expect(navLevelOf('/campaigns/c1/overview')).toEqual({
      level: 1,
      campaignId: 'c1',
    })
    expect(navLevelOf('/campaigns/c1/calendar/2026-09-01/week')).toEqual({
      level: 1,
      campaignId: 'c1',
    })
  })

  // The regression this module exists to prevent: the editors escape the
  // campaign layout, so a rail keyed off the rendered layout would pop back to
  // the workspace the moment you opened a post.
  it('stays drilled in the editors that escape the campaign layout', () => {
    expect(navLevelOf('/campaigns/c1/posts/p9')).toEqual({
      level: 1,
      campaignId: 'c1',
    })
    expect(navLevelOf('/campaigns/c1/assets/a4')).toEqual({
      level: 1,
      campaignId: 'c1',
    })
  })

  it('does not read the archive search param as a campaign', () => {
    expect(navLevelOf('/campaigns?archived=true')).toEqual({
      level: 0,
      campaignId: null,
    })
  })
})
