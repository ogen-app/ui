import { useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ArrowSquareOutIcon, CaretUpDownIcon } from '@phosphor-icons/react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CHROME_ROW,
  ChromeMenuContent,
  ChromeMenuItem,
  ChromeMenuRule,
} from '@/components/layout/chrome'
import { cn } from '@/lib'
import { useAuthStore } from '@/stores/authStore'
import { useShortcutsStore } from '@/stores/shortcutsStore'

/** TODO: placeholder — no help site exists yet. Point at the real one when it does. */
const HELP_URL = 'https://getogen.com/help'

/**
 * You — not the workspace. The foot of the rail mirrors its head: the
 * workspace you are in at the top, the person you are at the bottom, the same
 * row in the same size. The workspace's own things (switching, settings) are
 * in the cell at the top, so this menu is only about you.
 */
export function NavAccount() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  // Closing the menu hands focus back to its trigger, which would pull it out
  // of the shortcuts sheet the row has just opened. One-shot.
  const keepFocus = useRef(false)

  const initials =
    `${user?.firstName[0] ?? ''}${user?.lastName[0] ?? ''}`.toUpperCase() || '?'
  const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('nav.accountMenu')}
        className={cn(CHROME_ROW, 'group-data-[collapsible=icon]:px-1.5')}
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-foreground text-mark font-medium text-primary">
          {initials}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium text-primary-foreground group-data-[collapsible=icon]:hidden">
          {fullName}
        </span>
        <CaretUpDownIcon className="size-3.5 shrink-0 text-tertiary-foreground group-data-[collapsible=icon]:hidden" />
      </DropdownMenuTrigger>
      <ChromeMenuContent
        side="top"
        align="start"
        onCloseAutoFocus={(event) => {
          if (!keepFocus.current) return
          keepFocus.current = false
          event.preventDefault()
        }}
      >
        <div className="px-2.5 pb-2 pt-2">
          <p className="truncate text-sm font-medium">{fullName}</p>
          <p className="truncate text-xs text-tertiary-foreground">
            {user?.email}
          </p>
        </div>
        <ChromeMenuRule />
        <ChromeMenuItem onSelect={() => navigate({ to: '/profile' })}>
          {t('nav.profile')}
        </ChromeMenuItem>
        <ChromeMenuItem
          note="?"
          onSelect={() => {
            keepFocus.current = true
            useShortcutsStore.getState().setOpen(true)
          }}
        >
          {t('shortcuts.menuItem')}
        </ChromeMenuItem>
        <ChromeMenuItem
          note={
            <ArrowSquareOutIcon
              className="size-3.5"
              aria-label={t('common.opensInNewTab')}
            />
          }
          onSelect={() =>
            window.open(HELP_URL, '_blank', 'noopener,noreferrer')
          }
        >
          {t('nav.help')}
        </ChromeMenuItem>
        <ChromeMenuRule />
        <ChromeMenuItem onSelect={() => navigate({ to: '/auth/logout' })}>
          {t('nav.logOut')}
        </ChromeMenuItem>
      </ChromeMenuContent>
    </DropdownMenu>
  )
}
