import type { ReactElement, ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'

/**
 * Renders a component that expects to be inside the app — a router and a query
 * client — without booting the app.
 *
 * The router is real rather than mocked. The auth forms navigate on success
 * (`/`, `/auth/login?reset=true`) and read their own search params, and a
 * mocked `useNavigate` would let a test pass while the redirect it asserts is
 * a call that never resolves to a route. A memory router answers the same
 * questions and records where it ended up.
 *
 * `path` mounts the component at a route id, for the forms that read search
 * params with `useSearch({ from })` — that call throws if the id isn't in the
 * tree, so the id here has to match the file route's exactly, trailing slash
 * and all.
 */
const MOUNTED = 'render-with-providers'

export async function renderWithProviders(
  ui: ReactElement,
  { path = '/', search = '' }: { path?: string; search?: string } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      // A test asserting a failure shouldn't wait through three retries first.
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  // Waited for after render: `router.load()` resolves the match, but the first
  // paint still lands a tick later, and without a marker to wait on every
  // query in the test races it.
  const wrap = (children: ReactNode) => (
    <QueryClientProvider client={queryClient}>
      <div data-testid={MOUNTED}>{children}</div>
    </QueryClientProvider>
  )

  const rootRoute = createRootRoute()
  const routes = [
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: () => wrap(ui),
      validateSearch: (raw: Record<string, unknown>) => raw,
    }),
  ]
  // Every destination the components under test navigate to, so a successful
  // submit lands somewhere real and `router.state.location` reads back as the
  // app would. `/workspace-settings` is where the connect flow returns
  // (CON-217) — both the picker's Cancel link and its success navigation.
  for (const other of [
    '/',
    '/auth/login/',
    '/auth/forgot/',
    '/workspace-settings',
  ]) {
    if (other === path) continue
    routes.push(
      createRoute({
        getParentRoute: () => rootRoute,
        path: other,
        component: () => null,
        validateSearch: (raw: Record<string, unknown>) => raw,
      }),
    )
  }

  const router = createRouter({
    routeTree: rootRoute.addChildren(routes),
    history: createMemoryHistory({ initialEntries: [`${path}${search}`] }),
  })

  // The router resolves its first match asynchronously, so a bare `render`
  // returns with an empty container and every query in the test misses.
  await router.load()

  // The memory router's generated types don't match the app's route tree, and
  // nothing here depends on them.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = render(<RouterProvider router={router as any} />)
  await screen.findByTestId(MOUNTED)

  return { ...result, router, queryClient }
}
