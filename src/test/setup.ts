import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Initialise i18next (English is bundled and resolves synchronously) so
// component tests render real copy instead of raw catalogue keys. Importing
// the module is the initialisation — `main.tsx` does the same thing.
import '@/i18n'

// Testing Library only auto-cleans when vitest runs with `globals: true`, which
// this repo doesn't — without this, the second test in a file renders into a
// document that still holds the first one's tree and `getByRole` finds two.
afterEach(cleanup)

// jsdom has no layout, so it logs "Not implemented: Window's scrollTo()" every
// time the router navigates. It is noise from a method we never assert on.
window.scrollTo = () => {}

// Nor does it have media queries, and `useIsMobile` — which every page reaches
// through the sidebar — calls `matchMedia` in an effect. Always "not mobile":
// jsdom's window is 1024px wide, so that is the truthful answer, and no test
// asserts on the breakpoint.
window.matchMedia = (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList
