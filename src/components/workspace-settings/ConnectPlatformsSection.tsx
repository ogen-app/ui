import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { usePlatformViews } from '@/hooks/usePlatforms'
import { useZernioHealth } from '@/hooks/useZernio'
import { connectedAccounts, type PlatformView } from '@/lib/platformDictionary'
import { cn } from '@/lib'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { LockedBadge } from '@/components/entitlements/LockedBadge'
import { UpgradeDialog } from '@/components/entitlements/UpgradeDialog'
import { useUpgradeGate } from '@/components/entitlements/useUpgradeGate'
import { useEntitlement } from '@/hooks/useEntitlements'
import { useConnectPlatform } from './connectPlatform'

/**
 * Connect Platforms — a tile per platform the workspace could connect but
 * hasn't yet (CON-100). Clicking a tile requests a one-shot Zernio connect
 * link, opens it in a new tab for the OAuth dance, and polls until the
 * account is mirrored back, at which point the platform moves up into
 * Platform Settings. The hand-off itself lives in `useConnectPlatform`,
 * shared with the Reconnect button on a broken platform row.
 *
 * Two entitlements meet on these tiles, and they answer differently on purpose
 * (CON-232). A workspace out of *accounts* is sold an upgrade at the click,
 * because it was reaching for one. A workspace whose tier allows only one
 * account **per platform** gets a lock and no pitch: that one is an affordance
 * nobody asked for yet, and a tile that simply stopped working on its second
 * use would teach a user that the app is broken rather than that the
 * capability exists.
 */
function ConnectPlatformsSectionComponent() {
  const { t } = useTranslation()
  const views = usePlatformViews()
  const { data: health, isPending: healthPending } = useZernioHealth()
  const { start, modal } = useConnectPlatform()
  const gate = useUpgradeGate('connected_accounts')
  // Read straight, not through a gate: this one never opens a dialog.
  const several = useEntitlement('multiple_accounts_per_platform')

  // Every known platform is offered, connected or not: a workspace can hold
  // several accounts per platform, so a tile never disappears once used.
  // Publisher entries (and health) only gate whether the tiles are clickable
  // — the API omits publishers entirely when the integration isn't
  // configured, and the platforms should stay visible in that case.
  const integrationOff = health?.state === 'disabled'

  return (
    <SettingsCard title={t('workspaceSettings.connect.title')}>
      {integrationOff && (
        <p className="text-sm text-tertiary-foreground">
          {t('workspaceSettings.connect.integrationOff')}
        </p>
      )}
      {views.length === 0 ? (
        <p className="text-sm text-tertiary-foreground">
          {t('workspaceSettings.connect.noPlatforms')}
        </p>
      ) : (
        // auto-fill keeps tiles at a comfortable minimum width instead of
        // forcing a fixed column count into the 740px card.
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-4">
          {views.map((v) => (
            <PlatformTile
              key={v.platform.id}
              view={v}
              // An unread health check reads as a healthy one, so a tile would
              // take a click that opens a popup and then fails. They stay
              // visible and inert until the answer is in.
              disabled={integrationOff || healthPending}
              // A second account on a platform that already has one. The tile
              // stays on screen either way — that is the whole point of a lock
              // over a hide — so this only decides what its caption says.
              locked={
                several.state === 'denied' && connectedAccounts(v).length > 0
              }
              onConnect={gate.intent(() => start(v))}
            />
          ))}
        </ul>
      )}
      {modal}
      <UpgradeDialog gate={gate} />
    </SettingsCard>
  )
}

/**
 * A clickable tile for one platform — connected or not, since more accounts
 * can always be added. When accounts exist the caption reads "N connected"
 * and slides up out of view on hover/focus, revealing "Connect" underneath.
 */
function PlatformTile({
  view,
  disabled,
  locked,
  onConnect,
}: {
  view: PlatformView
  disabled: boolean
  /** The tier allows one account per platform, and this one is spoken for. */
  locked: boolean
  onConnect: () => void
}) {
  const { t } = useTranslation()
  const { info } = view
  const Icon = info.icon
  const count = connectedAccounts(view).length
  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={onConnect}
        disabled={disabled || locked}
        className={cn(
          `group w-full h-full bg-secondary px-4 py-6 flex flex-col items-center justify-center gap-2 cursor-pointer
          hover:bg-quaternary transition-colors focus-visible:outline-2 focus-visible:outline-ring
          disabled:cursor-not-allowed disabled:hover:bg-secondary`,
          // Dimmed while the integration is unreachable — that tile has nothing
          // to say and is waiting. A locked one is not waiting, it is
          // explaining, so it keeps its contrast: a badge at 50% is a sentence
          // the people most likely to need it cannot read.
          disabled && 'opacity-50',
        )}
      >
        <Icon className="size-8" weight="fill" style={{ color: info.color }} />
        <span className="text-sm font-medium text-center">{info.name}</span>
        {locked ? (
          // In place of the caption, not beside it: "1 connected" and a lock
          // are the same fact said twice, and the lock is the half that is news.
          <LockedBadge className="text-[11px]" />
        ) : count === 0 ? (
          <span className="text-xs text-tertiary-foreground">
            {t('workspaceSettings.connect.connect')}
          </span>
        ) : (
          <span className="relative block h-4 overflow-hidden text-xs">
            <span
              className="block leading-4 text-tertiary-foreground transition-transform duration-200
                group-hover:-translate-y-full group-focus-visible:-translate-y-full"
            >
              {t('workspaceSettings.connect.connectedCount', { count })}
            </span>
            <span
              className="absolute inset-x-0 top-full block leading-4 text-tertiary-foreground
                transition-transform duration-200
                group-hover:-translate-y-full group-focus-visible:-translate-y-full"
            >
              {t('workspaceSettings.connect.connect')}
            </span>
          </span>
        )}
      </button>
    </li>
  )
}

export const ConnectPlatformsSection = memo(ConnectPlatformsSectionComponent)
