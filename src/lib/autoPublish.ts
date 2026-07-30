import { getPlatformInfo } from '@/lib/platformDictionary'
import type { PublishMethod } from '@/lib/postStatusMachine'

/**
 * Whether the workspace lets this platform publish on its own.
 *
 * The allowlist is keyed by Zernio platform id ("linkedin"), while posts and
 * campaigns carry our platform Sqid, so every read has to go through the
 * dictionary. Workspace-scoped: the same answer holds for every campaign.
 *
 * Mirrors the server's routing decision in the schedule endpoint. The server
 * remains the source of truth — it re-checks on every schedule, and a post the
 * UI offered as auto will still come back manual if the list changed
 * underneath. This exists so the UI stops offering a choice the server would
 * silently overrule.
 */
export function isAutoPublishAllowed(
  allowlist: string[] | undefined,
  platformId: string | null | undefined,
): boolean {
  if (!allowlist || !platformId) return false
  const info = getPlatformInfo(platformId)
  return info ? allowlist.includes(info.zernioId) : false
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
  platformId: string | null | undefined,
): PublishMethod {
  if (current === 'manual') return 'manual'
  return isAutoPublishAllowed(allowlist, platformId) ? 'auto' : 'manual'
}
