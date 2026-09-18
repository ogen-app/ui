import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from '@sentry/react'
import { queryClient } from './lib/queryClient'
import { routeTree } from './routeTree.gen'
import { Toaster } from './components/ui/toaster'
import { HelpDrawer } from './components/help/HelpDrawer'
import { LocaleSwitchOverlay } from './components/layout/LocaleSwitchOverlay'
import { AppErrorFallback } from './components/layout/AppErrorFallback'
import { FLAG_IDS } from './config/featureFlags'
import { DEV_TOOLS, bootstrapFlagOverrides } from './config/flagOverrides'
import { bootstrapAnalyticsDemo } from './services/api/analytics.demo'
import { initTelemetry } from './observability/sentry'
import { bootstrapLocale } from './stores/localeStore'
import './i18n'
import './index.css'

// Before `createRouter`, deliberately: this strips `?lang=` from the address
// bar, and the router reads `window.location` as it is constructed. It also
// puts the switching screen up synchronously when the resolved language isn't
// the bundled one, so the first paint is the loader rather than a flash of
// English. See `stores/localeStore.ts`.
bootstrapLocale()

// Also before `createRouter`, and for the same two reasons: `?ff=` is stripped
// from the address bar the router is about to read, and a flag forced by the
// link has to be in force before the first `beforeLoad` guard consults one.
// Folds away entirely in a production build. See `config/flagOverrides.ts`.
bootstrapFlagOverrides(FLAG_IDS)

// `?analytics=demo` — simulated numbers for the dashboard on a machine that
// measures nothing. Stripped here for the same reason, and folds away in a
// production build. See `services/api/analytics.demo.ts`.
bootstrapAnalyticsDemo()

// Only ever mounted on staging and in dev: with `DEV_TOOLS` a build-time
// `false` the ternary collapses and the marker's chunk is never emitted.
const OverrideMarker = DEV_TOOLS
  ? lazy(() => import('./devtools/OverrideMarker'))
  : () => null

// Reference-data prefetching moved to the authenticated layout's loader — at
// module scope it fired before the session probe and 401'd on the login page.
// See `lib/prefetch.ts`.

const router = createRouter({
  routeTree,
  context: {
    auth: { isAuthenticated: false },
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// After `createRouter` so browser-tracing can name transactions by route
// template, and before render so the error boundary and API instrumentation are
// in place for the first paint. A no-op unless `VITE_SENTRY_DSN` is set — dev is
// unaffected. See `observability/sentry.ts`.
initTelemetry(router)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* App-root error boundary: a React render crash shows a fallback rather
          than a white screen, and is reported to Sentry when telemetry is on.
          The fallback reloads rather than routing, since the router may be what
          broke. */}
      <ErrorBoundary fallback={<AppErrorFallback />}>
        <RouterProvider router={router} />
        {/* Mounted beside the router, not inside it: the drawer outlives any
            route, and navigating the app must never close the help you opened
            to read while doing it. */}
        <HelpDrawer />
        <LocaleSwitchOverlay />
        <Suspense fallback={null}>
          <OverrideMarker />
        </Suspense>
      </ErrorBoundary>
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
)
