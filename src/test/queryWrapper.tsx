import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * A query client for a component that reads reference data but is not being
 * tested on what it reads.
 *
 * `renderWithProviders` is the fuller harness and brings a real router with it,
 * at the cost of being async. Several suites render a presentational component
 * synchronously and only need a provider to exist — since CON-292 that includes
 * anything drawing a platform's mark, because resolving one from a sqid goes
 * through `usePlatformCatalog` and therefore through a query.
 *
 * Nothing answers the fetch, so the catalog stays empty and a mark resolves to
 * `undefined` — which is exactly what these tests want: they assert copy, and a
 * component that cannot draw a logo still has to render its words.
 */
export function QueryWrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
