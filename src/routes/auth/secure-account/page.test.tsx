import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { i18next, loadLocaleResources } from '@/i18n'
import { formatDate } from '@/lib/intl'
import {
  LoginAlertError,
  type LoginAlert,
  type SecureAccountResult,
} from '@/services/api/loginAlerts'
import { useAuthStore } from '@/stores/authStore'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { User } from '@/types/user'
import SecureAccountPage from './page'

const getLoginAlert = vi.fn<(token: string) => Promise<LoginAlert>>()
const secureAccount = vi.fn<(token: string) => Promise<SecureAccountResult>>()
vi.mock('@/services/api/loginAlerts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api/loginAlerts')>()),
  getLoginAlert: (token: string) => getLoginAlert(token),
  secureAccount: (token: string) => secureAccount(token),
}))

const clearAllApplicationData = vi.fn()
vi.mock('@/lib/cache-utils', () => ({
  clearAllApplicationData: () => clearAllApplicationData(),
}))

const ROUTE = '/auth/secure-account/'
const TOKEN = 'tok_from_the_email'

const PENDING: LoginAlert = {
  status: 'pending',
  login_at: '2026-09-28T14:03:11Z',
  device: 'Chrome on macOS',
  ip: '203.0.113.42',
  location: 'Kyiv, Ukraine',
  email: 'j***@acme.com',
}

function open(search = `?token=${TOKEN}`) {
  return renderWithProviders(<SecureAccountPage />, { path: ROUTE, search })
}

const secureButton = () =>
  screen.findByRole('button', { name: /secure my account/i })

/** Point jsdom's location somewhere we can watch a full navigation leave. */
function watchNavigation() {
  const assign = vi.fn()
  const original = window.location
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...original, origin: 'https://app.example', assign },
  })
  return {
    assign,
    restore: () =>
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: original,
      }),
  }
}

beforeEach(() => {
  getLoginAlert.mockReset().mockResolvedValue(PENDING)
  secureAccount.mockReset()
  clearAllApplicationData.mockReset().mockResolvedValue(undefined)
  useAuthStore.setState({ user: null })
})

describe('/auth/secure-account', () => {
  it('describes the sign-in on load and revokes nothing', async () => {
    // Mail scanners open every link in an email. If loading the page did
    // anything, a scanner would sign the user out on their behalf.
    await open()

    expect(await secureButton()).toBeEnabled()
    expect(getLoginAlert).toHaveBeenCalledWith(TOKEN)
    expect(secureAccount).not.toHaveBeenCalled()

    expect(screen.getByText('j***@acme.com')).toBeInTheDocument()
    const details = screen.getByLabelText('Sign-in details')
    expect(within(details).getByText('Chrome on macOS')).toBeInTheDocument()
    expect(within(details).getByText('203.0.113.42')).toBeInTheDocument()
    expect(within(details).getByText('Kyiv, Ukraine')).toBeInTheDocument()
  })

  it("shows when in the viewer's own time zone, and names the zone", async () => {
    await open()
    await secureButton()

    const expected = formatDate(PENDING.login_at, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    })
    expect(screen.getByText(expected!)).toBeInTheDocument()
  })

  it('leaves out the location row when the server could not place the IP', async () => {
    getLoginAlert.mockResolvedValue({ ...PENDING, location: '' })
    await open()
    await secureButton()

    expect(screen.queryByText('Approximate location')).not.toBeInTheDocument()
  })

  it('sends one request however fast the button is clicked', async () => {
    secureAccount.mockReturnValue(new Promise(() => {}))
    await open()
    const button = await secureButton()

    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.click(button)

    await waitFor(() => expect(button).toBeDisabled())
    expect(secureAccount).toHaveBeenCalledTimes(1)
  })

  it('clears everything this browser holds, then leaves for the reset link', async () => {
    const nav = watchNavigation()
    try {
      useAuthStore.setState({ user: { id: 'u1' } as User })
      secureAccount.mockResolvedValue({
        reset_url: 'https://app.example/auth/reset?token=r',
        sessions_revoked: 3,
      })
      await open()

      fireEvent.click(await secureButton())

      await waitFor(() => expect(nav.assign).toHaveBeenCalledTimes(1))
      expect(nav.assign).toHaveBeenCalledWith(
        'https://app.example/auth/reset?token=r',
      )
      expect(useAuthStore.getState().user).toBeNull()
      expect(clearAllApplicationData).toHaveBeenCalled()
    } finally {
      nav.restore()
    }
  })

  it('refuses to navigate anywhere but http(s)', async () => {
    const nav = watchNavigation()
    try {
      secureAccount.mockResolvedValue({
        reset_url: 'javascript:alert(1)',
        sessions_revoked: 1,
      })
      await open()

      fireEvent.click(await secureButton())

      await waitFor(() =>
        expect(nav.assign).toHaveBeenCalledWith('/auth/forgot'),
      )
    } finally {
      nav.restore()
    }
  })

  it('says a link spent in another tab was used, even if it learns so on click', async () => {
    secureAccount.mockRejectedValue(new LoginAlertError('used'))
    await open()

    fireEvent.click(await secureButton())

    expect(
      await screen.findByText('This link has already been used'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /reset it here/i }),
    ).toHaveAttribute('href', '/auth/forgot')
  })

  it.each([
    ['used', 'This link has already been used'],
    ['expired', 'This link has expired'],
  ] as const)(
    'reads a %s token straight off the GET',
    async (status, title) => {
      getLoginAlert.mockResolvedValue({ ...PENDING, status })
      await open()

      expect(await screen.findByText(title)).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /secure my account/i }),
      ).not.toBeInTheDocument()
    },
  )

  it('offers a reset from an expired link — through Profile when still signed in', async () => {
    // Forgot password bounces a live session home, which would dead-end here.
    useAuthStore.setState({ user: { id: 'u1' } as User })
    getLoginAlert.mockRejectedValue(new LoginAlertError('expired'))
    await open()

    const reset = await screen.findByRole('link', {
      name: /reset my password/i,
    })
    expect(reset).toHaveAttribute('href', '/profile')
  })

  it('calls a link without a token invalid, without asking the server', async () => {
    await open('')

    expect(await screen.findByText("This link isn't valid")).toBeInTheDocument()
    expect(getLoginAlert).not.toHaveBeenCalled()
  })

  it('calls an unknown token invalid', async () => {
    getLoginAlert.mockRejectedValue(new LoginAlertError('invalid'))
    await open()

    expect(await screen.findByText("This link isn't valid")).toBeInTheDocument()
  })

  it('holds the button for as long as a rate limit says', async () => {
    secureAccount.mockRejectedValue(new LoginAlertError('rate_limited', 150))
    await open()
    const button = await secureButton()

    fireEvent.click(button)

    expect(
      await screen.findByText('Too many attempts. Try again in 3 minutes.'),
    ).toBeInTheDocument()
    expect(button).toBeDisabled()
  })

  it('keeps the sign-in on screen after a network failure, and lets the user try again', async () => {
    secureAccount
      .mockRejectedValueOnce(new LoginAlertError('unavailable'))
      .mockReturnValueOnce(new Promise(() => {}))
    await open()
    const button = await secureButton()

    fireEvent.click(button)

    expect(
      await screen.findByText(/couldn't reach Ogen, so nothing has changed/i),
    ).toBeInTheDocument()
    expect(screen.getByText('Chrome on macOS')).toBeInTheDocument()

    await waitFor(() => expect(button).toBeEnabled())
    fireEvent.click(button)
    await waitFor(() => expect(secureAccount).toHaveBeenCalledTimes(2))
    expect(secureAccount).toHaveBeenLastCalledWith(TOKEN)
  })

  it('offers a retry when the read itself fails', async () => {
    getLoginAlert.mockRejectedValueOnce(new LoginAlertError('unavailable'))
    const user = userEvent.setup()
    await open()

    await user.click(await screen.findByRole('button', { name: 'Try again' }))

    expect(await secureButton()).toBeInTheDocument()
    expect(getLoginAlert).toHaveBeenCalledTimes(2)
  })

  it('sends "This was me" home when signed in, and to log in when not', async () => {
    await open()
    await secureButton()
    expect(screen.getByRole('link', { name: 'This was me' })).toHaveAttribute(
      'href',
      '/auth/login',
    )
  })

  it('sends "This was me" home for a signed-in visitor', async () => {
    useAuthStore.setState({ user: { id: 'u1' } as User })
    await open()
    await secureButton()
    expect(screen.getByRole('link', { name: 'This was me' })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('sends no referrer while open, and restores the policy on leaving', async () => {
    const { unmount } = await open()
    await secureButton()

    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="referrer"]',
    )
    expect(meta?.content).toBe('no-referrer')

    unmount()
    expect(document.querySelector('meta[name="referrer"]')).toBeNull()
  })
})

describe('/auth/secure-account in Spanish', () => {
  beforeEach(async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')
  })

  afterEach(async () => {
    await i18next.changeLanguage('en')
  })

  it('renders from the catalogue, with none of the English left behind', async () => {
    await open()

    expect(
      await screen.findByRole('button', { name: 'PROTEGER MI CUENTA' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Protege tu cuenta de Ogen')).toBeInTheDocument()
    expect(screen.getByText('Dispositivo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'He sido yo' })).toBeInTheDocument()

    for (const english of [
      'Secure your Ogen account',
      'SECURE MY ACCOUNT',
      'Device',
      'IP address',
      'This was me',
    ]) {
      expect(screen.queryByText(english)).not.toBeInTheDocument()
    }
  })
})
