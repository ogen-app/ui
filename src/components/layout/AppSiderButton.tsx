import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib'

type AppSidebarButtonSearchProps = {
  onClick?: () => void
}

export function AppSidebarButtonSearch({ onClick }: AppSidebarButtonSearchProps) {
  return (
    <Button variant="searchBar" size={'excluded'} onClick={onClick}>
      <div>
        <MagnifyingGlassIcon className="size-5 flex-none" />
        <div className="flex-none text-left w-[108px]">
          <span className="font-grotesk font-medium uppercase">Search</span>
        </div>
        <div className="hidden lg:block w-16 flex-none">
          <span className="text-right font-grotesk font-medium uppercase">CMD + F</span>
        </div>
      </div>
    </Button>
  )
}

type AppSidebarButtonMenuProps = {
  /** Fully rendered icon element (Phosphor icon or a custom node). */
  icon: ReactNode
  text: string
  isActive: boolean
  /** When provided the button renders as a Link, otherwise as a plain action. */
  to?: string
  params?: Record<string, string>
  onClick?: () => void
  className?: string
}

export function AppSidebarButtonMenu({
  icon,
  text,
  isActive,
  to,
  params,
  onClick,
  className,
}: AppSidebarButtonMenuProps) {
  const content = (
    <>
      {icon}
      <div className="transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0">
        {/* The container is wider than the button so labels never reflow while
            the sidebar collapses; the label itself is capped at the visible
            width so a long name ellipses on-screen instead of past the clip.
            The 2% tracking is for the uppercase: caps set solid read as a block,
            and these labels are scanned rather than read. */}
        <span className="block w-[212px] truncate text-left tracking-[0.02em] lg:w-[180px]">
          {text}
        </span>
      </div>
    </>
  )

  if (to) {
    return (
      <Button
        variant="menu"
        size={'excluded'}
        asChild
        active={isActive}
        className={cn(className, isActive && 'text-sidebar-primary-foreground')}
      >
        <Link to={to} params={params} onClick={onClick}>
          {content}
        </Link>
      </Button>
    )
  }

  return (
    <Button
      variant="menu"
      size={'excluded'}
      active={isActive}
      className={cn(className, isActive && 'text-sidebar-primary-foreground')}
      onClick={onClick}
    >
      {content}
    </Button>
  )
}
