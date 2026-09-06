import { useLocation, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  ArrowSquareOutIcon,
  ArrowsLeftRightIcon,
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
import { NavGlyph } from '@/components/layout/nav/NavGlyph'
import { useWorkspaceDestinations } from '@/components/layout/nav/workspaceDestinations'
import { WorkspaceMark } from '@/components/layout/WorkspaceMark'
import { useWorkspace } from '@/hooks/useWorkspaces'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib'
import { ROLE_LABEL_KEYS, type Workspace } from '@/types/workspace'

/** TODO: placeholder — no help site exists yet. Point at the real one when it does. */
const HELP_URL = 'https://getogen.com/help'

/**
 * The bottom of the rail: who and where you are, and — once you are inside a
 * campaign — the workspace you left to get there.
 *
 * **Why this slot changes with the level and the strip above it does not.**
 * The utilities are the same three things wherever you are standing. This is
 * the opposite: at level 0 the workspace *is* the rail, so the slot only has
 * to say which workspace and who is in it; at level 1 the rail belongs to a
 * campaign, and the workspace has gone from being the context to being
 * somewhere you can get back to. A slot that carried the same block at both
 * levels would be claiming the level change did not happen.
 *
 * The account does not move for it. Profile, workspace and log out are the one
 * part of the nav scoped to neither a workspace nor a campaign, so they are
 * the wrong thing to spend on a level change — at level 1 the block shrinks to
 * its mark and the destinations take the room it gives up. Everything it held
 * is still one click away, in a menu that has grown the workspace's own
 * destinations above it.
 */
export function NavAccount({ level }: { level: 0 | 1 }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { user } = useAuthStore()
  const workspace = useWorkspace()
  const destinations = useWorkspaceDestinations()

  const initials =
    `${user?.firstName[0] ?? ''}${user?.lastName[0] ?? ''}`.toUpperCase() || '?'
  const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()

  if (level === 0) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            className="flex w-full cursor-pointer select-none items-center justify-start gap-6 overflow-hidden p-0"
          >
            {/* The workspace's mark, not the user's portrait. Every item above
                it belongs to that workspace, and this is the one slot that
                survives the collapsed rail — so it carries the fact that
                changes rather than the one that never does. Who you are is in
                the menu behind it. */}
            {workspace ? (
              <WorkspaceMark
                id={workspace.id}
                name={workspace.name}
                className="size-10 text-sm"
              />
            ) : (
              <Avatar className="size-10 shrink-0">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            )}
            <div className="flex w-[168px] shrink-0 flex-col items-start transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0">
              <p className="w-full truncate text-left text-sm font-regular">
                {fullName}
              </p>
              {/* The workspace, not the email: the email never changes and is
                  one click away in the menu, while the workspace changes what
                  every other screen is showing. */}
              <p className="w-full truncate text-left text-xs text-tertiary-foreground">
                {workspace?.name ?? user?.email}
              </p>
            </div>
          </div>
        </DropdownMenuTrigger>
        <AccountMenu
          initials={initials}
          fullName={fullName}
          email={user?.email}
          workspace={workspace}
        />
      </DropdownMenu>
    )
  }

  return (
    <div className="flex items-center gap-1 group-data-[collapsible=icon]:flex-col">
      {/* The workspace's modules, carried into the campaign. Hidden on the
          collapsed rail rather than stacked: the rail is one 20px column
          there, and a second vertical run of glyphs under the utilities would
          read as six of one kind of thing. Collapsed, the mark below is the
          only way back out, which is what its menu is for. */}
      <div className="flex items-center gap-1 group-data-[collapsible=icon]:hidden">
        {destinations.map((destination) => (
          <NavGlyph
            key={destination.id}
            label={destination.label}
            icon={destination.icon}
            to={destination.to}
            isActive={destination.isActive(pathname)}
          />
        ))}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t('nav.account')}
            className={cn(
              'ml-auto flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md',
              'hover:bg-sidebar-secondary group-data-[collapsible=icon]:ml-0',
            )}
          >
            <Avatar className="size-6 shrink-0">
              <AvatarFallback className="text-[10px]">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <AccountMenu
          initials={initials}
          fullName={fullName}
          email={user?.email}
          workspace={workspace}
          destinations={destinations}
        />
      </DropdownMenu>
    </div>
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
  destinations?: ReturnType<typeof useWorkspaceDestinations>
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <DropdownMenuContent
      className="w-72 p-2 shadow-md"
      side="right"
      align="end"
      sideOffset={8}
    >
      {destinations.length > 0 && (
        <>
          <DropdownMenuLabel className="px-2 py-1 font-mono text-xs font-medium uppercase text-tertiary-foreground">
            {t('nav.workspaceScope')}
          </DropdownMenuLabel>
          {destinations.map((destination) => (
            <DropdownMenuItem
              key={destination.id}
              size="lg"
              className="px-2"
              onSelect={() => navigate({ to: destination.to })}
            >
              <destination.icon weight="bold" />
              <span>{destination.label}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="my-2" />
        </>
      )}

      {/* The same block the rail shows at level 0, in the same type — mark,
          name, email — so opening the menu reads as the trigger unfolding
          rather than as a different screen. */}
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
