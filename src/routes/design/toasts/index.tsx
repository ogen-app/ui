import { createFileRoute } from '@tanstack/react-router'
import { ToastsDesignHarness } from './page'

/**
 * TEMPORARY — a design harness for the toast deck, not a product route. It
 * sits outside `_authenticated` (no app chrome) and outside the auth probe in
 * `__root.tsx`, so it renders with the API down. Delete the whole
 * `routes/design/` folder and the `/design` exemption in `__root.tsx` when the
 * design is settled.
 */
export const Route = createFileRoute('/design/toasts/')({
  component: ToastsDesignHarness,
})
