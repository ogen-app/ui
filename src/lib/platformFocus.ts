import { connectedAccounts, type PlatformView } from '@/lib/platformDictionary'

/**
 * The row an address singles out: the account named, else on the platform
 * named the account that needs reconnecting, else that platform's first.
 * Nothing when neither is connected here — the page then reads as usual.
 */
export function focusedAccount(
  views: PlatformView[],
  focus?: { accountId?: string; platform?: string },
): { view: PlatformView; accountId: string } | undefined {
  if (!focus) return undefined
  for (const view of views) {
    const hit = connectedAccounts(view).find((a) => a.id === focus.accountId)
    if (hit) return { view, accountId: hit.id }
  }
  const view = views.find(
    (v) => focus.platform && v.info.zernioId === focus.platform,
  )
  const accounts = view ? connectedAccounts(view) : []
  const account = accounts.find((a) => !a.is_active) ?? accounts[0]
  return view && account ? { view, accountId: account.id } : undefined
}
