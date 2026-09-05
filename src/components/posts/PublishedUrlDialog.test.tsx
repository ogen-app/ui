import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { PublishedUrlDialog } from './PublishedUrlDialog'
import type { Post } from '@/types/posts'
import type { PostStatus } from '@/types/posts'

/**
 * The dialog's second exit — the one that does not ask Zernio (CON-165).
 *
 * The verify path is the happy one and the server owns it. What is asserted
 * here is the fallback, because it is where the permalink used to be thrown
 * away: the user pastes a link, Zernio cannot match it (LinkedIn personal
 * accounts have no listing API at all), and the only way forward published the
 * post with the link still sitting in an input that was about to unmount. There
 * is no second chance at that value — nothing else in the product ever asks for
 * it again — so what this really covers is a permanent data loss.
 */

const LINK = 'https://linkedin.com/feed/update/123'

function makePost(status: PostStatus): Post {
  return {
    id: 'po1',
    status,
    published_url: '',
    platform: { name: 'LinkedIn' },
  } as unknown as Post
}

async function open(status: PostStatus, saveUnverified = vi.fn()) {
  saveUnverified.mockResolvedValue({ ok: true, post: makePost('published') })
  await renderWithProviders(
    <PublishedUrlDialog
      post={makePost(status)}
      isOpen
      onClose={() => {}}
      verifyExternal={vi.fn()}
      saveUnverified={saveUnverified}
    />,
  )
  return saveUnverified
}

describe('publishing without verification', () => {
  it('hands over the link the user typed', async () => {
    const save = await open('scheduled_for_manual_publishing')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Post link'), LINK)
    await user.click(screen.getByRole('button', { name: /WITHOUT CHECKING/ }))

    expect(save).toHaveBeenCalledWith(LINK)
  })

  /**
   * An empty field is a real answer and has to stay one — it is what the
   * button originally said, and a user who genuinely does not have the link
   * must not be stuck behind a field they cannot fill.
   */
  it('publishes with an empty link when there is nothing to give', async () => {
    const save = await open('scheduled_for_manual_publishing')
    const user = userEvent.setup()

    await user.click(
      screen.getByRole('button', { name: "I DON'T HAVE THE LINK" }),
    )

    expect(save).toHaveBeenCalledWith('')
  })

  /**
   * Half a URL is not a permalink. Storing it would put a broken link on the
   * post's own screen, and the field stays filled in either way — so nothing is
   * lost by declining to record it, and the user can finish typing.
   */
  it('ignores a value that is not a link at all', async () => {
    const save = await open('scheduled_for_manual_publishing')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Post link'), 'linkedin')
    await user.click(
      screen.getByRole('button', { name: "I DON'T HAVE THE LINK" }),
    )

    expect(save).toHaveBeenCalledWith('')
  })

  /**
   * The already-published post previously had no way to record a link at all
   * once verification failed — only ADD LINK and CANCEL — which stranded
   * exactly the posts whose link matters most, since an unverifiable one has no
   * publisher linkage to fall back on.
   */
  it('lets an already-published post save a link Zernio will not match', async () => {
    const save = await open('published')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Post link'), LINK)
    await user.click(
      screen.getByRole('button', { name: 'SAVE WITHOUT CHECKING' }),
    )

    expect(save).toHaveBeenCalledWith(LINK)
  })

  it('still offers a plain cancel on a published post with nothing typed', async () => {
    await open('published')

    expect(screen.getByRole('button', { name: 'CANCEL' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /WITHOUT CHECKING/ }),
    ).not.toBeInTheDocument()
  })
})
