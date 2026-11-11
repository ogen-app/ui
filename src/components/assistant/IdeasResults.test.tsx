import { fireEvent, screen } from '@testing-library/react'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { i18next, loadLocaleResources } from '@/i18n'
import { renderWithProviders } from '@/test/renderWithProviders'
import { useAssistantStore } from '@/stores/assistantStore'
import type { IdeasResults as Results } from '@/types/assistant'
import { IdeasResults } from './IdeasResults'

vi.mock('@/hooks/usePlatforms', () => ({
  usePlatformCatalog: () => ({
    resolve: (slug: string) =>
      ({ instagram: { name: 'Instagram' }, linkedin: { name: 'LinkedIn' } })[
        slug
      ],
  }),
}))

const undo = vi.fn(async () => {})

beforeEach(() => {
  undo.mockClear()
  useAssistantStore.setState({ undo })
})

function show(results: Results, campaignId: string | undefined = 'c1') {
  return renderWithProviders(
    <IdeasResults
      threadId="campaign:c1"
      turnId="t1"
      campaignId={campaignId}
      results={results}
      undoStates={{}}
    />,
  )
}

describe('triage', () => {
  it('names the pile a verdict put the idea in, and undoes it', async () => {
    await show({
      decided: {
        idea: { id: 'i1', title: 'The pool', verdict: 'yes' },
        undoId: 'u1',
      },
    })
    expect(screen.getByText('Making: The pool')).toBeTruthy()
    fireEvent.click(screen.getByText('UNDO'))
    expect(undo).toHaveBeenCalledWith('campaign:c1', 't1', 'u1')
  })

  it('lists what was found with OPEN to the campaign’s ideas', async () => {
    await show({
      found: {
        total: 12,
        ideas: [{ id: 'i1', title: 'The pool' }],
      },
    })
    expect(screen.getByText('12 ideas')).toBeTruthy()
    expect(screen.getByText('On the desk')).toBeTruthy()
    expect(screen.getByText('and 11 more')).toBeTruthy()
    expect(screen.getByText('OPEN').getAttribute('href')).toBe(
      '/campaigns/c1/ideas',
    )
  })

  it('says a delete has no undo, and what it couldn’t do', async () => {
    await show({ deleted: { done: 3, failed: 1 } })
    expect(screen.getByText('3 ideas deleted')).toBeTruthy()
    expect(screen.getByText('1 idea couldn’t be changed')).toBeTruthy()
    expect(screen.queryByText('UNDO')).toBeNull()
  })
})

describe('compile and draft', () => {
  it('draws a planned post per platform, each dated or not, with one UNDO', async () => {
    await show({
      compiled: {
        posts: [
          { postId: 'p1', title: 'Water, not rooms', platformId: 'instagram' },
          {
            postId: 'p9',
            title: 'Water, not rooms',
            platformId: 'linkedin',
            date: '2026-11-26',
          },
        ],
        campaignId: 'c1',
        ideas: 3,
        grounding: {
          mode: 'grounded',
          sources: [{ id: 'a1', title: 'Brochure' }],
        },
        undoId: 'u3',
      },
    })
    expect(screen.getByText('Planned posts')).toBeTruthy()
    expect(screen.getByText('Water, not rooms')).toBeTruthy()
    expect(screen.getByText('built from 3 ideas')).toBeTruthy()
    expect(screen.getByText('Instagram · not scheduled')).toBeTruthy()
    expect(screen.getByText('LinkedIn · Thu, Nov 26')).toBeTruthy()
    expect(screen.getByText('Brochure')).toBeTruthy()
    expect(
      screen.getAllByText('OPEN').map((a) => a.getAttribute('href')),
    ).toEqual(['/campaigns/c1/posts/p1', '/campaigns/c1/posts/p9'])
    fireEvent.click(screen.getByText('UNDO'))
    expect(undo).toHaveBeenCalledWith('campaign:c1', 't1', 'u3')
  })

  it('marks a draft that isn’t grounded', async () => {
    await show({
      drafted: {
        warnings: [],
        posts: [
          {
            postId: 'p2',
            title: 'The rooftop',
            platformId: 'instagram',
            grounding: { mode: 'exploratory', sources: [] },
          },
        ],
      },
    })
    expect(screen.getByText('1 draft')).toBeTruthy()
    expect(screen.getByText('none scheduled')).toBeTruthy()
    expect(
      screen.getByText('Instagram · not scheduled · not grounded').className,
    ).toContain('text-warning')
    expect(screen.getByText('Not grounded')).toBeTruthy()
  })

  it('says which drafts got a date and which are unscheduled', async () => {
    await show({
      drafted: {
        warnings: [],
        posts: [
          {
            postId: 'p2',
            title: 'The rooftop',
            platformId: 'instagram',
            grounding: { mode: 'grounded', sources: [] },
          },
          {
            postId: 'p3',
            title: 'The kitchen garden',
            platformId: 'instagram',
            publishDate: '2026-11-26',
            grounding: { mode: 'grounded', sources: [] },
          },
        ],
      },
    })
    expect(screen.getByText('1 not scheduled')).toBeTruthy()
    expect(
      screen.getByText('Instagram · not scheduled · grounded'),
    ).toBeTruthy()
    expect(screen.getByText('Instagram · Thu, Nov 26 · grounded')).toBeTruthy()
  })
})

describe('reads', () => {
  it('says what a selection shares, and how many carry each', async () => {
    await show({
      common: {
        ideas: [
          { id: 'i1', title: 'A' },
          { id: 'i2', title: 'B' },
          { id: 'i3', title: 'C' },
        ],
        shared: [
          {
            kind: 'platforms',
            values: [{ value: 'linkedin', label: 'linkedin', ideaIds: ['i1'] }],
          },
        ],
      },
    })
    expect(screen.getByText('What 3 ideas share')).toBeTruthy()
    expect(screen.getByText('LinkedIn (1 of 3)')).toBeTruthy()
  })

  it('names the fields an edit changed', async () => {
    await show({
      edited: {
        idea: { id: 'i1', title: 'A pool in the rock' },
        changed: ['title', 'plan.platformId'],
        undoId: 'u4',
      },
    })
    expect(screen.getByText('changed its title and platform')).toBeTruthy()
  })
})

describe('in Spanish', () => {
  afterAll(async () => {
    await i18next.changeLanguage('en')
  })

  it('words the cards', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    await show({ deleted: { done: 3, failed: 0 } })
    expect(screen.getByText('3 ideas eliminadas')).toBeTruthy()
    expect(screen.queryByText('3 ideas deleted')).toBeNull()
  })
})
