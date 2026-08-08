import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { AuthRegisterForm } from './AuthRegisterForm'

const signup = vi.fn()
vi.mock('@/services/api/tenants', () => ({ signup: (...a: unknown[]) => signup(...a) }))
vi.mock('@/services/api/sessions', () => ({ invalidateSession: vi.fn() }))

const VALID = {
  organization: 'Alephbet',
  first: 'Ada',
  last: 'Lovelace',
  email: 'ada@example.com',
  password: 'Password1',
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Organization Name'), VALID.organization)
  await user.type(screen.getByLabelText('First Name'), VALID.first)
  await user.type(screen.getByLabelText('Last Name'), VALID.last)
  await user.type(screen.getByLabelText('Email'), VALID.email)
  await user.type(screen.getByLabelText('Password'), VALID.password)
}

beforeEach(() => {
  signup.mockReset()
})

describe('AuthRegisterForm', () => {
  it('submits the organization and the first admin together', async () => {
    const user = userEvent.setup()
    signup.mockResolvedValue({ id: 'u1', email: VALID.email })
    await renderWithProviders(<AuthRegisterForm />)

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => expect(signup).toHaveBeenCalledTimes(1))
    // First argument only — TanStack Query passes its own context as a second.
    expect(signup.mock.calls[0][0]).toEqual({
      organizationName: VALID.organization,
      firstName: VALID.first,
      lastName: VALID.last,
      email: VALID.email,
      password: VALID.password,
    })
  })

  it('does not call the server when the form is invalid', async () => {
    const user = userEvent.setup()
    await renderWithProviders(<AuthRegisterForm />)

    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(signup).not.toHaveBeenCalled()
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
  })

  it('clears a server error as soon as the user edits anything', async () => {
    // The bug this covers: the form kept "email already registered" on screen
    // while the user corrected the email, contradicting the field they were
    // fixing. Every field retires the message — from here there is no way to
    // tell which edit was the fix.
    const user = userEvent.setup()
    signup.mockRejectedValue(new Error('That email is already registered'))
    await renderWithProviders(<AuthRegisterForm />)

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: /sign up/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/already registered/i)

    await user.type(screen.getByLabelText('Email'), 'x')

    await waitFor(() =>
      expect(screen.getByRole('alert')).not.toHaveTextContent(/already registered/i),
    )
  })

  it('announces a server failure rather than only drawing it', async () => {
    // Without a live region the only evidence of a failed signup is text that
    // appeared below a button the user is still focused on.
    const user = userEvent.setup()
    signup.mockRejectedValue(new Error('That email is already registered'))
    await renderWithProviders(<AuthRegisterForm />)

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('That email is already registered')
  })

  it('points the password field at the rules, which are its error message', async () => {
    await renderWithProviders(<AuthRegisterForm />)
    const password = screen.getByLabelText('Password')

    const describedBy = password.getAttribute('aria-describedby')
    expect(describedBy).toBe('password-rules')
    expect(document.getElementById(describedBy!)).toHaveTextContent(/min\. 8 chars/i)
  })

  it('names its fields so a password manager can save the credential', async () => {
    // Login and forgot always had `name`; signup silently didn't, so the
    // credential saved inconsistently between the two screens.
    await renderWithProviders(<AuthRegisterForm />)

    expect(screen.getByLabelText('Email')).toHaveAttribute('name')
    expect(screen.getByLabelText('Password')).toHaveAttribute('name')
  })
})
