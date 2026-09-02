import type { PublisherAccount } from '@/types/campaigns'
import { connectedAccounts, type PlatformView } from '@/lib/platformDictionary'

/**
 * Who a post publishes as, once the platform's connected accounts and the
 * post's explicit choice are resolved against each other.
 *
 * Mirrors `checkAccountSelection` in
 * `src/post_actions/schedule/schedule.go` (CON-150). The server is the
 * source of truth and re-runs the same rules at schedule time and again in
 * the submit worker; this exists so the UI can offer the choice — and
 * refuse to schedule without it — before the request is sent.
 */
export type PublishingAccountResolution = {
  /** Every account connected for the platform, oldest first. */
  accounts: PublisherAccount[]
  /** The account this post publishes as, when that is knowable. */
  account: PublisherAccount | null
  /**
   * Two or more accounts are connected and the post names none of them.
   * The server rejects this with `account_selection_required` rather than
   * picking one, so the user has to.
   */
  ambiguous: boolean
  /**
   * The post names an account the platform doesn't have — disconnected
   * since it was chosen, or left behind by a platform change. Covers both
   * `account_unavailable` and `account_platform_mismatch`: the client can't
   * tell them apart and the fix is the same either way.
   */
  mismatched: boolean
}

/**
 * Resolves `selectedId` against the accounts connected for one platform.
 *
 * The no-choice path deliberately mirrors the server's asymmetry: zero or
 * one account resolves silently (the submit worker auto-selects the single
 * one, or fails `no_account_connected` — neither needs the user), while two
 * or more is the only case that demands a decision.
 */
export function resolvePublishingAccount(
  accounts: PublisherAccount[],
  selectedId: string,
  /**
   * The post's hydrated `social_account`, used only to *name* a choice that
   * is no longer in `accounts`. It never rescues the selection — a
   * disconnected account still can't publish, so `mismatched` stays true.
   */
  hydrated?: PublisherAccount | null,
): PublishingAccountResolution {
  if (selectedId) {
    const chosen = accounts.find((a) => a.id === selectedId) ?? null
    if (chosen) {
      return { accounts, account: chosen, ambiguous: false, mismatched: false }
    }
    return {
      accounts,
      account: hydrated?.id === selectedId ? hydrated : null,
      ambiguous: false,
      mismatched: true,
    }
  }
  return {
    accounts,
    account: accounts.length === 1 ? accounts[0] : null,
    ambiguous: accounts.length >= 2,
    mismatched: false,
  }
}

/**
 * The same resolution, starting from the whole platform list rather than one
 * platform's accounts — the shape a caller has when it holds `usePlatformViews()`
 * and needs an answer for many posts at once.
 *
 * `usePublishingAccount` is the hook form of this and calls it. A list that has
 * to resolve a screenful of posts cannot call a hook per row, so it calls this
 * instead; going through one function is what stops the two paths from drifting
 * into two different ideas of who a post publishes as.
 */
export function resolveForPlatform(
  views: PlatformView[],
  platformId: string,
  selectedId = '',
  hydrated?: PublisherAccount | null,
): PublishingAccountResolution {
  const view = views.find((v) => v.platform.id === platformId)
  return resolvePublishingAccount(
    view ? connectedAccounts(view) : [],
    selectedId,
    hydrated,
  )
}

/** The label a platform would show on the post, for a resolved account. */
export function accountLabel(account: PublisherAccount): string {
  return account.display_name || account.username
}
