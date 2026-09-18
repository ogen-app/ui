import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { ArrowsClockwiseIcon, PlugsIcon } from '@phosphor-icons/react'
import type { PublisherAccount } from '@/types/campaigns'
import { AccountAvatar } from '@/components/ui/account-avatar'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  connectedAccounts,
  type PlatformPostType,
  type PlatformView,
} from '@/lib/platformDictionary'
import { usePlatformViews } from '@/hooks/usePlatforms'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { AutoPublishControl } from './AutoPublishControl'
import { useConnectPlatform } from './connectPlatform'
import { DisconnectAccountDialog } from './DisconnectAccountDialog'
import { SettingsRow } from './SettingsRow'

/**
 * Platform Settings — one row per platform the workspace has actually
 * connected. Platforms without a connected account live in the
 * "Connect Platforms" grid instead (ConnectPlatformsSection).
 */
function PlatformsSectionComponent() {
  const { t } = useTranslation()
  const views = usePlatformViews()
  const connected = views.filter((v) => v.connectedPublishers.length > 0)
  const { start, modal } = useConnectPlatform()

  return (
    <SettingsCard title={t('workspaceSettings.platforms.title')}>
      {connected.length === 0 ? (
        <p className="text-sm text-tertiary-foreground">
          {t('workspaceSettings.platforms.empty')}
        </p>
      ) : (
        // Every row gets a separator above it: the ul's own top border covers
        // the first row, divide-y the rest; pt-6 restores the first row's gap
        // (SettingsRow zeroes it via first:pt-0).
        <ul className="flex flex-col border-t border-border pt-6 divide-y divide-border">
          {connected.map((v) => (
            <PlatformRow
              key={v.platform.id}
              view={v}
              onReconnect={() => start(v)}
            />
          ))}
        </ul>
      )}
      {modal}
    </SettingsCard>
  )
}

/**
 * Platform-level trouble: the publisher is degraded or switched off server
 * side. Neither is something the user can re-authorize their way out of, so
 * this is a sentence above the row rather than a state on the account's
 * button — see `AccountRow` for the one that is.
 */
function platformNotice(view: PlatformView, t: TFunction): string {
  const publisher = view.connectedPublishers[0]
  if (publisher.state === 'degraded') {
    return t('workspaceSettings.platforms.status.degradedMessage', {
      publisher: publisher.name,
    })
  }
  if (publisher.state === 'disabled') {
    return t('workspaceSettings.platforms.status.disabledMessage')
  }
  return ''
}

/**
 * One connected platform: the connected accounts, auto-publish, and the content
 * types the platform can publish — stacked full-width.
 *
 * No heading. The platform's name and its "Connected" badge used to sit above
 * all this, saying twice over what the account below already shows — the
 * account carries the platform's mark on its avatar, and its own button
 * carries the connection state.
 *
 * There were two more fields here, Cadence and Constraints, reading "Coming
 * soon" against seeded stand-in prose. They are gone rather than waiting: the
 * platform enforces neither, nothing was ever going to fill them, and two
 * permanently empty rows on every platform only made the row longer.
 */
function PlatformRow({
  view,
  onReconnect,
}: {
  view: PlatformView
  onReconnect: () => void
}) {
  const { t } = useTranslation()
  const accounts = connectedAccounts(view)
  const notice = platformNotice(view, t)

  return (
    <SettingsRow description={notice ? <p>{notice}</p> : undefined}>
      {accounts.length > 0 && (
        <ConnectedAccounts
          view={view}
          accounts={accounts}
          onReconnect={onReconnect}
        />
      )}
      <AutoPublishControl view={view} />
      <PostTypeChips view={view} />
    </SettingsRow>
  )
}

/**
 * Content types the platform can publish — the union across every connected
 * publisher, since the workspace can post through any of them.
 */
function PostTypeChips({ view }: { view: PlatformView }) {
  const { t } = useTranslation()
  const supported = new Set(
    view.connectedPublishers.flatMap((p) => p.supported_post_types),
  )
  const items = view.allowed.filter((pt) => supported.has(pt.slug))

  return (
    <ChipGroup
      label={t('workspaceSettings.platforms.contentTypes')}
      items={items}
      emptyText={t('workspaceSettings.platforms.contentTypesEmpty')}
    />
  )
}

/** A labeled row of chips, or `emptyText` when there are none. */
function ChipGroup({
  label,
  items,
  emptyText,
}: {
  label: string
  items: PlatformPostType[]
  emptyText: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-normal text-input-label h-4">
        {label}
      </span>
      {items.length === 0 ? (
        <div className="h-10 py-1 border-b border-transparent flex items-center gap-2 flex-wrap">
          <span className="text-[13px] leading-4 text-primary-foreground">
            {emptyText}
          </span>
        </div>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {items.map((pt) => (
            <li key={pt.slug}>
              <Chip>{pt.label}</Chip>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * The accounts connected for this platform, across every publisher — a
 * full-width block above the two-column body.
 */
function ConnectedAccounts({
  view,
  accounts,
  onReconnect,
}: {
  view: PlatformView
  accounts: PublisherAccount[]
  onReconnect: () => void
}) {
  return (
    <ul className="flex flex-col gap-3 min-w-0">
      {accounts.map((a) => (
        <AccountRow
          key={a.id}
          view={view}
          account={a}
          onReconnect={onReconnect}
        />
      ))}
    </ul>
  )
}

/**
 * Avatar, then display name over handle, then the connection's state and the
 * control that ends it.
 *
 * The state is a plain badge rather than anything pressable: "Connected" is
 * something the row reports, and putting it in a border would offer a button
 * that does nothing.
 *
 * An account that has gone inactive on the platform can't receive posts, and
 * re-authorizing is what fixes it — so that row offers Reconnect in the badge's
 * place, and keeps its disconnect control either way, because a broken
 * connection you can't remove is a dead end.
 *
 * Disconnect hangs off the account, not the platform row: the endpoint takes
 * an account id, and a platform can hold several accounts (CON-150), so a
 * per-platform control would have had nothing unambiguous to delete.
 */
function AccountRow({
  view,
  account,
  onReconnect,
}: {
  view: PlatformView
  account: PublisherAccount
  onReconnect: () => void
}) {
  const { t } = useTranslation()
  const [confirming, setConfirming] = useState(false)
  const name = account.display_name || account.username
  const broken = !account.is_active

  return (
    <li className="flex items-center gap-3 min-w-0">
      <AccountAvatar
        src={account.avatar_url}
        name={name}
        platform={view.info}
      />
      <div className="flex flex-col items-start min-w-0 flex-1">
        {/* The row's headline now that the platform heading is gone — it
            carries the weight that heading used to. */}
        <p className="w-full text-base font-medium truncate text-left">
          {name}
        </p>
        <p className="w-full text-xs text-tertiary-foreground truncate text-left">
          {broken
            ? t('workspaceSettings.platforms.accountInactive', {
                platform: view.info.name,
              })
            : `@${account.username}`}
        </p>
      </div>

      {broken ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={onReconnect}
        >
          <ArrowsClockwiseIcon />
          <span>{t('workspaceSettings.platforms.reconnect')}</span>
        </Button>
      ) : (
        <StatusBadge
          tone="positive"
          label={t('workspaceSettings.platforms.status.connected')}
          className="shrink-0"
        />
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="smIcon"
            // Red on the way out, not at rest: disconnecting is destructive,
            // but a permanently red control next to a healthy account reads
            // as a warning about the account itself.
            className="shrink-0 hover:text-destructive"
            onClick={() => setConfirming(true)}
            aria-label={t('workspaceSettings.platforms.disconnectAccount', {
              name,
            })}
          >
            <PlugsIcon className="size-5" weight="regular" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {t('workspaceSettings.platforms.disconnectTooltip')}
        </TooltipContent>
      </Tooltip>

      <DisconnectAccountDialog
        account={account}
        platformName={view.info.name}
        isOpen={confirming}
        onClose={() => setConfirming(false)}
      />
    </li>
  )
}

export const PlatformsSection = memo(PlatformsSectionComponent)
