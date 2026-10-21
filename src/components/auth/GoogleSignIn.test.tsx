import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { ApiError } from '@/services/api/errors'
import { AuthLoginForm } from '@/components/forms/authLoginForm'
import { AuthGoogleSignupForm } from '@/components/forms/authGoogleSignupForm'

const providers = vi.fn()
const completeGoogleSignup = vi.fn()

vi.mock('@/services/api/googleAuth', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/services/api/googleAuth')>()
  return {
    ...actual,
    getAuthProviders: () => providers(),
    completeGoogleSignup: (...a: unknown[]) => completeGoogleSignup(...a),
  }
})
vi.mock('@/services/api/sessions', () => ({
  login: vi.fn(),
  checkSession: vi.fn(),
  invalidateSession: vi.fn(),
}))

beforeEach(() => {
  providers.mockReset().mockResolvedValue({ google: { enabled: true } })
  completeGoogleSignup.mockReset()
})

describe('Continue with Google on the login form', () => {
  it('starts the server flow and carries the return path', async () => {
    await renderWithProviders(<AuthLoginForm />, {
      path: '/auth/login/',
      search: '?redirect=%2Fcampaigns%2Fabc',
    })

    const link = await screen.findByRole('link', {
      name: /continue with google/i,
    })
    const href = new URL(link.getAttribute('href') ?? '', 'http://app.test')
    expect(href.pathname).toBe('/api/auth/google/start')
    expect(href.searchParams.get('return_to')).toBe('/campaigns/abc')
    expect(screen.getByText('or with your email')).toBeInTheDocument()
  })

  it('is absent when this server has no Google client configured', async () => {
    providers.mockResolvedValue({ google: { enabled: false } })
    await renderWithProviders(<AuthLoginForm />, { path: '/auth/login/' })

    await waitFor(() => expect(providers).toHaveBeenCalled())
    expect(
      screen.queryByRole('link', { name: /continue with google/i }),
    ).not.toBeInTheDocument()
  })
})

describe('AuthGoogleSignupForm', () => {
  const PENDING = {
    email: 'jane@gmail.com',
    name: 'Jane Cooper',
    expires_at: '2026-10-20T10:15:00Z',
  }
  const render = () =>
    renderWithProviders(
      <AuthGoogleSignupForm token="tok" pending={PENDING} />,
      { path: '/auth/register/google/' },
    )

  it('shows who is signing up, with a way to pick another account', async () => {
    await render()
    expect(await screen.findByText('Jane Cooper')).toBeInTheDocument()
    expect(screen.getByText('jane@gmail.com')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Not you?' }).getAttribute('href'),
    ).toMatch(/\/api\/auth\/google\/start$/)
  })

  it('asks for the organization name and nothing else', async () => {
    const user = userEvent.setup()
    await render()

    await user.click(
      await screen.findByRole('button', { name: /create workspace/i }),
    )
    expect(completeGoogleSignup).not.toHaveBeenCalled()
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument()
  })

  it('creates the workspace and lands where the person was headed', async () => {
    completeGoogleSignup.mockResolvedValue({
      user: { id: 'u1', email: 'jane@gmail.com' },
      returnTo: '/campaigns',
    })
    const user = userEvent.setup()
    const { router } = await render()

    await user.type(
      await screen.findByLabelText('Organization name'),
      'Acme Studio',
    )
    await user.click(screen.getByRole('button', { name: /create workspace/i }))

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/campaigns'),
    )
    expect(completeGoogleSignup.mock.calls[0]).toEqual(['tok', 'Acme Studio'])
  })

  it('sends a taken address back to Google, which now finds the account', async () => {
    completeGoogleSignup.mockRejectedValue(
      new ApiError(409, 'email already in use', 'email_in_use'),
    )
    const user = userEvent.setup()
    await render()

    await user.type(
      await screen.findByLabelText('Organization name'),
      'Acme Studio',
    )
    await user.click(screen.getByRole('button', { name: /create workspace/i }))

    expect(
      await screen.findByText(/already uses this email/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Continue with Google' }),
    ).toBeInTheDocument()
  })
})
