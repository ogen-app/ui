import { createFileRoute } from '@tanstack/react-router'
import { AuthFormsDesignHarness } from './page'

/**
 * TEMPORARY — a design harness for the auth forms, not a product route. It
 * sits outside `_authenticated` (no app chrome) and outside the session probe
 * in `__root.tsx`, so it renders with the API down — which it needs to, since
 * it fakes the API itself. Delete the whole `routes/design/` folder and the
 * `/design` exemption in `__root.tsx` when the design is settled.
 */
export const Route = createFileRoute('/design/auth-forms/')({
  component: AuthFormsDesignHarness,
})
