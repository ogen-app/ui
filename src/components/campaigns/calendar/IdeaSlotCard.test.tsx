import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { QueryWrapper } from '@/test/queryWrapper'
import { IdeaSlotCard } from './IdeaSlotCard'

const api = vi.hoisted(() => ({
  compile: vi.fn(async () => ({
    post: { id: 'p9', title: 'Late check-out' },
    ideas: [],
  })),
}))
vi.mock('@/services/api/ideaPosts', () => ({
  compileIdeas: api.compile,
  draftIdeas: vi.fn(async () => {}),
}))

const slot = {
  kind: 'idea' as const,
  id: 'i1',
  title: 'Late check-out as a booking reason',
  date: '2026-04-17',
  campaign_id: 'c1',
  campaign_name: 'Spring at Hotel de Russie',
  platform_id: null,
  platform_post_type: null,
  phase_id: null,
  verdict: null,
}

describe('IdeaSlotCard', () => {
  it('is an idea, not a post, and compiles on its date', async () => {
    render(
      <QueryWrapper>
        <IdeaSlotCard slot={slot} showCampaign={false} />
      </QueryWrapper>,
    )
    expect(screen.getByText('IDEA')).toBeTruthy()
    fireEvent.click(screen.getByText('COMPILE'))
    await waitFor(() =>
      expect(api.compile).toHaveBeenCalledWith(['i1'], {
        campaign_id: 'c1',
        target_date: '2026-04-17',
      }),
    )
  })

  it('names its campaign on the workspace calendar', () => {
    render(
      <QueryWrapper>
        <IdeaSlotCard slot={slot} showCampaign />
      </QueryWrapper>,
    )
    expect(screen.getByText(/Spring at Hotel de Russie/)).toBeTruthy()
  })
})
