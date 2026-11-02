import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { AltTextControl } from './AltTextControl'
import type { PostAttachmentWithValidation } from '@/types/attachments'

function image(
  overrides: Partial<PostAttachmentWithValidation> = {},
): PostAttachmentWithValidation {
  return {
    id: 'att1',
    mime_type: 'image/png',
    alt_text: '',
    alt_text_edited_by_user: false,
    platform_validation: [],
    ...overrides,
  } as PostAttachmentWithValidation
}

async function openEditor(onSave: (altText: string) => Promise<unknown>) {
  await renderWithProviders(
    <AltTextControl
      attachment={image()}
      limit={1000}
      frozen={false}
      onSave={onSave}
    />,
  )
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Edit alt text' }))
  return user
}

describe('AltTextControl', () => {
  it('keeps the dialog and the draft when the save fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('boom'))
    const user = await openEditor(onSave)

    await user.type(screen.getByRole('textbox'), 'A red bicycle')
    await user.click(screen.getByRole('button', { name: 'SAVE' }))

    expect(onSave).toHaveBeenCalledWith('A red bicycle')
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'SAVE' })).toBeEnabled(),
    )
    expect(screen.getByRole('textbox')).toHaveValue('A red bicycle')
  })

  it('closes once the save lands', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const user = await openEditor(onSave)

    await user.type(screen.getByRole('textbox'), 'A red bicycle')
    await user.click(screen.getByRole('button', { name: 'SAVE' }))

    await waitFor(() =>
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument(),
    )
  })

  it('refuses text over the platform cap', async () => {
    await renderWithProviders(
      <AltTextControl
        attachment={image()}
        limit={5}
        frozen={false}
        onSave={vi.fn()}
      />,
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit alt text' }))
    await user.type(screen.getByRole('textbox'), 'too long')

    expect(screen.getByRole('button', { name: 'SAVE' })).toBeDisabled()
  })
})
