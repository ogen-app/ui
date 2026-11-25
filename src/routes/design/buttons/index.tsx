import { createFileRoute } from '@tanstack/react-router'
import { ButtonsHarness } from './page'

/**
 * TEMPORARY — every button the app has, from fixtures, not a product route.
 * Outside `_authenticated` and the auth probe (`/design` exemption in
 * `__root.tsx`), so it runs with the API down. Never commit this directory.
 */
export const Route = createFileRoute('/design/buttons/')({
  component: ButtonsHarness,
})
