import { CaretDownIcon, UserCircleIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { AccountAvatar } from '@/components/ui/account-avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import type { PublishingAccount } from '@/hooks/usePublishingAccount'
import { accountLabel } from '@/lib/publishingAccount'
import { cn } from '@/lib'
import { Mark, Marked, QuickBarTrigger, WarningHint } from './parts'

/**
 * The account the post publishes as, marked by its picture — and, where the platform has more than one connected
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
  const { t } = useTranslation()
  // The picture where we have one; the generic person where we don't, so the
  // value still starts at the same x as every other row's.
  const picture = account.avatarUrl ? (
    <AccountAvatar
      src={account.avatarUrl}
      name={account.name ?? ''}
      size="xs"
    />
  ) : (
    <UserCircleIcon />
  )
  const noneHint = t('posts.editor.settings.accountNoneHint', {
    platform: platformName,
  })
  const disconnected = account.name
    ? t('posts.editor.settings.accountDisconnected', { name: account.name })
    : t('posts.editor.settings.accountNone')
  // `account.name` survives disconnection via the post's hydrated relation,
  // so a published post still names what it went out as even once that
  // account has left the platform's connected list.
  //
  // The warning is for a post that still has to publish. Once it can't change
  // (CON-251) nothing can be connected retroactively — the post has already
  // gone out, or Zernio is holding it — so this would be urging an action
  // against a settled fact. It falls through to "Account not recorded" below,
  // which is the true statement about a post whose account nobody wrote down.
  if (!account.name && !account.connected && editable) {
    return (
      <span className="flex min-w-0 items-center gap-1.5 text-tertiary-foreground">
        <WarningHint focusable text={noneHint} />
        <span className="truncate">
          {t('posts.editor.settings.accountNone')}
        </span>
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
        <Marked mark={<UserCircleIcon />} className="text-tertiary-foreground">
          {t('posts.editor.settings.accountNotRecorded')}
        </Marked>
      )
    }
    return <Marked mark={picture}>{account.name}</Marked>
  }

  // The chosen account disconnected and nothing else is left: `mismatched`
  // keeps this out of the settled branch above, but a picker here would open
  // onto an empty menu. There is no choice to offer — say what the warning for
  // an unconnected platform says, keeping the name the post still carries.
  if (account.accounts.length === 0) {
    return (
      <span className="flex min-w-0 items-center gap-1.5 text-tertiary-foreground">
        <WarningHint focusable text={noneHint} />
        <span className="truncate">{disconnected}</span>
      </span>
    )
  }

  return (
    <DropdownMenu>
      <QuickBarTrigger label={t('posts.editor.settings.accountChange')}>
        {account.mismatched ? (
          <>
            <WarningHint
              text={
                account.name
                  ? t('posts.editor.settings.accountGoneHint', {
                      name: account.name,
                      platform: platformName,
                    })
                  : t('posts.editor.settings.accountGoneHintUnnamed', {
                      platform: platformName,
                    })
              }
            />
            <span className="truncate">
              {account.name
                ? t('posts.editor.settings.accountDisconnected', {
                    name: account.name,
                  })
                : t('posts.editor.settings.accountDisconnectedUnnamed')}
            </span>
          </>
        ) : account.account ? (
          <>
            <Mark>{picture}</Mark>
            <span className="truncate">{account.name}</span>
          </>
        ) : (
          <>
            <WarningHint
              text={t('posts.editor.settings.accountPickHint', {
                count: account.accounts.length,
                platform: platformName,
              })}
            />
            <span>{t('posts.editor.settings.accountPick')}</span>
          </>
        )}
        <CaretDownIcon className="size-3 text-tertiary-foreground" />
      </QuickBarTrigger>
      <DropdownMenuContent align="start">
        {account.accounts.map((a) => (
          <DropdownMenuItem key={a.id} onSelect={() => onSelect(a.id)}>
            <AccountAvatar
              src={a.avatar_url}
              name={accountLabel(a)}
              size="sm"
            />
            <div className="flex min-w-0 flex-col">
              <span
                className={cn(
                  'truncate',
                  a.id === account.account?.id && 'font-medium',
                )}
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
