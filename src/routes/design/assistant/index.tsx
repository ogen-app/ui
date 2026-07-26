import { createFileRoute } from '@tanstack/react-router'
import { AssistantDesignHarness } from './page'

/**
 * TEMPORARY — a design harness for the assistant panel, not a product route.
 * It sits outside `_authenticated` (no app chrome) and outside the auth probe
 * in `__root.tsx`, so it renders with the API down. Delete the whole
 * `routes/design/` folder and the `/design` exemption in `__root.tsx` when the
 * redesign lands.
 */
export const Route = createFileRoute('/design/assistant/')({
  component: AssistantDesignHarness,
})
