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
        name: /^One post from all 3, per platform/,
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

describe('IdeaPostForm, as CON-485 draws it', () => {
  it('ticks what the ideas’ plans name, says how many each choice makes, and how many have a date', () => {
    const onSubmit = vi.fn()
    render(
      <IdeaPostForm
        verb="draft"
        ideaCount={3}
        campaignId="c1"
        plans={[
          {
            platformId: 'sq-ig',
            postType: 'carousel',
            targetDate: '2026-04-24',
          },
          {},
          {},
        ]}
        onSubmit={onSubmit}
      >
        <button type="button">open</button>
      </IdeaPostForm>,
      { wrapper: QueryWrapper },
    )
    fireEvent.click(screen.getByText('open'))
    // Ticked from the plan, and the button isn't blocked.
    expect(
      screen.getByRole('checkbox', { name: /^Instagram/ }),
    ).toHaveAttribute('data-state', 'checked')
    expect(screen.getByText('carousel · from the ideas’ plan')).toBeTruthy()
    expect(screen.getByText('3 drafts')).toBeTruthy()
    expect(screen.getByText('1 draft')).toBeTruthy()
    expect(
      screen.getByText('1 of 3 has a date; the rest stay unscheduled.'),
    ).toBeTruthy()
    fireEvent.click(screen.getByText('DRAFT 3 POSTS'))
    expect(onSubmit).toHaveBeenCalledWith({
      platformIds: ['sq-ig'],
      together: false,
    })
  })

  it('names one idea, and CANCEL closes it without running', () => {
    const onSubmit = vi.fn()
    render(
      <IdeaPostForm
        verb="draft"
        ideaCount={1}
        campaignId="c1"
        title="The kitchen garden"
        onSubmit={onSubmit}
      >
        <button type="button">open</button>
      </IdeaPostForm>,
      { wrapper: QueryWrapper },
    )
    fireEvent.click(screen.getByText('open'))
    expect(screen.getByText('Draft “The kitchen garden”')).toBeTruthy()
    fireEvent.click(screen.getByText('CANCEL'))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.queryByText('Draft “The kitchen garden”')).toBeNull()
  })

  it('dates one idea from its plan, and says when none or all of them have a day', () => {
    const { unmount } = render(
      <IdeaPostForm
        verb="draft"
        ideaCount={1}
        campaignId="c1"
        plans={[{ targetDate: '2026-11-26' }]}
        onSubmit={vi.fn()}
      >
        <button type="button">open</button>
      </IdeaPostForm>,
      { wrapper: QueryWrapper },
    )
    fireEvent.click(screen.getByText('open'))
    expect(screen.getByText(/^Dated .*26.*, the idea’s day\.$/)).toBeTruthy()
    expect(screen.queryByText(/Not scheduled/)).toBeNull()
    unmount()

    for (const [plans, words] of [
      [
        [{ targetDate: '2026-11-26' }, { targetDate: '2026-11-27' }],
        'Each dated on its idea’s planned day.',
      ],
      [[{}, {}], 'Not scheduled: none of the ideas has a day planned.'],
    ] as const) {
      const view = render(
        <IdeaPostForm
          verb="draft"
          ideaCount={2}
          campaignId="c1"
          plans={[...plans]}
          onSubmit={vi.fn()}
        >
          <button type="button">open</button>
        </IdeaPostForm>,
        { wrapper: QueryWrapper },
      )
      fireEvent.click(screen.getByText('open'))
      expect(screen.getByText(words)).toBeTruthy()
      view.unmount()
    }
  })
})
