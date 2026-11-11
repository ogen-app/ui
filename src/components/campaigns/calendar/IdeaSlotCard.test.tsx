import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LinkedinLogoIcon, XLogoIcon } from '@phosphor-icons/react'
import { QueryWrapper } from '@/test/queryWrapper'
import { IdeaSlotCard } from './IdeaSlotCard'

const api = vi.hoisted(() => ({
  compile: vi.fn(async () => ({
    posts: [{ id: 'p9', title: 'Late check-out' }],
    ideas: [],
  })),
}))
vi.mock('@/services/api/ideaPosts', () => ({
  compileIdeas: api.compile,
  draftIdeas: vi.fn(async () => {}),
}))
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => vi.fn(),
}))
vi.mock('@/hooks/useCampaigns', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/useCampaigns')>()),
  useCampaign: () => ({
    isPending: false,
    data: {
      target_platforms: [
        { id: 'sq-li', post_types: [] },
        { id: 'sq-x', post_types: [] },
      ],
    },
  }),
}))
vi.mock('@/hooks/usePlatforms', () => ({
  usePlatformCatalog: () => ({
    resolve: (id: string) =>
      ({
        'sq-li': { name: 'LinkedIn', icon: LinkedinLogoIcon, color: '#0A66C2' },
        'sq-x': { name: 'X', icon: XLogoIcon, color: '#000' },
      })[id],
  }),
}))

const slot = {
  kind: 'idea' as const,
  id: 'i1',
  title: 'Late check-out as a booking reason',
  date: '2026-04-17',
  campaign_id: 'c1',
  campaign_name: 'Spring at Hotel de Russie',
  platform_id: 'sq-li',
  platform_post_type: null,
  phase_id: null,
  verdict: null,
}

describe('IdeaSlotCard', () => {
  it('is an idea, not a post, and compiles for the platforms asked on its date', async () => {
    render(
      <QueryWrapper>
        <IdeaSlotCard slot={slot} showCampaign={false} />
      </QueryWrapper>,
    )
    expect(screen.getByText('IDEA')).toBeTruthy()
    fireEvent.click(screen.getByText('COMPILE'))
    // The plan's platform is ticked, and the day is said rather than asked.
    expect(screen.getByText('from the idea’s plan')).toBeTruthy()
    expect(screen.getByText('Dated Fri, Apr 17, the idea’s day.')).toBeTruthy()
    fireEvent.click(screen.getByRole('checkbox', { name: /X/ }))
    fireEvent.click(screen.getByText('COMPILE 2 PLANNED POSTS'))
    await waitFor(() =>
      expect(api.compile).toHaveBeenCalledWith(['i1'], {
        campaign_id: 'c1',
        platform_ids: ['sq-li', 'sq-x'],
        target_date: '2026-04-17',
      }),
    )
  })

  it('won’t compile for no platform', () => {
    render(
      <QueryWrapper>
        <IdeaSlotCard slot={slot} showCampaign={false} />
      </QueryWrapper>,
    )
    fireEvent.click(screen.getByText('COMPILE'))
    fireEvent.click(screen.getByRole('checkbox', { name: /LinkedIn/ }))
    expect(screen.getByText('Pick at least one platform.')).toBeTruthy()
    // The trigger and, last, the form's own confirm.
    const confirm = screen.getAllByRole('button', { name: 'COMPILE' }).pop()
    expect((confirm as HTMLButtonElement).disabled).toBe(true)
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
