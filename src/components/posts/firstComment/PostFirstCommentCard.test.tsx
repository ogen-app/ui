import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { i18next, loadLocaleResources } from '@/i18n'
import { renderWithProviders } from '@/test/renderWithProviders'
import { PostFirstCommentCard } from './PostFirstCommentCard'
import type { Post } from '@/types/posts'

/**
 * The editor's First comment card (CON-361), in each of the shapes the
 * mockups draw: offered, written, over the limit, on a type that takes none,
 * and locked with what became of it.
 */

const COMMENT = 'Full guide with 12 templates → https://ogen.app/guides'

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 'po1',
    status: 'draft',
    published_at: null,
    first_comment: '',
    first_comment_delay_minutes: 0,
    first_comment_status: null,
    ...overrides,
  } as Post
}

/** The card over a live document, so a write lands where the next render reads. */
function Harness({
  initial,
  limit,
  locked = false,
  onChange,
}: {
  initial: Post
  limit: number | undefined
  locked?: boolean
  onChange?: (post: Post) => void
}) {
  const [post, setPost] = useState(initial)
  return (
    <PostFirstCommentCard
      post={post}
      changeDoc={(fn) =>
        setPost((p) => {
          const next = structuredClone(p)
          fn(next)
          onChange?.(next)
          return next
        })
      }
      limit={limit}
      target="X (Text post)"
      locked={locked}
    />
  )
}

describe('PostFirstCommentCard — drafting', () => {
  it('offers a comment, then takes one', async () => {
    let latest: Post | undefined
    await renderWithProviders(
      <Harness
        initial={makePost()}
        limit={1250}
        onChange={(p) => (latest = p)}
      />,
    )
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'ADD FIRST COMMENT' }))
    await user.type(screen.getByLabelText('First comment'), 'Link ')

    // The trailing space survives in the field — the server trims what it
    // stores — and the counter measures what it will store.
    expect(latest?.first_comment).toBe('Link ')
    expect(screen.getByLabelText('First comment')).toHaveValue('Link ')
    expect(screen.getByText('4 / 1,250')).toBeInTheDocument()
    expect(screen.getByText('Post it')).toBeInTheDocument()
  })

  it('is not offered at all on a type that takes none', async () => {
    await renderWithProviders(<Harness initial={makePost()} limit={0} />)
    expect(screen.queryByText('First comment')).not.toBeInTheDocument()
  })

  /**
   * Switching to a type that takes none keeps the text — switching back is the
   * likeliest next move — and says why it cannot go out, with the delay gone.
   */
  it('keeps the text on a type that takes none, and says so', async () => {
    await renderWithProviders(
      <Harness initial={makePost({ first_comment: COMMENT })} limit={0} />,
    )
    expect(screen.getByLabelText('First comment')).toHaveValue(COMMENT)
    expect(
      screen.getByText(/X \(Text post\) doesn’t take a first comment/),
    ).toBeInTheDocument()
    expect(screen.queryByText('Post it')).not.toBeInTheDocument()
  })

  it('marks an over-limit comment', async () => {
    await renderWithProviders(
      <Harness initial={makePost({ first_comment: 'abcdef' })} limit={4} />,
    )
    expect(screen.getByLabelText('First comment')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(screen.getByText('6 / 4')).toHaveClass('text-destructive')
  })

  it('clears the comment and its delay on REMOVE', async () => {
    let latest: Post | undefined
    await renderWithProviders(
      <Harness
        initial={makePost({
          first_comment: COMMENT,
          first_comment_delay_minutes: 5,
        })}
        limit={1250}
        onChange={(p) => (latest = p)}
      />,
    )
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'REMOVE' }))
    expect(latest?.first_comment).toBe('')
    expect(latest?.first_comment_delay_minutes).toBe(0)
    expect(
      screen.getByRole('button', { name: 'ADD FIRST COMMENT' }),
    ).toBeInTheDocument()
  })
})

describe('PostFirstCommentCard — locked', () => {
  it('shows the comment as the record, with no way to change it', async () => {
    await renderWithProviders(
      <Harness
        initial={makePost({
          status: 'scheduled',
          first_comment: COMMENT,
          first_comment_delay_minutes: 3,
        })}
        limit={1250}
        locked
      />,
    )
    expect(screen.getByText(COMMENT)).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('Posts ~3 min after publish')).toBeInTheDocument()
  })

  it('renders nothing for a locked post without a comment', async () => {
    await renderWithProviders(
      <Harness
        initial={makePost({ status: 'published' })}
        limit={1250}
        locked
      />,
    )
    expect(screen.queryByText('First comment')).not.toBeInTheDocument()
  })

  it('names a permission failure and offers the reconnect', async () => {
    await renderWithProviders(
      <Harness
        initial={makePost({
          status: 'published',
          published_at: '2026-10-09T14:00:00Z',
          first_comment: COMMENT,
          first_comment_status: 'failed',
          first_comment_error:
            'the account lacks permission to comment; reconnect it and allow comments',
        })}
        limit={1250}
        locked
      />,
    )
    expect(
      screen.getByText('Not posted: the account isn’t allowed to comment.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Reconnect account' }),
    ).toHaveAttribute('href', '/workspace-settings')
  })

  it('passes any other failure through as it was reported', async () => {
    await renderWithProviders(
      <Harness
        initial={makePost({
          status: 'published',
          first_comment: COMMENT,
          first_comment_status: 'failed',
          first_comment_error: 'zernio: comment rejected',
        })}
        limit={1250}
        locked
      />,
    )
    expect(
      screen.getByText('Not posted: zernio: comment rejected'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})

/**
 * The only way to tell a catalogued string from a literal: render in another
 * language. Spanish is gated off for users, never for i18next.
 */
describe('PostFirstCommentCard — localisation', () => {
  it('renders from the catalogue', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    try {
      await renderWithProviders(
        <Harness initial={makePost({ first_comment: COMMENT })} limit={1250} />,
      )
      expect(screen.getByText('Primer comentario')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'QUITAR' })).toBeInTheDocument()
      expect(screen.getByText('Publicarlo')).toBeInTheDocument()
      expect(screen.queryByText('First comment')).not.toBeInTheDocument()
      expect(screen.queryByText('Post it')).not.toBeInTheDocument()
      expect(screen.queryByText('REMOVE')).not.toBeInTheDocument()
    } finally {
      await i18next.changeLanguage('en')
    }
  })
})
