import type { PublishMethod } from '@/lib/postStatusMachine'

/**
 * Whether the workspace lets this platform publish on its own.
 *
 * The allowlist is keyed by Zernio platform id ("linkedin"), and so is this —
 * callers holding a post's or campaign's sqid translate first, through
 * `usePlatformCatalog().resolve`. Workspace-scoped: the same answer holds for
 * every campaign.
 *
 * Mirrors the server's routing decision in the schedule endpoint. The server
 * remains the source of truth — it re-checks on every schedule, and a post the
 * UI offered as auto will still come back manual if the list changed
 * underneath. This exists so the UI stops offering a choice the server would
 * silently overrule.
 */
export function isAutoPublishAllowed(
  allowlist: string[] | undefined,
  zernioId: string | null | undefined,
): boolean {
  if (!allowlist || !zernioId) return false
  return allowlist.includes(zernioId)
}

/**
 * The publish method a post can actually use on a given platform.
 *
 * Called with the platform the post is *moving to*, so switching from an
 * auto-publishing channel to a manual-only one drops the post to manual rather
 * than carrying an intent the destination cannot honour. Manual is never
 * upgraded: choosing to publish by hand is a decision the platform's
 * capabilities should not overturn.
 */
export function resolvePublishMethod(
  current: PublishMethod,
  allowlist: string[] | undefined,
  zernioId: string | null | undefined,
): PublishMethod {
  if (current === 'manual') return 'manual'
  return isAutoPublishAllowed(allowlist, zernioId) ? 'auto' : 'manual'
}
