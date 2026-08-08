import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { AuthLoginForm } from './AuthLoginForm'

const login = vi.fn()
const checkSession = vi.fn()
vi.mock('@/services/api/sessions', () => ({
  login: (...a: unknown[]) => login(...a),
  checkSession: () => checkSession(),
  invalidateSession: vi.fn(),
}))

const LOGIN_ROUTE = '/auth/login/'

async function signIn(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), 'ada@example.com')
  await user.type(screen.getByLabelText('Password'), 'Password1')
  await user.click(screen.getByRole('button', { name: /log in/i }))
}

beforeEach(() => {
  login.mockReset().mockResolvedValue({ id: 's1' })
  checkSession.mockReset().mockResolvedValue({ id: 'u1', email: 'ada@example.com' })
  localStorage.clear()
})

describe('AuthLoginForm', () => {
  it('returns the user to the page the guard bounced them from', async () => {
    const user = userEvent.setup()
    const { router } = await renderWithProviders(<AuthLoginForm />, {
      path: LOGIN_ROUTE,
      search: '?redirect=%2Fcampaigns%2Fabc',
    })

    await signIn(user)

    await waitFor(() => expect(router.state.location.pathname).toBe('/campaigns/abc'))
  })

  it('refuses a redirect that leaves the app', async () => {
    // The guard writes `location.href` into the param, so its value is
    // attacker-supplied: a login link carrying `?redirect=https://evil.example`
    // would otherwise hand the freshly-authenticated user straight to it.
    const user = userEvent.setup()
    const { router } = await renderWithProviders(<AuthLoginForm />, {
      path: LOGIN_ROUTE,
      search: `?redirect=${encodeURIComponent('https://evil.example/steal')}`,
    })

    await signIn(user)

    await waitFor(() => expect(login).toHaveBeenCalled())
    expect(router.state.location.href).not.toContain('evil.example')
    expect(router.state.location.pathname).toBe('/')
  })

  it('refuses a protocol-relative redirect too', async () => {
    // `//evil.example` starts with "/" and is still off-site — the reason
    // `safeRedirect` is more than a `startsWith` check.
    const user = userEvent.setup()
    const { router } = await renderWithProviders(<AuthLoginForm />, {
      path: LOGIN_ROUTE,
      search: `?redirect=${encodeURIComponent('//evil.example/steal')}`,
    })

    await signIn(user)

    await waitFor(() => expect(login).toHaveBeenCalled())
    expect(router.state.location.href).not.toContain('evil.example')
  })

  it('says why the login screen appeared, when it appeared uninvited', async () => {
    // Without this a session that died mid-edit reads as the app having
    // randomly logged you out.
    await renderWithProviders(<AuthLoginForm />, { path: LOGIN_ROUTE, search: '?expired=1' })

    expect(screen.getByText(/session expired/i)).toBeInTheDocument()
  })

  it('confirms a completed password reset', async () => {
    await renderWithProviders(<AuthLoginForm />, { path: LOGIN_ROUTE, search: '?reset=true' })

    expect(screen.getByText(/password has been changed/i)).toBeInTheDocument()
  })

  it('shows neither banner on a plain visit', async () => {
    await renderWithProviders(<AuthLoginForm />, { path: LOGIN_ROUTE })

    expect(screen.queryByText(/session expired/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/password has been changed/i)).not.toBeInTheDocument()
  })

  it('announces a rejected credential and clears it on the next keystroke', async () => {
    const user = userEvent.setup()
    login.mockRejectedValue(new Error('Invalid email or password'))
    await renderWithProviders(<AuthLoginForm />, { path: LOGIN_ROUTE })

    await signIn(user)
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')

    await user.type(screen.getByLabelText('Password'), '2')

    await waitFor(() =>
      expect(screen.getByRole('alert')).not.toHaveTextContent('Invalid email or password'),
    )
  })

  it('signs in anyway when the identity re-probe fails', async () => {
    // The login itself succeeded; a transient failure on the follow-up probe
    // must not strand the user on the login screen with a working session.
    const user = userEvent.setup()
    checkSession.mockRejectedValue(new Error('Server unavailable'))
    const { router } = await renderWithProviders(<AuthLoginForm />, { path: LOGIN_ROUTE })

    await signIn(user)

    // Navigating away is the whole assertion — the form unmounts with it, so
    // there is no error region left to inspect, which is the point.
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('does not reach the server for an empty form', async () => {
    const user = userEvent.setup()
    await renderWithProviders(<AuthLoginForm />, { path: LOGIN_ROUTE })

    await user.click(screen.getByRole('button', { name: /log in/i }))

    expect(login).not.toHaveBeenCalled()
  })
})
