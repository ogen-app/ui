/**
 * Starts the workspace stubs in the browser.
 *
 * Development-only and opt-out: set `VITE_STUB_WORKSPACES=false` in
 * `.env.local` to talk to the real API for everything and watch the workspace
 * calls 404. Production builds never reach this — the import in `main.tsx` is
 * guarded by `import.meta.env.DEV`, so the worker and its handlers are
 * tree-shaken out of the bundle.
 */

import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { resetDb } from './db'

export const worker = setupWorker(...handlers)

export async function startWorkspaceStubs(): Promise<void> {
  await worker.start({
    // The service worker script lives at the app root; `quiet` keeps the
    // console for the app's own logs.
    serviceWorker: { url: '/mockServiceWorker.js' },
    quiet: true,
    // Every non-workspace request is passed through by an explicit handler,
    // so anything reaching here is outside `/api` (assets, HMR) and is not
    // worth a warning.
    onUnhandledRequest: 'bypass',
  })

  // A reset hatch for manual testing — the seed is only reachable by clearing
  // storage, and digging through devtools for the key is tedious.
  Object.assign(window, {
    __resetWorkspaceStubs: () => {
      resetDb()
      location.reload()
    },
  })

  console.info(
    '[stubs] workspace endpoints are mocked (src/mocks/handlers.ts). ' +
      'window.__resetWorkspaceStubs() restores the seed.',
  )
}
