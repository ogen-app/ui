import { usePlatformViews } from '@/hooks/usePlatforms.ts'
import type { PublisherAccount } from '@/types/campaigns'

export type PublishingAccount = {
  /** The name the platform would show on the post. */
  name: string | null
  /** `@handle`, where the platform has one and we know it. */
  username: string | null
  avatarUrl: string | null
  /** False when nothing is connected for this platform — nothing can publish. */
  connected: boolean
  account: PublisherAccount | null
}

/**
 * Who this post publishes as: the connected publisher's account for the given
 * platform, *not* the signed-in Ogen user. Two places need to agree on this —
 * the quick-settings bar names it, the preview renders as it — so the
 * resolution (active account first, publisher name as a last resort) lives
 * here rather than in either component.
 */
export function usePublishingAccount(platformId: string): PublishingAccount {
  const views = usePlatformViews()
  const view = views.find((v) => v.platform.id === platformId)
  const accounts = view?.connectedPublishers[0]?.accounts ?? []
  const account = accounts.find((a) => a.is_active) ?? accounts[0] ?? null

  return {
    name: account?.display_name || account?.username || view?.connectedPublisherName || null,
    username: account?.username || null,
    avatarUrl: account?.avatar_url || null,
    connected: (view?.connectedPublishers.length ?? 0) > 0,
    account,
  }
}
