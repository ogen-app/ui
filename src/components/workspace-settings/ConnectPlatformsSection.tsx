import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { usePlatformViews } from '@/hooks/usePlatforms'
import { useZernioHealth } from '@/hooks/useZernio'
import { connectedAccounts, type PlatformView } from '@/lib/platformDictionary'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { useConnectPlatform } from './connectPlatform'

/**
 * Connect Platforms — a tile per platform the workspace could connect but
 * hasn't yet (CON-100). Clicking a tile requests a one-shot Zernio connect
 * link, opens it in a new tab for the OAuth dance, and polls until the
 * account is mirrored back, at which point the platform moves up into
 * Platform Settings. The hand-off itself lives in `useConnectPlatform`,
 * shared with the Reconnect button on a broken platform row.
 */
function ConnectPlatformsSectionComponent() {
  const { t } = useTranslation()
  const views = usePlatformViews()
  const { data: health, isPending: healthPending } = useZernioHealth()
  const { start, modal } = useConnectPlatform()

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
              onConnect={() => start(v)}
            />
          ))}
        </ul>
      )}
      {modal}
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
  onConnect,
}: {
  view: PlatformView
  disabled: boolean
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
        disabled={disabled}
        className="group w-full h-full bg-secondary px-4 py-6 flex flex-col items-center justify-center gap-2 cursor-pointer
          hover:bg-quaternary transition-colors focus-visible:outline-2 focus-visible:outline-ring
          disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-secondary"
      >
        <Icon className="size-8" weight="fill" style={{ color: info.color }} />
        <span className="text-sm font-medium text-center">{info.name}</span>
        {count === 0 ? (
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
