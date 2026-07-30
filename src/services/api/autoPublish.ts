import { apiJson } from './http'

const BASE = '/api/auto-publish-allowlist'

/**
 * Which platforms this workspace may publish to without a human pressing the
 * button. The schedule endpoint consults it and routes a post to `scheduled`
 * (auto) or `scheduled_for_manual_publishing` — see `postStatusMachine.ts`.
 *
 * Keyed by **Zernio** platform id (`PlatformInfo.zernioId`, e.g. "linkedin"),
 * not our platform Sqid. Workspace-scoped: there is one list for the whole
 * tenant, so a change here reaches every campaign.
 */
type AllowlistBody = { platforms: string[] }

export function getAutoPublishAllowlist(): Promise<string[]> {
  return apiJson<AllowlistBody>(BASE, 'Unable to fetch the auto-publish allowlist').then(
    (r) => r.platforms ?? [],
  )
}

/**
 * Replace-not-append: the server removes any platform absent from the body,
 * and an empty array clears the list. Callers must send the full desired set,
 * which is why the mutation reads the cached list rather than posting a delta.
 */
export function setAutoPublishAllowlist(platforms: string[]): Promise<string[]> {
  return apiJson<AllowlistBody>(BASE, 'Unable to update the auto-publish allowlist', {
    method: 'PUT',
    body: { platforms },
  }).then((r) => r.platforms ?? [])
}
