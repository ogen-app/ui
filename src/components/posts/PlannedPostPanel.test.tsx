import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { QueryWrapper } from '@/test/queryWrapper'
import { useAssistantStore } from '@/stores/assistantStore'
import { getAllowedNextStatuses } from '@/lib/postStatusMachine'
import { BuiltFromIdeas, PlannedPostPanel } from './PlannedPostPanel'
import type { Post } from '@/types/posts'

// The real settings store persists to localStorage, which this environment
// lacks; the panel only needs its `openRightPanel`.
const openRightPanel = vi.hoisted(() => vi.fn())
vi.mock('@/stores/settingsStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/stores/settingsStore')>()
  const state = { openRightPanel }
  return {
    ...actual,
    useSettingsStore: Object.assign(
      (select: (s: typeof state) => unknown) => select(state),
      { getState: () => state, setState: () => {}, subscribe: () => () => {} },
    ),
  }
})

vi.mock('@/services/api/ideaPosts', () => ({
  listPostIdeas: vi.fn(async () => [
    {
      id: 'i1',
      title: 'Breakfast in the secret garden',
      origin: 'content_plan',
    },
    {
      id: 'i2',
      title: 'The spa that used to be a stable',
      origin: 'content_plan',
    },
  ]),
}))

const planned = {
  id: 'p1',
  campaign_id: 'c1',
  status: 'planned',
  content: '',
  title: 'Living history mini-series',
} as Post

describe('a planned post', () => {
  it('can only become a draft', () => {
    expect(getAllowedNextStatuses('planned')).toEqual(['draft'])
  })

  it('asks its own assistant to write the body, without sending', () => {
    const askFor = vi.fn()
    useAssistantStore.setState({ askFor })
    render(<PlannedPostPanel post={planned} />)
    expect(screen.getByText('No body yet.')).toBeTruthy()
    fireEvent.click(screen.getByText('WRITE THE POST'))
    expect(askFor).toHaveBeenCalledWith(
      'post:p1',
      'Write this post in full from its theses.',
    )
    expect(openRightPanel).toHaveBeenCalledWith('assistant')
  })

  it('says nothing once it has a body', () => {
    const { container } = render(
      <PlannedPostPanel post={{ ...planned, content: 'Written.' }} />,
    )
    expect(container.textContent).toBe('')
  })

  it('names the ideas it was built from', async () => {
    render(
      <QueryWrapper>
        <BuiltFromIdeas postId="p1" />
      </QueryWrapper>,
    )
    expect(await screen.findByText('Built from 2 ideas')).toBeTruthy()
    expect(screen.getByText('Breakfast in the secret garden')).toBeTruthy()
  })
})
