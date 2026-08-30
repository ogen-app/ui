import { beforeEach, describe, expect, it, vi } from 'vitest'

import { queryClient, type MutationErrorMeta } from './queryClient'
import * as sessionExpiry from './sessionExpiry'
import { useToastStore } from '@/stores/toastStore'

/**
 * Runs one mutation that always rejects, through the real client, so the
 * mutation-cache handler under test is the one that fires.
 */
async function failWith(error: unknown, meta?: MutationErrorMeta) {
  const mutation = queryClient.getMutationCache().build(queryClient, {
    mutationFn: async () => {
      throw error
    },
    meta,
  })
  await mutation.execute(undefined).catch(() => {})
  return useToastStore.getState().toasts
}

describe('the mutation-cache error default', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] })
  })

  it('toasts a rejected mutation that says nothing for itself', async () => {
    // The CON-164 case: no onError anywhere, so without this the failure is
    // invisible and the button looks dead.
    const toasts = await failWith(new Error('Unable to create post'))
    expect(toasts).toHaveLength(1)
    expect(toasts[0]).toMatchObject({
      variant: 'error',
      title: 'Unable to create post',
    })
  })

  it('reads the API message as the title, since that is how they are written', async () => {
    const toasts = await failWith(
      new Error('This campaign has 3 scheduled posts'),
    )
    expect(toasts[0].title).toBe('This campaign has 3 scheduled posts')
    expect(toasts[0].description).toBeUndefined()
  })

  it('puts the message under an errorTitle when the hook supplies one', async () => {
    const toasts = await failWith(new Error('Position 3 is taken'), {
      errorTitle: 'Unable to reorder media',
    })
    expect(toasts[0]).toMatchObject({
      title: 'Unable to reorder media',
      description: 'Position 3 is taken',
    })
  })

  it('drops the description when it would only echo the title', async () => {
    // Happens whenever the backend sends no message and the API falls back to
    // the same words the hook chose.
    const toasts = await failWith(new Error('Unable to delete post'), {
      errorTitle: 'Unable to delete post',
    })
    expect(toasts[0].description).toBeUndefined()
  })

  it('stays silent when the call site opted out', async () => {
    // Inline form errors, dialogs that turn a refusal into their next
    // question, hooks that triage the error themselves.
    expect(
      await failWith(new Error('boom'), { errorToast: false }),
    ).toHaveLength(0)
  })

  it('still says something when what was thrown is not an Error', async () => {
    const toasts = await failWith('a bare string')
    expect(toasts[0].title).toBe('Something went wrong')
  })

  it('still says something when an Error carries an empty message', async () => {
    const toasts = await failWith(new Error(''))
    expect(toasts[0].title).toBe('Something went wrong')
  })

  it('stays quiet while a session-expiry redirect is in flight', async () => {
    // Every request 401s at once, and `handleUnauthorized` is already taking
    // the user to the login screen. Each mutation blaming itself on the way
    // out would bury the one explanation that is true.
    const expiring = vi.spyOn(sessionExpiry, 'isSessionExpiring')
    expiring.mockReturnValue(true)
    try {
      expect(await failWith(new Error('Unable to update post'))).toHaveLength(0)
    } finally {
      expiring.mockRestore()
    }
  })
})
