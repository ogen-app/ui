import { useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { useTranslation } from 'react-i18next'
import {
  ArrowSquareOutIcon,
  ArrowsLeftRightIcon,
  CaretUpDownIcon,
  KeyboardIcon,
  LifebuoyIcon,
  SignOutIcon,
  UserIcon,
} from '@phosphor-icons/react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useWorkspaceMenuEntries } from '@/components/layout/nav/workspaceDestinations'
import { WorkspaceMark } from '@/components/layout/WorkspaceMark'
import { useWorkspace } from '@/hooks/useWorkspaces'
import { useAuthStore } from '@/stores/authStore'
import { useShortcutsStore } from '@/stores/shortcutsStore'
import { ROLE_LABEL_KEYS, type Workspace } from '@/types/workspace'
import { cn } from '@/lib'

/** TODO: placeholder — no help site exists yet. Point at the real one when it does. */
const HELP_URL = 'https://getogen.com/help'

/**
 * The top-left corner: the workspace, with you in it — and once you are inside
 * a campaign, the workspace you left to get there.
 *
 * **The workspace leads and you follow.** It is the fact that changes what
 * every other screen shows, so it gets the mark and the name; who you are is
 * the quieter second line, and the email is one click away in the menu. The
 * block used to sit at the foot of the rail, where it was the last thing read;
 * up here it is the first, over the column it scopes.
 *
 * Collapsed (the rail at 52px) it is the mark alone, centred over the rail's
 * glyphs — the corner is exactly as wide as the rail under it, so the two read
 * as one column. On a phone the name goes too: the bar has a campaign and two
 * buttons to fit.
 *
 * The menu is the same at both levels except for its top: at level 1 it grows
 * the whole of level 0 above the account block — modules, Foundation and the
 * workspace's settings — so any of them is one click from inside a campaign.
 */
export function WorkspaceMenu({
  level,
  compact,
}: {
  level: 0 | 1
  compact: boolean
}) {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const workspace = useWorkspace()
  const destinations = useWorkspaceMenuEntries()

  const initials =
    `${user?.firstName[0] ?? ''}${user?.lastName[0] ?? ''}`.toUpperCase() || '?'
  const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()

  const mark = workspace ? (
    <WorkspaceMark
      id={workspace.id}
      name={workspace.name}
      className="size-7 text-[11px]"
    />
  ) : (
    <Avatar className="size-7 shrink-0">
      <AvatarFallback className="text-[11px]">{initials}</AvatarFallback>
    </Avatar>
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('nav.accountMenu')}
          className={cn(
            'flex h-full min-w-0 flex-1 cursor-pointer select-none items-center gap-2.5 px-3 text-left transition-colors hover:bg-sidebar-secondary',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          )}
        >
          {mark}
          {!compact && (
            <>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium leading-5">
                  {workspace?.name ?? fullName}
                </span>
                <span className="truncate text-xs leading-4 text-tertiary-foreground">
                  {workspace ? fullName : user?.email}
                </span>
              </span>
              <CaretUpDownIcon className="size-4 shrink-0 text-tertiary-foreground" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <AccountMenu
        initials={initials}
        fullName={fullName}
        email={user?.email}
        workspace={workspace}
        destinations={level === 1 ? destinations : []}
      />
    </DropdownMenu>
  )
}

/**
 * One menu for both levels, with the workspace's destinations added to the top
 * of it at level 1.
 *
 * Written once rather than twice because the account half is identical and has
 * to stay identical: the menu is where "log out" lives, and a control that
 * moves depending on how deep you happen to be is the kind of thing people
 * stop trusting. The destinations sit *above* the account block for the same
 * reason they are above it in the rail — they are places, and the account is
 * not.
 */
function AccountMenu({
  initials,
  fullName,
  email,
  workspace,
  destinations = [],
}: {
  initials: string
  fullName: string
  email: string | undefined
  workspace: Workspace | undefined
  destinations?: ReturnType<typeof useWorkspaceMenuEntries>
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  // Closing the menu hands focus back to its trigger, which would pull it out
  // of the shortcuts sheet the row has just opened. One-shot: every other row
  // keeps the hand-back.
  const keepFocus = useRef(false)

  return (
    <DropdownMenuContent
      className="w-72 p-2 shadow-md"
      side="bottom"
      align="start"
      sideOffset={4}
      onCloseAutoFocus={(event) => {
        if (!keepFocus.current) return
        keepFocus.current = false
        event.preventDefault()
      }}
    >
      {destinations.length > 0 && (
        <>
          <DropdownMenuLabel className="px-2 py-1 text-xs font-medium text-tertiary-foreground">
            {t('nav.workspaceScope')}
          </DropdownMenuLabel>
          {destinations.map((destination) => (
            <DropdownMenuItem
              key={destination.id}
              size="lg"
              className="px-2"
              onSelect={() => navigate({ to: destination.to })}
            >
              <HugeiconsIcon
                icon={destination.icon}
                size={16}
                strokeWidth={1.8}
                aria-hidden
              />
              <span>{destination.label}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="my-2" />
        </>
      )}

      {/* Who you are, in full — the trigger shows the name; the email is
          here. Which workspace you are in is its own row below, with the role
          that comes with it. */}
      <DropdownMenuLabel
        className="flex items-center gap-3 p-2 font-normal tracking-normal"
        asChild
      >
        <div>
          <Avatar className="size-10 shrink-0">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <p className="truncate text-sm text-primary-foreground">
              {fullName}
            </p>
            {/* Just the account here. Which workspace you are in is its own row
                below, with the role that comes with it. */}
            <p className="truncate text-xs text-tertiary-foreground">{email}</p>
          </div>
        </div>
      </DropdownMenuLabel>

      <DropdownMenuSeparator className="my-2" />

      <DropdownMenuItem
        size="lg"
        className="px-2"
        onSelect={() => navigate({ to: '/profile' })}
      >
        <UserIcon weight="bold" />
        <span>{t('nav.profile')}</span>
      </DropdownMenuItem>

      <DropdownMenuItem
        size="lg"
        className="px-2"
        onSelect={() => {
          keepFocus.current = true
          useShortcutsStore.getState().setOpen(true)
        }}
      >
        <KeyboardIcon weight="bold" />
        <span className="flex-1">{t('shortcuts.menuItem')}</span>
        <kbd className="inline-flex h-5 min-w-5 items-center justify-center bg-secondary px-1 font-sans text-xs font-medium text-secondary-foreground">
          ?
        </kbd>
      </DropdownMenuItem>

      <DropdownMenuItem size="lg" className="px-2" asChild>
        {/* A real link, not an onSelect: middle-click and "copy link" should
            work on the one row that leaves the app. */}
        <a href={HELP_URL} target="_blank" rel="noreferrer noopener">
          <LifebuoyIcon weight="bold" />
          <span className="flex-1">{t('nav.help')}</span>
          <ArrowSquareOutIcon
            weight="bold"
            className="text-tertiary-foreground"
            aria-label={t('common.opensInNewTab')}
          />
        </a>
      </DropdownMenuItem>

      <DropdownMenuSeparator className="my-2" />

      <CurrentWorkspaceRow
        workspace={workspace}
        onSelect={() => navigate({ to: '/workspace-settings' })}
      />

      <DropdownMenuItem
        size="lg"
        className="px-2"
        onSelect={() => navigate({ to: '/workspaces' })}
      >
        <ArrowsLeftRightIcon weight="bold" />
        <span>{t('nav.switchWorkspace')}</span>
      </DropdownMenuItem>

      <DropdownMenuSeparator className="my-2" />

      <DropdownMenuItem
        size="lg"
        className="px-2"
        onSelect={() => navigate({ to: '/auth/logout' })}
      >
        <SignOutIcon weight="bold" />
        <span>{t('nav.logOut')}</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  )
}

/**
 * Where you are and what you are there — and the way into that workspace's
 * settings, which is what the name and the role are both about.
 *
 * Not the switcher: that is its own row below, and it leads to a page rather
 * than a submenu because switching tears the app down (cleared cache, full
 * reload). The role sits here because it is the thing that changes between
 * workspaces and silently explains why a control was missing in one of them.
 */
function CurrentWorkspaceRow({
  workspace,
  onSelect,
}: {
  workspace: Workspace | undefined
  onSelect: () => void
}) {
  const { t } = useTranslation()
  if (!workspace) return null

  return (
    <DropdownMenuItem className="gap-3 px-2 py-2" onSelect={onSelect}>
      <WorkspaceMark
        id={workspace.id}
        name={workspace.name}
        className="size-10 text-sm"
      />
      <div className="flex min-w-0 flex-col">
        <p className="truncate text-sm">{workspace.name}</p>
        <p className="truncate text-xs text-tertiary-foreground">
          {t(ROLE_LABEL_KEYS[workspace.role])}
        </p>
      </div>
    </DropdownMenuItem>
  )
}
