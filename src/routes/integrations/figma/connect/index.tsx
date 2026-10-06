import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import FigmaConnectPage from './page'

/**
 * The plugin's `approve_url` (CON-338 §5.1). `key` is the pairing's write key;
 * optional in the schema so a truncated link renders our own "this link has
 * expired" screen rather than a router validation error — the same reasoning
 * as `/invite`.
 */
const figmaConnectSearchSchema = z.object({
  key: z.string().optional(),
})

// Deliberately outside `_authenticated`, like `/workspaces`: this is a detour
// opened from Figma, not a place in the app, so it renders no sidebar. It is
// *not* exempt from the session guard — approving needs a signed-in member —
// and `__root.tsx` sends a signed-out visitor to log in with this URL, `key`
// and all, as the `redirect` to come back to.
export const Route = createFileRoute('/integrations/figma/connect/')({
  validateSearch: figmaConnectSearchSchema,
  component: FigmaConnectPage,
})
