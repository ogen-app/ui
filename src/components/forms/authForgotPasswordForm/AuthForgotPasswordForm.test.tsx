import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { AuthForgotPasswordForm } from './AuthForgotPasswordForm'

const requestPasswordReset = vi.fn()
vi.mock('@/services/api/passwordReset', () => ({
  requestPasswordReset: (...a: unknown[]) => requestPasswordReset(...a),
  resetPassword: vi.fn(),
}))

const EMAIL = 'ada@example.com'

async function ask(user: ReturnType<typeof userEvent.setup>, email = EMAIL) {
  await user.type(screen.getByLabelText('Email'), email)
  await user.click(screen.getByRole('button', { name: /send reset link/i }))
}

beforeEach(() => {
  requestPasswordReset.mockReset().mockResolvedValue(undefined)
})

describe('AuthForgotPasswordForm', () => {
  it('replaces the form with the confirmation, naming the address it used', async () => {
    const user = userEvent.setup()
    await renderWithProviders(<AuthForgotPasswordForm />, {
      path: '/auth/forgot/',
    })

    await ask(user)

    expect(await screen.findByText(/check your inbox/i)).toBeInTheDocument()
    expect(screen.getByText(EMAIL)).toBeInTheDocument()
    // The form is gone, not merely covered: the next action is in the inbox.
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
  })

  it('never says whether that address has an account', async () => {
    // The endpoint answers 202 either way precisely so it can't be used to
    // test whether an email is registered; copy that claimed mail was sent
    // would give away what the status code refuses to.
    const user = userEvent.setup()
    await renderWithProviders(<AuthForgotPasswordForm />, {
      path: '/auth/forgot/',
    })

    await ask(user)

    expect(
      await screen.findByText(/if.*has an Ogen account/i),
    ).toBeInTheDocument()
  })

  it('answers a resend, which otherwise changes nothing on screen', async () => {
    // The panel already says what it would say after a second send, so with no
    // confirmation the button reads as broken — and the obvious response to a
    // broken button is to press it again, which is what the rate limit refuses.
    const user = userEvent.setup()
    await renderWithProviders(<AuthForgotPasswordForm />, {
      path: '/auth/forgot/',
    })

    await ask(user)
    await user.click(
      await screen.findByRole('button', { name: /send it again/i }),
    )

    expect(await screen.findByText(/sent again/i)).toBeInTheDocument()
    expect(requestPasswordReset).toHaveBeenCalledTimes(2)
  })

  it('keeps the confirmation when a resend is refused', async () => {
    // The regression this guards: reading the panel off the mutation's
    // `isSuccess` would flip it back to the form on a 429, throwing away the
    // address the user was just told about — and the resend button with it.
    const user = userEvent.setup()
    await renderWithProviders(<AuthForgotPasswordForm />, {
      path: '/auth/forgot/',
    })

    await ask(user)
    requestPasswordReset.mockRejectedValue(
      new Error('Too many requests. Try again in 5 minutes.'),
    )
    await user.click(
      await screen.findByRole('button', { name: /send it again/i }),
    )

    expect(await screen.findByText(/too many requests/i)).toBeInTheDocument()
    expect(screen.getByText(/check your inbox/i)).toBeInTheDocument()
    expect(screen.getByText(EMAIL)).toBeInTheDocument()
  })

  it('reports a refused resend without contradicting the first send', async () => {
    // A 429 means the first link is already on its way, so this must not read
    // as the reset having failed.
    const user = userEvent.setup()
    await renderWithProviders(<AuthForgotPasswordForm />, {
      path: '/auth/forgot/',
    })

    await ask(user)
    requestPasswordReset.mockRejectedValue(new Error('Too many requests'))
    await user.click(
      await screen.findByRole('button', { name: /send it again/i }),
    )
    await screen.findByText(/too many requests/i)

    // One region for both outcomes, so the stale "Sent again" can't sit beside
    // the refusal that contradicts it.
    expect(screen.queryByText(/sent again/i)).not.toBeInTheDocument()
  })

  it('does not reach the server for an address that cannot be one', async () => {
    const user = userEvent.setup()
    await renderWithProviders(<AuthForgotPasswordForm />, {
      path: '/auth/forgot/',
    })

    await ask(user, 'not-an-email')

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
    expect(requestPasswordReset).not.toHaveBeenCalled()
  })

  it('puts the cursor on the field it rejected', async () => {
    // `noValidate` suppresses the browser bubble *and* the focus move that
    // comes with it; without this a failed submit is silent to a screen reader.
    const user = userEvent.setup()
    await renderWithProviders(<AuthForgotPasswordForm />, {
      path: '/auth/forgot/',
    })

    await ask(user, 'not-an-email')

    await waitFor(() => expect(screen.getByLabelText('Email')).toHaveFocus())
  })
})
