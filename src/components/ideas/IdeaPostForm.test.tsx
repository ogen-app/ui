import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { QueryWrapper } from '@/test/queryWrapper'
import { IdeaPostForm } from './IdeaPostForm'

const query = vi.hoisted(() => ({ failed: false, refetch: vi.fn() }))

vi.mock('@/hooks/useCampaigns', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/useCampaigns')>()),
  useCampaign: (id: string) => ({
    isPending: false,
    isError: query.failed,
    refetch: query.refetch,
    data:
      id && !query.failed
        ? {
            target_platforms: [
              { id: 'sq-ig', post_types: [] },
              { id: 'sq-th', post_types: [] },
            ],
          }
        : undefined,
  }),
}))
vi.mock('@/hooks/usePlatforms', () => ({
  usePlatformCatalog: () => ({
    resolve: (id: string) =>
      ({ 'sq-ig': { name: 'Instagram' }, 'sq-th': { name: 'Threads' } })[id],
  }),
}))

function open(campaignId: string | null, onSubmit = vi.fn()) {
  render(
    <IdeaPostForm
      verb="draft"
      ideaCount={3}
      campaignId={campaignId}
      onSubmit={onSubmit}
    >
      <button type="button">open</button>
    </IdeaPostForm>,
    { wrapper: QueryWrapper },
  )
  fireEvent.click(screen.getByText('open'))
  return onSubmit
}

describe('IdeaPostForm (CON-470)', () => {
  it('counts what a draft will make: per idea, or one from all, on each platform', () => {
    const onSubmit = open('c1')
    expect(screen.getByText('Draft 3 ideas')).toBeTruthy()
    expect(
      screen.getByText('Not scheduled, unless an idea has a day planned.'),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Instagram' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Threads' }))
    expect(screen.getByText('DRAFT 6 POSTS')).toBeTruthy()
    fireEvent.click(
      screen.getByRole('radio', {
        name: 'One post from all of them, on each platform',
      }),
    )
    fireEvent.click(screen.getByText('DRAFT 2 POSTS'))
    expect(onSubmit).toHaveBeenCalledWith({
      platformIds: ['sq-ig', 'sq-th'],
      together: true,
    })
  })

  it('leaves the platform to the ideas’ plans when they share no campaign', () => {
    const onSubmit = open(null)
    expect(screen.getByText(/aren’t filed under one campaign/)).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: 'DRAFT' }).pop()!)
    expect(onSubmit).toHaveBeenCalledWith({ platformIds: [], together: false })
  })

  it('says the platforms didn’t load, and tries again', () => {
    query.failed = true
    open('c1')
    expect(
      screen.getByText(/Couldn’t load the campaign’s platforms/),
    ).toBeTruthy()
    fireEvent.click(screen.getByText('TRY AGAIN'))
    expect(query.refetch).toHaveBeenCalled()
    query.failed = false
  })
})
