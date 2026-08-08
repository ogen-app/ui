import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Testing Library only auto-cleans when vitest runs with `globals: true`, which
// this repo doesn't — without this, the second test in a file renders into a
// document that still holds the first one's tree and `getByRole` finds two.
afterEach(cleanup)

// jsdom has no layout, so it logs "Not implemented: Window's scrollTo()" every
// time the router navigates. It is noise from a method we never assert on.
window.scrollTo = () => {}
