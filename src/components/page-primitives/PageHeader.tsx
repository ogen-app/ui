import type { ReactNode } from 'react'
import { CaretDownIcon, CaretLeftIcon, ListIcon } from '@phosphor-icons/react'
import { useSidebar } from '@/components/ui/sidebar'
import { ZIndex } from '@/config/zIndex'
import { cn } from '@/lib'
import { Button } from '@/components/ui/button.tsx'
import { useIsMobile } from '@/hooks/use-mobile.ts'
import { useOverlayStore } from '@/stores/overlayStore'

type PageHeaderProps = {
  title?: string
  /** Renders a CaretLeft header button before the title. */
  onBack?: () => void
  /** Extra header buttons rendered in the left part, after the title. */
  leading?: ReactNode
  className?: string
  overlay?: string
  actions?: ReactNode
}

/**
 * Generic page header: a static 40px row with 24px top padding.
 * Left part holds a back button and/or the H1 title; right part holds actions.
 */
export function PageHeader({
  title,
  onBack,
  leading,
  overlay,
  className,
  actions,
}: PageHeaderProps) {
  const { toggleSidebar } = useSidebar()
  const isMobile = useIsMobile()

  const isClickable = !!overlay
  const handleTitleClick = () => {
    if (!overlay) return
    useOverlayStore.getState().open(overlay)
  }

  return (
    <div className={cn('px-3 lg:px-6 pt-6 shrink-0', className)}>
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
          {onBack && (
            <Button
              variant="headerIcon"
              size="excluded"
              onClick={onBack}
              aria-label="Back"
            >
              <CaretLeftIcon className="size-5" />
            </Button>
          )}
          {title !== undefined && (
            <div
              className={cn(
                'flex min-w-0 items-center gap-2 group',
                isClickable && 'cursor-pointer'
              )}
              onClick={isClickable ? handleTitleClick : undefined}
            >
              <h1 className="font-display text-2xl font-medium leading-none tracking-[-0.24px] text-primary-foreground truncate">
                {title}
              </h1>
              {isClickable && (
                <CaretDownIcon
                  className={cn(
                    'shrink-0',
                    isMobile
                      ? 'size-3 text-tertiary-foreground'
                      : 'size-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300'
                  )}
                />
              )}
            </div>
          )}
          {leading}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  )
}
