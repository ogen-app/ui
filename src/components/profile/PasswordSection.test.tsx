import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { useAuthStore } from '@/stores/authStore'
import { PasswordSection } from './PasswordSection'

const requestPasswordReset = vi.fn()
const updateUser = vi.fn()
const login = vi.fn()

vi.mock('@/services/api/passwordReset', () => ({
  requestPasswordReset: (...a: unknown[]) => requestPasswordReset(...a),
  resetPassword: vi.fn(),
}))
vi.mock('@/services/api/users', () => ({
  updateUser: (...a: unknown[]) => updateUser(...a),
  deleteUser: vi.fn(),
}))
vi.mock('@/services/api/sessions', () => ({
  login: (...a: unknown[]) => login(...a),
  invalidateSession: vi.fn(),
  logout: vi.fn(),
  checkSession: vi.fn(),
}))

const USER = {
  id: 'u1',
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
}

const send = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: /email me a reset link/i }))

beforeEach(() => {
  requestPasswordReset.mockReset().mockResolvedValue(undefined)
  updateUser.mockReset()
  login.mockReset()
  useAuthStore.setState({ user: USER as never })
})

describe('PasswordSection', () => {
  it('changes the password by email and by nothing else', async () => {
    // CON-193: `PUT /api/users/:id` takes a new password from any live session
    // without asking for the old one, and revokes no sessions afterwards. The
    // in-app form that used to be here is gone precisely so this holds — the
    // update endpoint must never see a credential.
    const user = userEvent.setup()
    await renderWithProviders(<PasswordSection />, { path: '/profile/' })

    expect(screen.queryByLabelText(/current password/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument()

    await send(user)

    await waitFor(() => expect(requestPasswordReset).toHaveBeenCalledTimes(1))
    expect(updateUser).not.toHaveBeenCalled()
    expect(login).not.toHaveBeenCalled()
  })

  it('mails the signed-in address, which is never typed', async () => {
    // Read from the session rather than collected, so the card cannot be
    // pointed at anyone else's account.
    const user = userEvent.setup()
    await renderWithProviders(<PasswordSection />, { path: '/profile/' })

    await send(user)

    await waitFor(() => expect(requestPasswordReset).toHaveBeenCalled())
    expect(requestPasswordReset.mock.calls[0][0]).toBe(USER.email)
  })

  it('says where the link went, and what using it will do', async () => {
    // The device revocation is the whole reason this replaced the form, so it
    // is stated rather than discovered — including that it logs out this tab.
    const user = userEvent.setup()
    await renderWithProviders(<PasswordSection />, { path: '/profile/' })

    await send(user)

    expect(await screen.findByText(/on its way to/i)).toBeInTheDocument()
    expect(screen.getByText(USER.email)).toBeInTheDocument()
    expect(screen.getByText(/signs out every device/i)).toBeInTheDocument()
  })

  it('answers a resend, which otherwise changes nothing on screen', async () => {
    const user = userEvent.setup()
    await renderWithProviders(<PasswordSection />, { path: '/profile/' })

    await send(user)
    await user.click(await screen.findByRole('button', { name: /send it again/i }))

    expect(await screen.findByText(/sent again/i)).toBeInTheDocument()
    expect(requestPasswordReset).toHaveBeenCalledTimes(2)
  })

  it('keeps the confirmation when a resend is refused', async () => {
    // A 429 means the first link is already on its way; throwing the panel
    // away would lose the address the user was just told about.
    const user = userEvent.setup()
    await renderWithProviders(<PasswordSection />, { path: '/profile/' })

    await send(user)
    requestPasswordReset.mockRejectedValue(new Error('Too many requests'))
    await user.click(await screen.findByRole('button', { name: /send it again/i }))

    expect(await screen.findByText(/too many requests/i)).toBeInTheDocument()
    expect(screen.getByText(/on its way to/i)).toBeInTheDocument()
    expect(screen.queryByText(/sent again/i)).not.toBeInTheDocument()
  })

  it('tells the user up front that email is the route', async () => {
    // Before the click, not after: someone looking for a password field needs
    // to know why there isn't one.
    await renderWithProviders(<PasswordSection />, { path: '/profile/' })

    expect(screen.getByText(/changed by email/i)).toBeInTheDocument()
    expect(screen.getByText(/signs out your other devices/i)).toBeInTheDocument()
  })

  it('renders nothing without a session to mail', async () => {
    useAuthStore.setState({ user: null })
    await renderWithProviders(<PasswordSection />, { path: '/profile/' })

    expect(screen.queryByRole('button', { name: /reset link/i })).not.toBeInTheDocument()
  })
})
