import type { ComponentProps, ReactNode } from 'react'
import { CheckIcon } from '@phosphor-icons/react'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib'

/**
 * The frame's one row and one menu, shared by the workspace cell, the rail,
 * the account cell and the bar over the page.
 *
 * One type in the chrome: 14px, medium for a name (the workspace, the
 * campaign, you), regular for everything you press, 12px for a count or a
 * note beside it. And one row: the workspace, each place and you share a
 * 36px height and a 24px leading slot, so their words start on one line.
 */
export const CHROME_ROW =
  'flex h-9 w-full min-w-0 items-center gap-2.5 rounded-md px-2 text-left text-sm ' +
  'text-secondary-foreground outline-none transition-colors ' +
  'hover:bg-tertiary hover:text-primary-foreground ' +
  'data-[state=open]:bg-tertiary data-[state=open]:text-primary-foreground ' +
  'focus-visible:inset-ring-2 focus-visible:inset-ring-ring'

/** The 56px band the workspace cell, the account cell and the bar share. */
export const CHROME_BAR_H = 'h-14'

export function ChromeMenuContent({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuContent
      sideOffset={4}
      className={cn('w-72 rounded-md p-1.5', className)}
      {...props}
    />
  )
}

/**
 * A menu row: what it is, an optional note on the right in 12px, and a tick
 * when it is the current one.
 */
export function ChromeMenuItem({
  children,
  note,
  on,
  className,
  ...props
}: ComponentProps<typeof DropdownMenuItem> & {
  note?: ReactNode
  on?: boolean
}) {
  return (
    <DropdownMenuItem
      className={cn(
        'gap-2.5 rounded-sm px-2.5 py-2 hover:bg-tertiary data-[highlighted]:bg-tertiary',
        className,
      )}
      {...props}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2.5">
        {children}
      </span>
      {note && (
        <span className="shrink-0 text-xs text-tertiary-foreground">
          {note}
        </span>
      )}
      {on && <CheckIcon weight="bold" className="size-3.5 shrink-0" />}
    </DropdownMenuItem>
  )
}

export function ChromeMenuLabel({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuLabel>) {
  return (
    <DropdownMenuLabel
      className={cn('px-2.5 pb-1 pt-2 text-xs', className)}
      {...props}
    />
  )
}

export function ChromeMenuRule() {
  return <DropdownMenuSeparator className="my-1.5 bg-quaternary" />
}
