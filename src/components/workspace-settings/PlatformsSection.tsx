import { memo } from 'react'
import { PlugsIcon } from '@phosphor-icons/react'
import type { PublisherAccount } from '@/types/campaigns'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Chip } from '@/components/ui/chip'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  connectedAccounts,
  type PlatformPostType,
  type PlatformView,
} from '@/lib/platformDictionary'
import { usePlatformViews } from '@/hooks/usePlatforms'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { AutoPublishControl } from './AutoPublishControl'
import { ReadOnlyField, SettingsRow } from './SettingsRow'

/**
 * Platform Settings — one row per platform the workspace has actually
 * connected. Platforms without a connected account live in the
 * "Connect Platforms" grid instead (ConnectPlatformsSection).
 */
function PlatformsSectionComponent() {
  const views = usePlatformViews()
  const connected = views.filter((v) => v.connectedPublishers.length > 0)

  return (
    <SettingsCard title="Platform Settings">
      {connected.length === 0 ? (
        <p className="text-sm text-tertiary-foreground">
          No platforms connected yet — pick one under “Connect Platforms” below.
        </p>
      ) : (
        // Every row gets a separator above it: the ul's own top border covers
        // the first row, divide-y the rest; pt-6 restores the first row's gap
        // (SettingsRow zeroes it via first:pt-0).
        <ul className="flex flex-col border-t border-border pt-6 divide-y divide-border">
          {connected.map((v) => (
            <PlatformRow key={v.platform.id} view={v} />
          ))}
        </ul>
      )}
    </SettingsCard>
  )
}

type ConnectionStatus = {
  tone: StatusTone
  label: string
  /** Empty on the healthy path — the "Connected" badge already says it. */
  message: string
}

/**
 * Maps the publisher state (disabled / degraded / ok — mirrored from the Go
 * server) and account activity onto the row's badge and status message.
 */
function connectionStatus(view: PlatformView): ConnectionStatus {
  const publisher = view.connectedPublishers[0]
  const accounts = connectedAccounts(view)
  const anyActive = accounts.some((a) => a.is_active)

  if (publisher.state === 'degraded') {
    return {
      tone: 'warn',
      label: 'Sync degraded',
      message: `Connected, but the ${publisher.name} sync is degraded — we retry automatically.`,
    }
  }
  if (publisher.state === 'disabled') {
    return {
      tone: 'warn',
      label: 'Integration off',
      message: 'Connected, but the publishing integration is currently disabled on the server.',
    }
  }
  if (accounts.length > 0 && !anyActive) {
    return {
      tone: 'warn',
      label: 'Inactive',
      message: `The connected account is inactive on ${publisher.name} and can’t receive posts.`,
    }
  }
  return {
    tone: 'positive',
    label: 'Connected',
    message: '',
  }
}

/**
 * One connected platform: the connected accounts, then cadence, constraints,
 * and the content types the platform can publish — stacked full-width.
 */
function PlatformRow({ view }: { view: PlatformView }) {
  const { platform, info } = view
  const accounts = connectedAccounts(view)
  const status = connectionStatus(view)

  return (
    <SettingsRow
      title={info.name}
      badges={<StatusBadge tone={status.tone} label={status.label} />}
      actions={<DisconnectButton />}
      description={status.message ? <p>{status.message}</p> : undefined}
    >
      {accounts.length > 0 && <ConnectedAccounts accounts={accounts} />}
      <AutoPublishControl view={view} />
      <ReadOnlyField label="Cadence" value={platform.cadence} />
      <ReadOnlyField label="Constraints" value={platform.constraints} />
      <PostTypeChips view={view} />
    </SettingsRow>
  )
}

/**
 * Content types the platform can publish — the union across every connected
 * publisher, since the workspace can post through any of them.
 */
function PostTypeChips({ view }: { view: PlatformView }) {
  const supported = new Set(view.connectedPublishers.flatMap((p) => p.supported_post_types))
  const items = view.allowed.filter((pt) => supported.has(pt.slug))

  return <ChipGroup label="Available Content Types" items={items} emptyText="None" />
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
      <span className="text-[13px] font-normal text-input-label h-4">{label}</span>
      {items.length === 0 ? (
        <div className="h-10 py-1 border-b border-transparent flex items-center gap-2 flex-wrap">
          <span className="text-[13px] leading-4 text-primary-foreground">{emptyText}</span>
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
 * Disconnecting is not possible yet: the API has no disconnect endpoint and
 * tenants have no access to the platform-owned Zernio dashboard. The button
 * is rendered disabled so the affordance is discoverable ahead of the
 * backend work.
 */
function DisconnectButton() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>
          <Button
            type="button"
            variant="ghost"
            size="smIcon"
            className="text-destructive hover:text-destructive disabled:text-destructive/40"
            disabled
            aria-label="Disconnect platform"
          >
            <PlugsIcon className="size-5" weight="regular" />
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>Disconnecting isn’t available yet — coming soon.</TooltipContent>
    </Tooltip>
  )
}

/**
 * The accounts connected for this platform, across every publisher — a
 * full-width block above the two-column body.
 */
function ConnectedAccounts({ accounts }: { accounts: PublisherAccount[] }) {
  return (
    <ul className="flex flex-col gap-3 min-w-0">
      {accounts.map((a) => (
        <AccountRow key={a.id} account={a} />
      ))}
    </ul>
  )
}

/**
 * Avatar, then display name over handle; flags inactive accounts. Sized to
 * match the sidebar profile block (AppSidebar) so the two read the same.
 */
function AccountRow({ account }: { account: PublisherAccount }) {
  const name = account.display_name || account.username
  const initial = (name || '?').slice(0, 1).toUpperCase()
  return (
    <li className="flex items-center gap-3 min-w-0">
      <Avatar className="size-10 shrink-0">
        {account.avatar_url && <AvatarImage src={account.avatar_url} alt={name} />}
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col items-start min-w-0">
        <p className="w-full text-sm font-regular truncate text-left">
          {name}
          {!account.is_active && <span className="text-tertiary-foreground"> (inactive)</span>}
        </p>
        <p className="w-full text-xs text-tertiary-foreground truncate text-left">
          @{account.username}
        </p>
      </div>
    </li>
  )
}

export const PlatformsSection = memo(PlatformsSectionComponent)
