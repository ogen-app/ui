import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { useAuthStore } from '@/stores/authStore'
import { ChangePasswordSection } from './ChangePasswordSection'

const login = vi.fn()
const invalidateSession = vi.fn()
const updateUser = vi.fn()
const success = vi.fn()

vi.mock('@/services/api/sessions', () => ({
  login: (...a: unknown[]) => login(...a),
  invalidateSession: () => invalidateSession(),
  logout: vi.fn(),
  checkSession: vi.fn(),
}))
vi.mock('@/services/api/users', () => ({
  updateUser: (...a: unknown[]) => updateUser(...a),
  deleteUser: vi.fn(),
}))
vi.mock('@/stores/toastStore', () => ({
  toast: { success: (...a: unknown[]) => success(...a), error: vi.fn() },
}))

const USER = {
  id: 'u1',
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
}

const CURRENT = 'OldPassword1'
const NEXT = 'NewPassword1'

async function change(
  user: ReturnType<typeof userEvent.setup>,
  { current = CURRENT, next = NEXT, confirm = NEXT } = {},
) {
  if (current) await user.type(screen.getByLabelText('Current password'), current)
  if (next) await user.type(screen.getByLabelText('New password'), next)
  if (confirm) await user.type(screen.getByLabelText('Confirm new password'), confirm)
  await user.click(screen.getByRole('button', { name: /change password/i }))
}

beforeEach(() => {
  login.mockReset().mockResolvedValue({ id: 's2' })
  updateUser.mockReset().mockResolvedValue(USER)
  invalidateSession.mockReset()
  success.mockReset()
  useAuthStore.setState({ user: USER as never })
})

describe('ChangePasswordSection', () => {
  it('proves the current password before it changes anything', async () => {
    // CON-193: `PUT /api/users/:id` takes a new password from any live session
    // without asking for the old one, so a borrowed tab is enough to take the
    // account permanently. Until the server checks, this order is the check.
    const user = userEvent.setup()
    await renderWithProviders(<ChangePasswordSection />, { path: '/profile/' })

    await change(user)

    await waitFor(() => expect(updateUser).toHaveBeenCalledTimes(1))
    expect(login).toHaveBeenCalledTimes(1)
    expect(login.mock.invocationCallOrder[0]).toBeLessThan(updateUser.mock.invocationCallOrder[0])
  })

  it('re-authenticates as the signed-in user, not as whoever was typed', async () => {
    // The address comes from the store deliberately: a form that supplied one
    // could verify the current password against a different account entirely,
    // and then change this one.
    const user = userEvent.setup()
    await renderWithProviders(<ChangePasswordSection />, { path: '/profile/' })

    await change(user)

    await waitFor(() => expect(login).toHaveBeenCalled())
    expect(login.mock.calls[0][0]).toEqual({ email: USER.email, password: CURRENT })
  })

  it('never reaches the update endpoint when the current password is wrong', async () => {
    // The whole mitigation in one assertion: the wrong-password path must stop
    // at the session call, having changed nothing.
    const user = userEvent.setup()
    login.mockRejectedValue(new Error('invalid credentials'))
    await renderWithProviders(<ChangePasswordSection />, { path: '/profile/' })

    await change(user)

    expect(await screen.findByText(/not your current password/i)).toBeInTheDocument()
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('blames the field that was wrong, in its own words', async () => {
    // The server says "invalid credentials", which is true and reads as the
    // whole change having failed for some unknown reason. Here it has exactly
    // one cause and one field.
    const user = userEvent.setup()
    login.mockRejectedValue(new Error('invalid credentials'))
    await renderWithProviders(<ChangePasswordSection />, { path: '/profile/' })

    await change(user)

    const field = screen.getByLabelText('Current password')
    expect(await screen.findByText(/not your current password/i)).toBeInTheDocument()
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveAttribute('aria-describedby', 'currentPassword-error')
    // Not repeated in the generic slot, where it would read as a second,
    // unrelated failure.
    expect(screen.queryByText(/invalid credentials/i)).not.toBeInTheDocument()
  })

  it('reports a failure it cannot attribute to a field in the generic slot', async () => {
    const user = userEvent.setup()
    updateUser.mockRejectedValue(new Error('Server unavailable'))
    await renderWithProviders(<ChangePasswordSection />, { path: '/profile/' })

    await change(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('Server unavailable')
    expect(screen.queryByText(/not your current password/i)).not.toBeInTheDocument()
  })

  it('resends the identity unchanged, so a password change cannot rewrite it', async () => {
    // The endpoint requires name and email on every call. Sending anything but
    // the current values would make this form a silent identity editor.
    const user = userEvent.setup()
    await renderWithProviders(<ChangePasswordSection />, { path: '/profile/' })

    await change(user)

    await waitFor(() => expect(updateUser).toHaveBeenCalled())
    expect(updateUser.mock.calls[0][0]).toBe(USER.id)
    expect(updateUser.mock.calls[0][1]).toEqual({
      name: 'Ada Lovelace',
      email: USER.email,
      password: NEXT,
    })
  })

  it('drops the cached session probe, which the re-auth has just replaced', async () => {
    const user = userEvent.setup()
    await renderWithProviders(<ChangePasswordSection />, { path: '/profile/' })

    await change(user)

    await waitFor(() => expect(invalidateSession).toHaveBeenCalled())
  })

  it('empties the fields on success rather than leaving a password on screen', async () => {
    const user = userEvent.setup()
    await renderWithProviders(<ChangePasswordSection />, { path: '/profile/' })

    await change(user)

    await waitFor(() => expect(success).toHaveBeenCalledWith('Password changed'))
    expect(screen.getByLabelText('Current password')).toHaveValue('')
    expect(screen.getByLabelText('New password')).toHaveValue('')
    expect(screen.getByLabelText('Confirm new password')).toHaveValue('')
  })

  it('refuses to reuse the current password without asking the server', async () => {
    const user = userEvent.setup()
    await renderWithProviders(<ChangePasswordSection />, { path: '/profile/' })

    await change(user, { next: CURRENT, confirm: CURRENT })

    expect(await screen.findByText(/already your password/i)).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('says that this does not sign out the other devices', async () => {
    // CON-193 #2: the emailed reset revokes every session, this does not.
    // Someone changing their password because they think another device is in
    // the account has to be told, and told before they do it.
    await renderWithProviders(<ChangePasswordSection />, { path: '/profile/' })

    expect(screen.getByText(/does not sign out your other devices/i)).toBeInTheDocument()
  })

  it('puts the cursor on the field it rejected', async () => {
    const user = userEvent.setup()
    await renderWithProviders(<ChangePasswordSection />, { path: '/profile/' })

    await change(user, { current: '' })

    await waitFor(() => expect(screen.getByLabelText('Current password')).toHaveFocus())
  })
})
