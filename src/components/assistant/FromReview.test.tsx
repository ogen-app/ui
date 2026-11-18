import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { reviewFindingOf } from '@/lib/viewContext'
import { FromReview } from './FromReview'

describe('FROM THE REVIEW (CON-495)', () => {
  it('quotes the post’s words and the issue, from a stored view', async () => {
    const finding = reviewFindingOf({
      version: 1,
      screen: 'campaign_overview',
      from: {
        kind: 'finding',
        campaignId: 'c1',
        key: 'k1',
        finding: {
          key: 'k1',
          postId: 'p1',
          title: 'Late check-out',
          issue: 'the facts say €25 a night.',
          quote: 'Free parking for guests',
        },
      },
    })
    if (!finding) throw new Error('no finding read')
    await renderWithProviders(<FromReview finding={finding} />)
    expect(screen.getByText('From the review')).toBeTruthy()
    expect(
      screen.getByText(
        '“Free parking for guests” — the facts say €25 a night.',
      ),
    ).toBeTruthy()
  })

  it('reads nothing from a view sent without a finding', () => {
    expect(reviewFindingOf({ version: 1, screen: 'home' })).toBeUndefined()
    expect(
      reviewFindingOf({
        from: { kind: 'finding', campaignId: 'c1', key: 'k1' },
      }),
    ).toBeUndefined()
  })
})
