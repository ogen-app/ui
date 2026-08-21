import { CaretDownIcon } from '@phosphor-icons/react'
import { AccountAvatar } from '@/components/ui/account-avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import type { PublishingAccount } from '@/hooks/usePublishingAccount'
import { accountLabel } from '@/lib/publishingAccount'
import { cn } from '@/lib'
import { QuickBarTrigger, WarningHint } from './parts'

/**
 * "by <account>" — and, where the platform has more than one connected
 * account, the picker that decides which (CON-150).
 *
 * Three shapes, matching the three the server distinguishes:
 *   - nothing connected → a warning; there is no choice to offer and no
 *     post can publish.
 *   - exactly one → plain text. The submit worker auto-selects it, so a
 *     one-item menu would be a decision the user doesn't have to make.
 *   - two or more → a real picker, required. The server rejects a
 *     scheduled post that names none of them, so leaving it unset is not a
 *     state the bar lets the user rest in.
 *
 * Once the post is scheduled or published the choice is read-only text —
 * the submission already carries the account (see canEditPublishingAccount).
 */
export function AccountSlot({
  account,
  platformName,
  editable,
  onSelect,
}: {
  account: PublishingAccount
  platformName: string
  editable: boolean
  onSelect: (accountId: string) => void
}) {
  // `account.name` survives disconnection via the post's hydrated relation,
  // so a published post still names what it went out as even once that
  // account has left the platform's connected list.
  if (!account.name && !account.connected) {
    return (
      <span className="flex min-w-0 items-center gap-1.5 text-tertiary-foreground">
        <WarningHint
          focusable
          text={`No ${platformName} account is connected, so nothing can publish this post. Connect one in Platform settings.`}
        />
        <span className="truncate">No account connected</span>
      </span>
    )
  }

  // Settled: nothing left to decide, or the post has moved past the point
  // where the account can still change.
  if (!editable || (account.accounts.length < 2 && !account.mismatched)) {
    // A post scheduled before a second account was connected never recorded
    // which one the worker picked. Saying so beats naming the wrong one.
    if (!account.name) {
      return (
        <span className="truncate text-tertiary-foreground">Account not recorded</span>
      )
    }
    // gap-1.5 matches the icon/label spacing inside the bar's triggers.
    return (
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="text-tertiary-foreground">by</span>
        <span className="truncate">{account.name}</span>
      </span>
    )
  }

  return (
    <DropdownMenu>
      <QuickBarTrigger label="Change the account this post publishes as">
        {account.mismatched ? (
          <>
            <WarningHint
              text={
                account.name
                  ? `${account.name} is no longer connected to ${platformName}, so this post can't publish as it. Pick another account.`
                  : `The account this post publishes as is no longer connected to ${platformName}. Pick another one.`
              }
            />
            <span className="truncate">
              {account.name ? `${account.name} — disconnected` : 'Account disconnected'}
            </span>
          </>
        ) : account.account ? (
          <>
            <span className="text-tertiary-foreground">by</span>
            <span className="truncate">{account.name}</span>
          </>
        ) : (
          <>
            <WarningHint
              text={`This workspace has ${account.accounts.length} ${platformName} accounts connected — pick the one this post publishes as.`}
            />
            <span>Select account</span>
          </>
        )}
        <CaretDownIcon className="size-3 text-tertiary-foreground" />
      </QuickBarTrigger>
      <DropdownMenuContent align="start">
        {account.accounts.map((a) => (
          <DropdownMenuItem key={a.id} onSelect={() => onSelect(a.id)}>
            <AccountAvatar src={a.avatar_url} name={accountLabel(a)} size="sm" />
            <div className="flex min-w-0 flex-col">
              <span
                className={cn('truncate', a.id === account.account?.id && 'font-medium')}
              >
                {accountLabel(a)}
              </span>
              {a.username && (
                <span className="truncate text-xs text-tertiary-foreground">
                  @{a.username}
                </span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
