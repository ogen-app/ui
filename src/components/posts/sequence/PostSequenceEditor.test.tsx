import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { PostSequenceEditor } from './PostSequenceEditor'
import { evaluateSequence, newThreadItem, type ThreadItem } from '@/lib/threadSequence'
import type { PostAttachmentWithValidation } from '@/types/attachments'

/**
 * The editor's own behaviour, not the model's — `threadSequence.test.ts` owns
 * the rules. What is asserted here is the part a reader of the component
 * cannot check by eye: that each post is measured on its own, that the actions
 * hand the model the right indices, and that an upload's files are claimed by
 * the post they were started from rather than by the root.
 */

const LIMIT = 280

function items(...contents: string[]): ThreadItem[] {
  return contents.map((c) => newThreadItem(c))
}

function attachment(id: string): PostAttachmentWithValidation {
  return {
    id,
    post_id: 'post-1',
    position: 0,
    mime_type: 'image/jpeg',
    size_bytes: 1000,
    width: 100,
    height: 100,
    is_animated: false,
    page_count: 0,
    duration_ms: 0,
    codec: '',
    checksum_sha256: '',
    s3_key: `k/${id}`,
    presigned_url: `https://example.test/${id}`,
    created_by: 'user-1',
    created_at: '2026-08-29T00:00:00Z',
    platform_validation: [],
  }
}

type Update = (fn: (items: ThreadItem[]) => ThreadItem[]) => void

/** The updater the component handed `update`, for the call being asserted. */
function updaterFrom(update: Update, call = 0) {
  return vi.mocked(update).mock.calls[call][0]
}

function renderEditor(
  seq: ThreadItem[],
  overrides: {
    attachments?: PostAttachmentWithValidation[]
    update?: Update
    upload?: (files: File[]) => Promise<{ uploaded: number; errors: string[]; ids: string[] }>
  } = {},
) {
  const attachments = overrides.attachments ?? []
  const update: Update = overrides.update ?? vi.fn()
  const upload =
    overrides.upload ?? vi.fn().mockResolvedValue({ uploaded: 0, errors: [], ids: [] })

  render(
    <PostSequenceEditor
      items={seq}
      reports={evaluateSequence({
        items: seq,
        attachments,
        charLimit: LIMIT,
        imageCap: 4,
        videoCap: 1,
      })}
      attachments={attachments}
      charLimit={LIMIT}
      imageCap={4}
      platformName="X (Twitter)"
      readOnly={false}
      update={update}
      upload={upload}
    />,
  )
  return { update, upload }
}

describe('PostSequenceEditor', () => {
  it('gives every post its own box and its own counter', () => {
    renderEditor(items('First post', 'Second post'))

    expect(screen.getByLabelText('Post 1 of 2')).toHaveValue('First post')
    expect(screen.getByLabelText('Post 2 of 2')).toHaveValue('Second post')
    expect(screen.getByText('10/280')).toBeInTheDocument()
    expect(screen.getByText('11/280')).toBeInTheDocument()
  })

  it('calls a post too long on its own length, not the thread’s', () => {
    // Together these are well past 280; individually neither is.
    renderEditor(items('a'.repeat(200), 'b'.repeat(200)))

    expect(screen.queryByText(/will reject this post/)).not.toBeInTheDocument()
  })

  it('names the platform when one post is over', () => {
    renderEditor(items('ok', 'c'.repeat(300)))

    expect(
      screen.getByText('Past 280 characters — X (Twitter) will reject this post.'),
    ).toBeInTheDocument()
  })

  it('edits the post that was typed in, leaving the others alone', () => {
    const { update } = renderEditor(items('one', 'two'))

    fireEvent.change(screen.getByLabelText('Post 2 of 2'), {
      target: { value: 'two, edited' },
    })

    expect(updaterFrom(update)(items('one', 'two')).map((i) => i.content)).toEqual([
      'one',
      'two, edited',
    ])
  })

  it('adds a post after the one whose divider was used', () => {
    const { update } = renderEditor(items('one', 'two'))

    fireEvent.click(screen.getByLabelText('Add a post after post 1'))

    expect(updaterFrom(update)(items('one', 'two')).map((i) => i.content)).toEqual([
      'one',
      '',
      'two',
    ])
  })

  it('draws the files a post carries, and the root keeps the unnamed ones', () => {
    const seq = items('one', 'two')
    seq[1].attachment_ids = ['b']
    renderEditor(seq, { attachments: [attachment('a'), attachment('b')] })

    expect(screen.getByLabelText('On post 1')).toBeInTheDocument()
    expect(screen.getByLabelText('On post 2')).toBeInTheDocument()
  })

  it('claims an upload for the post it was started from', async () => {
    const upload = vi
      .fn()
      .mockResolvedValue({ uploaded: 1, errors: [], ids: ['new-1'] })
    const { update } = renderEditor(items('one', 'two'), { upload })

    const inputs = document.querySelectorAll('input[type="file"]')
    const file = new File(['x'], 'x.jpg', { type: 'image/jpeg' })
    fireEvent.change(inputs[1], { target: { files: [file] } })

    await vi.waitFor(() => expect(update).toHaveBeenCalled())
    const next = updaterFrom(update)(items('one', 'two'))
    expect(next[1].attachment_ids).toEqual(['new-1'])
    expect(next[0].attachment_ids).toEqual([])
  })
})
