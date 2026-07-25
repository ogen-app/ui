import type { ReactNode } from 'react'
import { ListIcon } from '@phosphor-icons/react'
import { useSidebar } from '@/components/ui/sidebar'
import { ZIndex } from '@/config/zIndex'
import { cn } from '@/lib'
import { Button } from '@/components/ui/button.tsx'
import { useIsMobile } from '@/hooks/use-mobile.ts'

type PageHeaderProps = {
  title?: string
  /** A fully-formed back control (button or link), rendered before the title. */
  back?: ReactNode
  /** Custom left-side content rendered after the title (or instead of it). */
  children?: ReactNode
  className?: string
  actions?: ReactNode
}

/**
 * The one page-header primitive: a sticky 40px row with the shared fade-out
 * gradient, so content scrolls under it and dissolves. Every top bar
 * (workspace pages, post details, asset editor) composes this component —
 * don't hand-roll header chrome elsewhere.
 */
export function PageHeader({
  title,
  back,
  children,
  className,
  actions,
}: PageHeaderProps) {
  const { toggleSidebar } = useSidebar()
  const isMobile = useIsMobile()

  return (
    <div
      className={cn(
        'sticky top-0 px-3 lg:px-6 pt-6 pb-4 shrink-0 bg-gradient-to-b from-background from-42% to-transparent',
        className,
      )}
      style={{ zIndex: ZIndex.pageHeader }}
    >
      <div className="flex h-10 items-center gap-3">
        <div className="md:hidden shrink-0">
          <Button
            variant={'default'}
            size={isMobile ? 'smIcon' : 'defaultIcon'}
            onClick={toggleSidebar}
            className="md:hidden relative"
            style={{ zIndex: ZIndex.sidebarOverlay + 1 }}
            aria-label="Toggle sidebar"
          >
            <ListIcon className="size-5" />
          </Button>
        </div>
        <div className="flex flex-1 min-w-0 items-center gap-2">
          {back}
          {title !== undefined && (
            <h1 className="font-display text-2xl font-medium leading-8 tracking-[-0.24px] text-primary-foreground truncate">
              {title}
            </h1>
          )}
          {children}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  )
}
