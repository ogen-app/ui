import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHelpStore } from '@/stores/helpStore'
import { postStatuses } from '@/services/help/fixtures/concepts'
import { embed, p } from '@/services/help/fixtures/pt'
import { HelpArticleBody } from './HelpArticleBody'

// The app links need a router; nothing here follows one.
vi.mock('@tanstack/react-router', () => ({ useRouter: () => ({}) }))

beforeEach(() => {
  useHelpStore.setState({ isOpen: true, history: ['page-posts'] })
})

describe('HelpArticleBody — embedded concepts', () => {
  it('places the concept inside the page, under its own heading', () => {
    render(
      <HelpArticleBody
        body={[p('The page’s own words.'), embed(postStatuses)]}
      />,
    )

    expect(screen.getByText('The page’s own words.')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: postStatuses.title, level: 2 }),
    ).toBeInTheDocument()
    // The concept's own sub-heading steps down under it.
    expect(
      screen.getByRole('heading', { name: 'The seven statuses', level: 3 }),
    ).toBeInTheDocument()
  })

  it('opens the concept on its own, keeping the page behind it in the trail', async () => {
    render(<HelpArticleBody body={[embed(postStatuses)]} />)
    await userEvent.click(
      screen.getByRole('button', {
        name: `Open “${postStatuses.title}” on its own`,
      }),
    )
    expect(useHelpStore.getState().history).toEqual([
      'page-posts',
      'post-statuses',
    ])
  })

  it('renders nothing for a concept that did not resolve', () => {
    const { container } = render(
      <HelpArticleBody
        body={[{ _type: 'helpEmbed', _key: 'e', article: null }]}
      />,
    )
    expect(container.querySelector('section')).toBeNull()
  })
})
