import { memo, useId, useState } from 'react'
import { PencilSimpleIcon } from '@phosphor-icons/react'
import type { Platform, PlatformPublisher, PublisherAccount } from '@/types/campaigns'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Chip } from '@/components/ui/chip'
import { ModalContainer } from '@/components/ui/modal'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  getPlatformInfo,
  type PlatformPostType,
  type PlatformView,
} from '@/lib/platformDictionary'
import { usePlatformViews } from '@/hooks/usePlatforms'
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
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-display font-medium tracking-tight">Platform Settings</h2>
      {connected.length === 0 ? (
        <div className="bg-primary px-6 py-5 text-sm text-tertiary-foreground">
          No platforms connected yet — pick one under “Connect Platforms” below.
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {connected.map((v) => (
            <PlatformRow key={v.platform.id} view={v} />
          ))}
        </ul>
      )}
    </section>
  )
}

type ConnectionStatus = {
  tone: StatusTone
  label: string
  message: string
}

/**
 * Maps the publisher state (disabled / degraded / ok — mirrored from the Go
 * server) and account activity onto the row's badge and status message.
 */
function connectionStatus(view: PlatformView): ConnectionStatus {
  const publisher = view.connectedPublishers[0]
  const accounts = view.connectedPublishers.flatMap((p) => p.accounts)
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
    message: `Publishing via ${publisher.name}.`,
  }
}

function PlatformRow({ view }: { view: PlatformView }) {
  const { platform, info } = view
  const accountPublishers = view.connectedPublishers.filter((p) => p.accounts.length > 0)
  const status = connectionStatus(view)

  return (
    <SettingsRow
      title={info.name}
      badges={<StatusBadge tone={status.tone} label={status.label} />}
      actions={
        <>
          <DisconnectButton />
          <PlatformEditIconButton platform={platform} />
        </>
      }
      description={<p>{status.message}</p>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
        <PostTypeChips view={view} />
        <div className="flex flex-col gap-4">
          <ReadOnlyField label="Cadence" value={platform.cadence} />
          <ReadOnlyField label="Constraints" value={platform.constraints} />
        </div>
      </div>
      {accountPublishers.length > 0 && (
        <div className="flex flex-col gap-3">
          {accountPublishers.map((p) => (
            <PublisherAccounts key={p.id} publisher={p} />
          ))}
        </div>
      )}
    </SettingsRow>
  )
}

function PostTypeChips({ view }: { view: PlatformView }) {
  const groups = view.connectedPublishers.map((pub) => ({
    key: pub.id,
    label: `Available via ${pub.name}`,
    items: view.allowed.filter((pt) => pub.supported_post_types.includes(pt.slug)),
  }))

  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <ChipGroup key={g.key} label={g.label} items={g.items} emptyText="None" />
      ))}
    </div>
  )
}

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
          <Button type="button" variant="outline" size="sm" disabled>
            Disconnect
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>Disconnecting isn’t available yet — coming soon.</TooltipContent>
    </Tooltip>
  )
}

function PlatformEditIconButton({ platform }: { platform: Platform }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="smIcon"
        onClick={() => setOpen(true)}
        aria-label="Edit platform"
        title="Edit platform"
      >
        <PencilSimpleIcon className="size-3.5" />
      </Button>
      <PlatformDetailsModal
        platform={platform}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

function PlatformDetailsModal({
  platform,
  open,
  onClose,
}: {
  platform: Platform
  open: boolean
  onClose: () => void
}) {
  const info = getPlatformInfo(platform.id)
  const cadenceId = useId()
  const constraintsId = useId()
  return (
    <ModalContainer
      isOpen={open}
      onClose={onClose}
      title={`${info?.name ?? platform.name} settings`}
      size="default"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={cadenceId}>Cadence</Label>
          <Textarea
            id={cadenceId}
            value={platform.cadence ?? ''}
            readOnly
            disabled
            placeholder="—"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={constraintsId}>Constraints</Label>
          <Textarea
            id={constraintsId}
            value={platform.constraints ?? ''}
            readOnly
            disabled
            placeholder="—"
          />
        </div>
      </div>
    </ModalContainer>
  )
}

function PublisherAccounts({ publisher }: { publisher: PlatformPublisher }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-normal text-input-label">
        {publisher.name} accounts
      </span>
      <ul className="flex flex-col gap-1.5">
        {publisher.accounts.map((a) => (
          <AccountRow key={a.id} account={a} />
        ))}
      </ul>
    </div>
  )
}

function AccountRow({ account }: { account: PublisherAccount }) {
  const initial = (account.display_name || account.username || '?').slice(0, 1).toUpperCase()
  return (
    <li className="flex items-center gap-2 text-sm">
      <Avatar className="size-6">
        {account.avatar_url && <AvatarImage src={account.avatar_url} alt={account.username} />}
        <AvatarFallback className="text-[10px]">{initial}</AvatarFallback>
      </Avatar>
      <span className="truncate">@{account.username}</span>
      {account.display_name && (
        <span className="text-tertiary-foreground truncate">· {account.display_name}</span>
      )}
      {!account.is_active && (
        <span className="text-xs text-tertiary-foreground">(inactive)</span>
      )}
    </li>
  )
}

export const PlatformsSection = memo(PlatformsSectionComponent)
