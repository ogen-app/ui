import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { CaretUpDownIcon, PlusIcon } from '@phosphor-icons/react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CHROME_ROW,
  ChromeMenuContent,
  ChromeMenuItem,
  ChromeMenuLabel,
  ChromeMenuRule,
} from '@/components/layout/chrome'
import { WorkspaceMark } from '@/components/layout/WorkspaceMark'
import {
  useSwitchWorkspace,
  useWorkspace,
  useWorkspaces,
} from '@/hooks/useWorkspaces'
import { cn } from '@/lib'
import { ROLE_LABEL_KEYS } from '@/types/workspace'

/**
 * Top left: whose work this is. The workspace, and everything that belongs to
 * it rather than to a page — switching to another one, and its settings.
 * Settings are not a place in the menu below; they are the workspace's, so
 * they hang off the workspace.
 *
 * Collapsed, the rail is one 36px column and the cell keeps only its mark.
 */
export function WorkspaceCell() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const workspace = useWorkspace()
  const { data: workspaces = [] } = useWorkspaces()
  const switchWorkspace = useSwitchWorkspace()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('nav.workspaceMenu')}
        className={cn(CHROME_ROW, 'group-data-[collapsible=icon]:px-1.5')}
      >
        <span className="flex size-6 shrink-0 items-center justify-center">
          {workspace && (
            <WorkspaceMark
              id={workspace.id}
              name={workspace.name}
              className="size-6 rounded-sm"
            />
          )}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium text-primary-foreground group-data-[collapsible=icon]:hidden">
          {workspace?.name}
        </span>
        <CaretUpDownIcon className="size-3.5 shrink-0 text-tertiary-foreground group-data-[collapsible=icon]:hidden" />
      </DropdownMenuTrigger>
      <ChromeMenuContent align="start">
        <ChromeMenuLabel>{t('nav.yourWorkspaces')}</ChromeMenuLabel>
        {workspaces.map((choice) => (
          <ChromeMenuItem
            key={choice.id}
            on={choice.id === workspace?.id}
            onSelect={() => {
              if (choice.id !== workspace?.id) switchWorkspace.mutate(choice.id)
            }}
          >
            <WorkspaceMark
              id={choice.id}
              name={choice.name}
              className="size-5 rounded-sm"
            />
            <span className="truncate">{choice.name}</span>
          </ChromeMenuItem>
        ))}
        <ChromeMenuItem onSelect={() => navigate({ to: '/workspaces' })}>
          <PlusIcon className="size-4" />
          {t('nav.switchWorkspace')}
        </ChromeMenuItem>
        {workspace && (
          <>
            <ChromeMenuRule />
            <ChromeMenuLabel className="truncate">
              {workspace.name}
            </ChromeMenuLabel>
            <ChromeMenuItem
              note={t(ROLE_LABEL_KEYS[workspace.role])}
              onSelect={() => navigate({ to: '/workspace-settings' })}
            >
              {t('nav.workspaceSettings')}
            </ChromeMenuItem>
          </>
        )}
      </ChromeMenuContent>
    </DropdownMenu>
  )
}
