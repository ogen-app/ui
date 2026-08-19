import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Link, useNavigate } from '@tanstack/react-router'
import { CaretLeftIcon } from '@phosphor-icons/react'
import { AccountAvatar } from '@/components/ui/account-avatar'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { Spinner } from '@/components/ui/spinner'
import { usePendingConnection, useSelectPendingTarget } from '@/hooks/useZernio'
import { getPlatformByZernioId } from '@/lib/platformDictionary'
import { ZernioError, type ConnectTarget } from '@/types/integrations'
import { cn } from '@/lib'
import { connectErrorMessage } from './connectPlatform'

/**
 * Which page or profile to connect (CON-217).
 *
 * A screen the user is *sent* to rather than one they open: the backend runs
 * the whole connect itself now, and only when an authorization turns out to
 * cover several publishable targets — a LinkedIn login administering three
 * company pages — does it need a person. It stashes the choice and redirects
 * here with an opaque id.
 *
 * That id is a capability, not a record. It is single-use, lives fifteen
 * minutes, and belongs to one workspace; every way of missing — expired,
 * spent, someone else's, never existed — comes back as the same 404, and all
 * of them mean the same thing to the reader, which is why there is one screen
 * for the lot of them.
 *
 * One target never reaches here. The backend attaches those itself, so the
 * common connect stays a single authorization with nothing else to click.
 */
export function ConnectPicker({ connectionId }: { connectionId: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data, isPending, error } = usePendingConnection(connectionId)
  const select = useSelectPendingTarget(connectionId)
  const [chosen, setChosen] = useState<string | null>(null)

  const platform = data ? getPlatformByZernioId(data.platform) : undefined
  const platformName = platform?.name ?? data?.platform ?? ''

  const submit = () => {
    if (!chosen || !data) return
    select.mutate(chosen, {
      // Back to the accounts page by the same door every other connect uses:
      // `?connected=` is what shows the confirmation and waits for the account
      // to be mirrored, and this one has no more claim to a bespoke ending
      // than the zero-click case does.
      onSuccess: () =>
        void navigate({
          to: '/workspace-settings',
          search: { connected: data.platform },
          replace: true,
        }),
    })
  }

  return (
    <PickerFrame title={t('workspaceSettings.connect.picker.title')}>
      {isPending ? (
        // Deliberately not on a card, and wordless. A card is a container for
        // content and there is none yet; the word "Loading" under a title that
        // already says what is coming only fills the gap with reading. The bar
        // keeps its name for anyone who can't see it move.
        <div role="status" className="flex justify-center py-10">
          <Spinner tone="onSurface" className="w-40" />
          <span className="sr-only">{t('common.loading')}</span>
        </div>
      ) : error || isGone(select.error) ? (
        // A select that 404s means the same thing a list that 404s means: the
        // session went while the user was deciding. Answering it inline, under
        // a list of options that no longer exist, would invite a second click
        // on a dead choice.
        <SettingsCard>
          <PickerFailure error={error ?? select.error} />
        </SettingsCard>
      ) : !data || data.options.length === 0 ? (
        // Rare: the backend redirects `no_targets` to the accounts page before
        // it ever gets this far. Reachable only if the account's last page
        // disappeared between the list and this render.
        <SettingsCard>
          <Explanation body={t('workspaceSettings.connect.picker.empty')} />
        </SettingsCard>
      ) : (
        <SettingsCard>
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <p className="text-sm text-foreground">
              {t('workspaceSettings.connect.picker.body', { platform: platformName })}
            </p>

            <fieldset className="min-w-0" disabled={select.isPending}>
              <legend className="sr-only">
                {t('workspaceSettings.connect.picker.legend', { platform: platformName })}
              </legend>
              <ul className="flex flex-col gap-2">
                {data.options.map((option) => (
                  <li key={option.id} className="min-w-0">
                    <TargetRow
                      target={option}
                      platformName={platformName}
                      platform={platform}
                      selected={chosen === option.id}
                      onSelect={() => setChosen(option.id)}
                    />
                  </li>
                ))}
              </ul>
            </fieldset>

            {select.isError && (
              <p role="alert" className="text-sm text-destructive">
                {connectErrorMessage(select.error, t)}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" asChild>
                <Link to="/workspace-settings">
                  {t('workspaceSettings.connect.picker.cancel')}
                </Link>
              </Button>
              <Button
                type="submit"
                variant="defaultInverted"
                disabled={!chosen || select.isPending}
                loading={select.isPending}
              >
                {/* Uppercased here rather than in the catalogue: the platform
                    arrives as a proper noun, and the caps have to be in the
                    text itself — never CSS — to survive copy/paste and a
                    screen reader. */}
                {t('workspaceSettings.connect.picker.submit', {
                  platform: platformName.toUpperCase(),
                })}
              </Button>
            </div>
          </form>
        </SettingsCard>
      )}
    </PickerFrame>
  )
}

/**
 * One selectable target.
 *
 * A native radio, visually hidden but doing all the work: arrow-key movement
 * within the group, one tab stop for the whole set, and the checked state
 * announced without a single aria attribute of our own. The row is the label,
 * so the entire card is the click target rather than a dot beside it.
 */
function TargetRow({
  target,
  platform,
  platformName,
  selected,
  onSelect,
}: {
  target: ConnectTarget
  platform: ReturnType<typeof getPlatformByZernioId>
  platformName: string
  selected: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation()
  const kind = kindLabel(target.kind, t)
  return (
    <label className="block min-w-0 cursor-pointer">
      <input
        type="radio"
        name="connect-target"
        value={target.id}
        checked={selected}
        onChange={onSelect}
        className="peer sr-only"
      />
      <div
        className={cn(
          'flex items-center gap-3 border border-border bg-primary px-4 py-3 min-w-0',
          'transition-colors hover:bg-secondary',
          'peer-checked:border-accent peer-checked:bg-secondary',
          'peer-focus-visible:outline-2 peer-focus-visible:outline-ring',
        )}
      >
        <AccountAvatar
          src={target.avatarUrl}
          name={target.name}
          platform={platform}
          size="md"
        />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{target.name}</span>
          <span className="flex min-w-0 items-center gap-2 text-xs text-tertiary-foreground">
            {kind && <span className="shrink-0 bg-tertiary px-1.5 py-0.5">{kind}</span>}
            {target.username && <span className="truncate">@{target.username}</span>}
          </span>
        </div>
        <span className="sr-only">{platformName}</span>
      </div>
    </label>
  )
}

/**
 * Whether the connection is simply no longer there.
 *
 * Keyed on the **status**, not on the server's `connection_not_found` code.
 * Both say 404, but only one of them comes from the handler: an id that never
 * reaches a registered route — a deploy where the endpoint isn't live yet, a
 * proxy that swallows it — 404s without that body, and it would be perverse to
 * show the router's plumbing to someone whose connect merely timed out.
 */
function isGone(error: unknown): boolean {
  return error instanceof ZernioError && error.status === 404
}

/**
 * Why there is nothing to choose from.
 *
 * A 404 is the expected end of an abandoned connect, so it gets the plain
 * "start again" wording rather than an error's. Everything else — the
 * integration switched off mid-flow, a network failure — keeps the server's
 * own reason, which says more than a generic apology would.
 */
function PickerFailure({ error }: { error: unknown }) {
  const { t } = useTranslation()
  return (
    <Explanation
      body={
        isGone(error)
          ? t('workspaceSettings.connect.picker.expired')
          : connectErrorMessage(error, t)
      }
    />
  )
}

function Explanation({ body }: { body: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-start gap-4">
      <p className="text-sm">{body}</p>
      <Button variant="outline" asChild>
        <Link to="/workspace-settings">
          {t('workspaceSettings.connect.picker.backToAccounts')}
        </Link>
      </Button>
    </div>
  )
}

/**
 * The page chrome, shared by every state so nothing above the content moves.
 *
 * The title sits on its own line and centred, rather than in the header row
 * beside the back control. This screen is a single question with a single
 * answer — it has no document to head, no actions to sit opposite, and the
 * choice below it is centred too; a left-aligned title would be the only thing
 * on the page pulling to one side.
 */
function PickerFrame({ title, children }: { title: string; children: React.ReactNode }) {
  const { t } = useTranslation()
  return (
    <PageContainer variant="fullFlex">
      <div className="flex h-0 grow flex-col overflow-y-auto">
        <PageHeader
          fadeOnScroll
          back={
            <Button
              variant="headerIcon"
              size="excluded"
              asChild
              aria-label={t('workspaceSettings.connect.picker.back')}
            >
              <Link to="/workspace-settings">
                <CaretLeftIcon className="size-5" />
              </Link>
            </Button>
          }
        />
        <div className="flex flex-col gap-6 px-3 pb-6 lg:px-6">
          <h1 className="font-display text-center text-2xl leading-8 font-medium tracking-[-0.24px] text-primary-foreground">
            {title}
          </h1>
          {children}
        </div>
      </div>
    </PageContainer>
  )
}

/**
 * `kind` in words. Absent when the backend couldn't classify the target — a
 * missing badge says less than a wrong one.
 */
function kindLabel(kind: ConnectTarget['kind'], t: TFunction): string | null {
  switch (kind) {
    case 'organization':
      return t('workspaceSettings.connect.picker.kind.organization')
    case 'page':
      return t('workspaceSettings.connect.picker.kind.page')
    case 'personal':
      return t('workspaceSettings.connect.picker.kind.personal')
    default:
      return null
  }
}
