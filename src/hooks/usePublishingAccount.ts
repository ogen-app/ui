import { useMemo } from 'react'
import { usePlatformViews } from '@/hooks/usePlatforms.ts'
import { connectedAccounts } from '@/lib/platformDictionary'
import {
  accountLabel,
  resolvePublishingAccount,
  type PublishingAccountResolution,
} from '@/lib/publishingAccount'
import type { PublisherAccount } from '@/types/campaigns'

export type PublishingAccount = PublishingAccountResolution & {
  /** The name the platform would show on the post. */
  name: string | null
  /** `@handle`, where the platform has one and we know it. */
  username: string | null
  avatarUrl: string | null
  /** False when nothing is connected for this platform — nothing can publish. */
  connected: boolean
}

/**
 * Who this post publishes as: one of the platform's connected publisher
 * accounts, *not* the signed-in Ogen user.
 *
 * Three places have to agree on this — the quick-settings bar names it and
 * offers the choice, the preview renders as it, and the status machine
 * refuses to schedule without it — so the resolution lives here rather than
 * in any of them.
 *
 * Until CON-150 this guessed ("first active account wins"), matching a
 * backend that guessed the same way. Both sides now require an explicit
 * choice once a platform has more than one account, because guessing meant
 * publishing to whichever account happened to connect first.
 */
export function usePublishingAccount(
  platformId: string,
  /** The post's `social_account_id`. Empty means no choice has been made. */
  selectedAccountId = '',
  /** The post's hydrated `social_account`; names a disconnected choice. */
  hydrated?: PublisherAccount | null,
): PublishingAccount {
  const views = usePlatformViews()

  return useMemo(() => {
    const view = views.find((v) => v.platform.id === platformId)
    // Deliberately NOT filtered by `is_active`. These rows come from
    // `ListActive` (`deleted_at IS NULL`) — the same set the server counts
    // when it decides whether a choice is required. `is_active` is a
    // separate flag mirrored from Zernio, and narrowing by it here would
    // let the UI see one account where the schedule endpoint sees two.
    const accounts = view ? connectedAccounts(view) : []
    const resolved = resolvePublishingAccount(accounts, selectedAccountId, hydrated)

    return {
      ...resolved,
      // Null whenever the account is unresolved — including the ambiguous
      // case. This used to fall back to the publisher's own name, which now
      // would read as "publishes as Zernio" on a post whose account merely
      // hasn't been picked yet.
      name: resolved.account ? accountLabel(resolved.account) : null,
      username: resolved.account?.username || null,
      avatarUrl: resolved.account?.avatar_url || null,
      connected: accounts.length > 0,
    }
  }, [views, platformId, selectedAccountId, hydrated])
}
