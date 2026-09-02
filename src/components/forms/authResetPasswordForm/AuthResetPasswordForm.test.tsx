import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { AuthResetPasswordForm } from './AuthResetPasswordForm'

const resetPassword = vi.fn()
vi.mock('@/services/api/passwordReset', () => ({
  resetPassword: (...a: unknown[]) => resetPassword(...a),
  requestPasswordReset: vi.fn(),
}))

const TOKEN = 'tok_from_the_email'
const NEW = 'Password1'
const RESET_ROUTE = '/auth/reset/'

async function setPassword(
  user: ReturnType<typeof userEvent.setup>,
  { password = NEW, confirm = NEW } = {},
) {
  if (password) await user.type(screen.getByLabelText('New password'), password)
  if (confirm)
    await user.type(screen.getByLabelText('Confirm new password'), confirm)
  await user.click(screen.getByRole('button', { name: /set new password/i }))
}

beforeEach(() => {
  resetPassword.mockReset().mockResolvedValue(undefined)
})

describe('AuthResetPasswordForm', () => {
  it('spends the token from the link, which the user never sees or types', async () => {
    const user = userEvent.setup()
    await renderWithProviders(<AuthResetPasswordForm token={TOKEN} />, {
      path: RESET_ROUTE,
    })

    await setPassword(user)

    await waitFor(() => expect(resetPassword).toHaveBeenCalledTimes(1))
    expect(resetPassword.mock.calls[0].slice(0, 2)).toEqual([TOKEN, NEW])
  })

  it('sends the user to log in rather than opening a session', async () => {
    // Resetting proves control of the mailbox, not of the password — and a
    // reset is exactly the moment someone else may have been in the account.
    // The `reset` flag is what makes the login screen explain itself.
    const user = userEvent.setup()
    const { router } = await renderWithProviders(
      <AuthResetPasswordForm token={TOKEN} />,
      {
        path: RESET_ROUTE,
      },
    )

    await setPassword(user)

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/auth/login'),
    )
    expect(router.state.location.search).toMatchObject({ reset: true })
  })

  it('refuses a mismatched confirmation without asking the server', async () => {
    // The confirmation field is the only check there is: this sets a credential
    // the user cannot see and will not use again until their next login,
    // possibly on another device.
    const user = userEvent.setup()
    await renderWithProviders(<AuthResetPasswordForm token={TOKEN} />, {
      path: RESET_ROUTE,
    })

    await setPassword(user, { confirm: 'Password2' })

    expect(await screen.findByText(/do not match/i)).toBeInTheDocument()
    expect(resetPassword).not.toHaveBeenCalled()
  })

  it('refuses a password the rules reject', async () => {
    const user = userEvent.setup()
    await renderWithProviders(<AuthResetPasswordForm token={TOKEN} />, {
      path: RESET_ROUTE,
    })

    await setPassword(user, { password: 'short', confirm: 'short' })

    expect(resetPassword).not.toHaveBeenCalled()
  })

  it('offers a way out of a spent link instead of only naming the failure', async () => {
    // A dead token is the one failure here the user can actually act on, and
    // the action is on another screen.
    const user = userEvent.setup()
    resetPassword.mockRejectedValue(new Error('This link has expired'))
    await renderWithProviders(<AuthResetPasswordForm token={TOKEN} />, {
      path: RESET_ROUTE,
    })

    await setPassword(user)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('This link has expired')
    expect(
      screen.getByRole('link', { name: /request a new link/i }),
    ).toBeInTheDocument()
  })

  it('retires the failure — and the way out — once the user edits', async () => {
    const user = userEvent.setup()
    resetPassword.mockRejectedValue(new Error('This link has expired'))
    await renderWithProviders(<AuthResetPasswordForm token={TOKEN} />, {
      path: RESET_ROUTE,
    })

    await setPassword(user)
    await screen.findByText('This link has expired')

    await user.type(screen.getByLabelText('New password'), '2')

    await waitFor(() =>
      expect(
        screen.queryByText('This link has expired'),
      ).not.toBeInTheDocument(),
    )
    expect(
      screen.queryByRole('link', { name: /request a new link/i }),
    ).not.toBeInTheDocument()
  })

  it('points the password field at the rules, which are its error message', async () => {
    await renderWithProviders(<AuthResetPasswordForm token={TOKEN} />, {
      path: RESET_ROUTE,
    })

    const password = screen.getByLabelText('New password')
    expect(password).toHaveAttribute('aria-describedby', 'password-rules')
    expect(document.getElementById('password-rules')).toHaveTextContent(
      /min\. 8 chars/i,
    )
  })

  it('puts the cursor on the field it rejected', async () => {
    const user = userEvent.setup()
    await renderWithProviders(<AuthResetPasswordForm token={TOKEN} />, {
      path: RESET_ROUTE,
    })

    await setPassword(user, { confirm: 'Password2' })

    await waitFor(() =>
      expect(screen.getByLabelText('Confirm new password')).toHaveFocus(),
    )
  })
})
