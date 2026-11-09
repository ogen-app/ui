import { describe, expect, it } from 'vitest'
import { campaignSectionOf } from './campaignSections'

describe('campaignSectionOf', () => {
  it('reads the section after the campaign id', () => {
    expect(campaignSectionOf('/campaigns/abc/strategy')).toBe('strategy')
    expect(campaignSectionOf('/campaigns/abc/calendar/2026-11-09/week')).toBe(
      'calendar',
    )
  })

  it('files the list route and the editors under their section', () => {
    expect(campaignSectionOf('/campaigns/abc/list')).toBe('posts')
    expect(campaignSectionOf('/campaigns/abc/posts/p1')).toBe('posts')
    expect(campaignSectionOf('/campaigns/abc/assets/a1')).toBe('assets')
  })

  it('answers null outside a campaign, or on a segment it does not know', () => {
    expect(campaignSectionOf('/campaigns')).toBeNull()
    expect(campaignSectionOf('/campaigns/abc')).toBeNull()
    expect(campaignSectionOf('/ideas')).toBeNull()
    expect(campaignSectionOf('/campaigns/abc/whatever')).toBeNull()
  })
})
