import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { i18next, loadLocaleResources } from '@/i18n'
import { ApiError } from '@/services/api/errors'
import type { TenantInvitePreview } from '@/services/api/signupAccess'
import { useAuthStore } from '@/stores/authStore'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { User } from '@/types/user'
import SignupPage from './page'

/**
 * `/signup` as CON-402's boards 1 and 2 draw it. The route guard (open mode →
 * register, signed in → plans) is the route file's; this is what the page
 * says once it has been chosen to render.
 */

const getTenantInvite =
  vi.fn<(token: string) => Promise<TenantInvitePreview | null>>()
vi.mock('@/services/api/signupAccess', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api/signupAccess')>()),
  getTenantInvite: (token: string) => getTenantInvite(token),
}))

const signup = vi.fn()
vi.mock('@/services/api/tenants', () => ({
  signup: (...a: unknown[]) => signup(...a),
}))
vi.mock('@/services/api/sessions', () => ({ invalidateSession: vi.fn() }))

vi.mock('@/hooks/useGoogleSignIn', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/useGoogleSignIn')>()),
  useGoogleSignInEnabled: () => true,
}))

const clearAllApplicationData = vi.fn()
vi.mock('@/lib/cache-utils', () => ({
  clearAllApplicationData: () => clearAllApplicationData(),
}))

const ROUTE = '/signup/'
const TOKEN = 'tok_tester_invite_1'
const INVITED = 'jane@acme.com'

function open(search = `?invite=${TOKEN}`) {
  return renderWithProviders(<SignupPage />, { path: ROUTE, search })
}

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Organization Name'), 'Acme Roasters')
  await user.type(screen.getByLabelText('First Name'), 'Jane')
  await user.type(screen.getByLabelText('Last Name'), 'Okafor')
  await user.type(screen.getByLabelText('Password'), 'Password1')
}

const SAM = {
  id: 'u9',
  firstName: 'Sam',
  lastName: 'Lee',
  email: 'sam@northwind.io',
  role: 'owner',
  created_at: '',
  updated_at: '',
} as User

beforeEach(() => {
  getTenantInvite.mockReset()
  getTenantInvite.mockResolvedValue({ email: INVITED, expiresAt: null })
  signup.mockReset()
  useAuthStore.getState().clearUser()
  sessionStorage.clear()
})

afterEach(async () => {
  await i18next.changeLanguage('en')
})

describe('/signup?invite= — a valid invite (1A)', () => {
  it('says it is the beta and that it costs nothing', async () => {
    await open()

    expect(
      await screen.findByRole('heading', { name: 'Join the Ogen beta' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Your workspace is complimentary/),
    ).toBeInTheDocument()
  })

  it('locks the email to the invited address', async () => {
    await open()

    const email = await screen.findByLabelText('Email')
    expect(email).toHaveValue(INVITED)
    expect(email).toHaveAttribute('readonly')
    expect(email).toHaveAccessibleDescription(
      'This is the address your invite was sent to.',
    )
  })

  it('redeems the invite on submit and goes straight into the app', async () => {
    const user = userEvent.setup()
    signup.mockResolvedValue({ id: 'u1', email: INVITED })
    const { router } = await open()
    await screen.findByLabelText('Email')

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => expect(signup).toHaveBeenCalledTimes(1))
    expect(signup.mock.calls[0][0]).toMatchObject({
      email: INVITED,
      inviteToken: TOKEN,
    })
    // Never `/plans`: a tester's workspace is never gated.
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('sends Google through return_to and remembers the invite for the way back', async () => {
    const user = userEvent.setup()
    await open()

    const google = await screen.findByRole('link', {
      name: /continue with google/i,
    })
    const href = new URL(google.getAttribute('href')!, 'http://app.test')
    expect(href.searchParams.get('return_to')).toBe(`/signup?invite=${TOKEN}`)
    // Not the workspace-invite parameter (CON-26): that is another kind of invite.
    expect(href.searchParams.get('invite_token')).toBeNull()

    google.addEventListener('click', (e) => e.preventDefault())
    await user.click(google)
    expect(sessionStorage.getItem('ogen.testerInvite')).toBe(TOKEN)
  })
})

describe('/signup?invite= — back from Google with another address (1B)', () => {
  it('says whose invite it is, and keeps both ways in', async () => {
    await open(`?invite=${TOKEN}&error=invite_email_mismatch`)

    const line = await screen.findByText(/This invite is for/)
    expect(line.closest('[role="alert"]')).toHaveTextContent(
      `This invite is for ${INVITED}. Sign up with that address, or use the form below.`,
    )
    expect(
      screen.getByRole('link', { name: /continue with google/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
  })

  it('shows the same line when the password submit is refused for the address', async () => {
    const user = userEvent.setup()
    signup.mockRejectedValue(
      new ApiError(403, 'different address', 'invite_email_mismatch'),
    )
    await open()
    await screen.findByLabelText('Email')

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText(/This invite is for/)).toBeInTheDocument()
    // Answered by that line, not by the server's prose under the button too.
    expect(screen.queryByText('different address')).not.toBeInTheDocument()
  })
})

describe('/signup?invite= — an invite that cannot be used (1C)', () => {
  it('shows the expired card and no form', async () => {
    getTenantInvite.mockResolvedValue(null)
    await open()

    expect(
      await screen.findByRole('heading', { name: 'This invite has expired' }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /continue with google/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /log in instead/i }),
    ).toHaveAttribute('href', '/auth/login')
  })

  it('swaps the form for it when a submit loses the race', async () => {
    const user = userEvent.setup()
    signup.mockRejectedValue(new ApiError(410, 'gone'))
    await open()
    await screen.findByLabelText('Email')

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(
      await screen.findByRole('heading', { name: 'This invite has expired' }),
    ).toBeInTheDocument()
  })

  it('offers a retry, not the expired card, when the preview merely failed', async () => {
    getTenantInvite.mockRejectedValue(new ApiError(503, 'down'))
    await open()

    expect(
      await screen.findByRole('button', { name: /try again/i }),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('This invite has expired'),
    ).not.toBeInTheDocument()
  })
})

describe('/signup?invite= — signed in on this browser (2B)', () => {
  it('names who is signed in and whose invite this is, and redeems nothing', async () => {
    useAuthStore.getState().setUser(SAM)
    await open()

    expect(
      await screen.findByRole('heading', {
        name: "You're signed in as Sam Lee",
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/This invite is for jane@acme.com/),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
    expect(signup).not.toHaveBeenCalled()
  })

  it('signs out and comes back to the same invite', async () => {
    const user = userEvent.setup()
    const logout = vi.fn().mockResolvedValue(undefined)
    useAuthStore.setState({ logout })
    useAuthStore.getState().setUser(SAM)
    const assign = vi.fn()
    const original = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...original, assign },
    })
    try {
      await open()
      await user.click(
        await screen.findByRole('button', { name: /sign out and continue/i }),
      )

      await waitFor(() =>
        expect(assign).toHaveBeenCalledWith(`/signup?invite=${TOKEN}`),
      )
      expect(logout).toHaveBeenCalled()
      expect(clearAllApplicationData).toHaveBeenCalled()
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: original,
      })
    }
  })

  it('stays signed in and goes back to the app', async () => {
    const user = userEvent.setup()
    useAuthStore.getState().setUser(SAM)
    const { router } = await open()

    await user.click(
      await screen.findByRole('button', { name: /stay signed in/i }),
    )

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })
})

describe('/signup while signup is invite-only (2A)', () => {
  it('says why there is no form, and how to ask', async () => {
    await open('')

    expect(
      await screen.findByRole('heading', { name: 'Ogen is in private beta' }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /continue with google/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'beta@getogen.com' }),
    ).toHaveAttribute('href', 'mailto:beta@getogen.com')
    expect(
      screen.getByRole('link', { name: 'Log in here' }),
    ).toBeInTheDocument()
  })
})

describe('in another language', () => {
  it('renders every new screen from the catalogue', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')

    await open('')
    expect(
      await screen.findByRole('heading', { name: 'Ogen está en beta privada' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/private beta/)).not.toBeInTheDocument()
  })

  it('renders the invite form from the catalogue', async () => {
    await loadLocaleResources('es')
    await i18next.changeLanguage('es')

    await open(`?invite=${TOKEN}&error=invite_email_mismatch`)
    expect(
      await screen.findByRole('heading', { name: 'Únete a la beta de Ogen' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Esta invitación es para/)).toBeInTheDocument()
    expect(screen.queryByText(/Join the Ogen beta/)).not.toBeInTheDocument()
    expect(
      screen.queryByText('This is the address your invite was sent to.'),
    ).not.toBeInTheDocument()
  })
})
