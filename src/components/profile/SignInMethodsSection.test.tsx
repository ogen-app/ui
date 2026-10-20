import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { i18next, loadLocaleResources } from '@/i18n'
import { ApiError } from '@/services/api/errors'
import { useAuthStore } from '@/stores/authStore'
import type { AuthMethods } from '@/services/api/googleAuth'
import { SignInMethodsSection } from './SignInMethodsSection'

const getAuthMethods = vi.fn<() => Promise<AuthMethods>>()
const disconnectIdentity = vi.fn()
const requestPasswordReset = vi.fn()

vi.mock('@/config/featureFlags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/config/featureFlags')>()
  return { ...actual, useFeatureFlag: vi.fn(() => true) }
})
vi.mock('@/services/api/googleAuth', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/services/api/googleAuth')>()
  return {
    ...actual,
    getAuthMethods: () => getAuthMethods(),
    getAuthProviders: async () => ({ google: { enabled: true } }),
    disconnectIdentity: (...a: unknown[]) => disconnectIdentity(...a),
  }
})
vi.mock('@/services/api/passwordReset', () => ({
  requestPasswordReset: (...a: unknown[]) => requestPasswordReset(...a),
  resetPassword: vi.fn(),
}))

const USER = {
  id: 'u1',
  email: 'ada@acme.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
}

const GOOGLE = {
  provider: 'google' as const,
  email: 'ada.personal@gmail.com',
  linked_at: '2026-10-20T10:00:00Z',
}

const render = () =>
  renderWithProviders(<SignInMethodsSection />, { path: '/profile/' })

beforeEach(() => {
  getAuthMethods.mockReset()
  disconnectIdentity.mockReset().mockResolvedValue(undefined)
  requestPasswordReset.mockReset().mockResolvedValue(undefined)
  useAuthStore.setState({ user: USER as never })
})

describe('SignInMethodsSection', () => {
  it('offers to connect Google beside the password, through the server flow', async () => {
    getAuthMethods.mockResolvedValue({ has_password: true, identities: [] })
    await render()

    expect(
      await screen.findByRole('button', { name: /email me a reset link/i }),
    ).toBeInTheDocument()
    const connect = screen.getByRole('link', { name: 'CONNECT' })
    const href = new URL(connect.getAttribute('href') ?? '', 'http://app.test')
    expect(href.pathname).toBe('/api/auth/google/start')
    expect(href.searchParams.get('intent')).toBe('link')
    expect(href.searchParams.get('return_to')).toBe('/profile')
  })

  it('shows the connected Google address and disconnects it', async () => {
    getAuthMethods.mockResolvedValue({
      has_password: true,
      identities: [GOOGLE],
    })
    const user = userEvent.setup()
    await render()

    expect(
      await screen.findByText(/ada\.personal@gmail\.com/),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'DISCONNECT' }))
    await waitFor(() => expect(disconnectIdentity).toHaveBeenCalled())
    expect(disconnectIdentity.mock.calls[0][0]).toBe('google')
  })

  it('never lets a Google-only account remove its only way in', async () => {
    // No password: disconnecting would leave nothing to sign in with, so the
    // button is off and the reason is printed, not hidden in a tooltip.
    getAuthMethods.mockResolvedValue({
      has_password: false,
      identities: [GOOGLE],
    })
    await render()

    expect(
      await screen.findByRole('button', { name: 'DISCONNECT' }),
    ).toBeDisabled()
    expect(screen.getByText(/only way in/i)).toBeInTheDocument()
  })

  it('sets a first password through the same reset email', async () => {
    // There is no current password to ask for, so "set" is the emailed reset
    // under different words — and it mails the session's address.
    getAuthMethods.mockResolvedValue({
      has_password: false,
      identities: [GOOGLE],
    })
    const user = userEvent.setup()
    await render()

    await user.click(
      await screen.findByRole('button', { name: 'SET A PASSWORD' }),
    )
    await waitFor(() => expect(requestPasswordReset).toHaveBeenCalled())
    expect(requestPasswordReset.mock.calls[0][0]).toBe(USER.email)
    expect(await screen.findByText(/on its way to/i)).toBeInTheDocument()
  })

  it("explains the server's refusal when the password went away meanwhile", async () => {
    getAuthMethods.mockResolvedValue({
      has_password: true,
      identities: [GOOGLE],
    })
    disconnectIdentity.mockRejectedValue(
      new ApiError(409, 'set a password first', 'last_sign_in_method'),
    )
    const user = userEvent.setup()
    await render()

    await user.click(await screen.findByRole('button', { name: 'DISCONNECT' }))
    expect(await screen.findByText(/only way in/i)).toBeInTheDocument()
  })

  it('renders in Spanish, with none of the English left in', async () => {
    getAuthMethods.mockResolvedValue({
      has_password: false,
      identities: [GOOGLE],
    })
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
    try {
      await render()
      expect(
        await screen.findByText('Formas de iniciar sesión'),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'ELEGIR UNA CONTRASEÑA' }),
      ).toBeInTheDocument()
      expect(screen.queryByText('Sign-in methods')).not.toBeInTheDocument()
      expect(screen.queryByText(/only way in/i)).not.toBeInTheDocument()
    } finally {
      await i18next.changeLanguage('en')
    }
  })
})
