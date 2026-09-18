import {
  createRootRouteWithContext,
  Link,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { PageContainer } from '../components/page-primitives/PageContainer'
import { PageError } from '../components/page-primitives/PageError'
import { Button } from '../components/ui/button'
import {
  getActiveWorkspaceId,
  setActiveWorkspaceId,
} from '../lib/activeWorkspace'
import { ServerUnavailableError } from '../services/api/errors'
import { checkSession } from '../services/api/sessions'
import { listWorkspaces } from '../services/api/workspaces'
import { useAuthStore } from '../stores/authStore'

const SERVER_DOWN_PATH = '/server-unavailable'

export interface RouterContext {
  auth: {
    isAuthenticated: boolean
  }
}

/**
 * Runs a backend probe and reports whether the server was reachable. A
 * `ServerUnavailableError` (network rejection or a 5xx/proxy error) becomes
 * `{ reachable: false }` so the caller can branch on it with plain control
 * flow; any other error propagates. Isolating the try/catch here keeps the
 * route guard's redirects out of a try block.
 */
async function probe<T>(
  fn: () => Promise<T>,
): Promise<{ reachable: true; value: T } | { reachable: false }> {
  try {
    return { reachable: true, value: await fn() }
  } catch (err) {
    if (err instanceof ServerUnavailableError) return { reachable: false }
    throw err
  }
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ location }) => {
    // `/invite` is public for the same reason the auth routes are, and one
    // step further: the person following an emailed invitation has no account
    // to have a session with — accepting the token is what creates it (CON-26).
    const isAuthRoute =
      location.pathname === '/auth' ||
      location.pathname.startsWith('/auth/') ||
      location.pathname === '/invite' ||
      location.pathname.startsWith('/invite/')
    const isServerDownRoute = location.pathname === SERVER_DOWN_PATH

    // CON-97: there is no instance-wide first-run setup anymore — onboarding is
    // self-service signup (POST /api/tenants) at /auth/register. One probe of
    // GET /api/current_user does triple duty: reachability check (network/5xx
    // → ServerUnavailableError, distinct from a real 401), auth check, and
    // identity hydration (the user arrives with its embedded tenant).
    const session = await probe(checkSession)

    // Server unreachable — show the dedicated outage page (or stay if already
    // parked on it).
    if (!session.reachable) {
      if (isServerDownRoute) return { auth: { isAuthenticated: false } }
      throw redirect({ to: SERVER_DOWN_PATH })
    }

    // We reached the backend. If we were parked on the outage page waiting for
    // it to recover, send the user back into the app.
    if (isServerDownRoute) throw redirect({ to: '/' })

    const user = session.value

    if (!user && !isAuthRoute) {
      throw redirect({
        to: '/auth/login',
        search: { redirect: location.href },
      })
    }

    // Refresh the persisted auth store from the probe on every page load —
    // this also heals stale localStorage copies (e.g. a renamed workspace).
    // The probe answering "nobody" clears the store for the same reason: on
    // an exempt route (/invite, /auth/*) an expired session would otherwise
    // leave a persisted user that the accept screen reads as "signed in as X"
    // and branches wrong on.
    if (user) useAuthStore.getState().setUser(user)
    else useAuthStore.getState().clearUser()

    if (user) await seedActiveWorkspace()

    return { auth: { isAuthenticated: user !== null } }
  },
  component: () => <Outlet />,
  notFoundComponent: NotFound,
})

/**
 * Pins a fresh tab to the account's default workspace (CON-147).
 *
 * A tab with nothing pinned sends no `X-Workspace-Id`, and the server falls
 * back to the account's default — which reads like it would be fine to leave
 * alone. It isn't: the default is *shared account state*, so a second tab
 * switching workspaces would drag every unpinned tab along with it, which is
 * precisely the cross-tab interference per-request scoping exists to prevent.
 * Writing the resolved default down once, on the first load of each tab, is
 * what makes the tab's choice its own.
 *
 * Failures are swallowed. Without a pin the tab still works — it just rides the
 * default — so a hiccup here must not stand between the user and the app.
 */
async function seedActiveWorkspace(): Promise<void> {
  if (getActiveWorkspaceId()) return
  try {
    const workspaces = await listWorkspaces()
    const seed = workspaces.find((w) => w.is_default) ?? workspaces[0]
    if (seed) setActiveWorkspaceId(seed.id)
  } catch {
    // Ride the server's default for this page load.
  }
}

/** Named rather than inline, so it is a component the hooks rules can see. */
function NotFound() {
  const { t } = useTranslation()
  return (
    <PageContainer variant="fullscreen">
      <PageError
        subHeader={t('errors.notFound.code')}
        header={t('errors.notFound.title')}
        message={t('errors.notFound.message')}
        errorType={t('errors.notFound.type')}
        action={
          <Link to="/">
            <Button variant="outline">{t('errors.notFound.home')}</Button>
          </Link>
        }
      />
    </PageContainer>
  )
}
