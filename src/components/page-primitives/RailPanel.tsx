import type { ReactNode, Ref } from 'react'
import { XIcon } from '@phosphor-icons/react'
import { cn } from '@/lib'

type RailPanelProps = {
  title: string
  onClose?: () => void
  actions?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  /** The panel's scroll container — for panels that drive it (chat autoscroll). */
  scrollRef?: Ref<HTMLDivElement>
  /** A second row inside the sticky header (context bar, breadcrumb). */
  subheader?: ReactNode
}

export function RailPanel({
  title,
  onClose,
  actions,
  footer,
  children,
  className,
  bodyClassName,
  scrollRef,
  subheader,
}: RailPanelProps) {
  return (
    <div className={cn('h-full flex flex-col', className)}>
      <div ref={scrollRef} className="h-0 grow overflow-y-auto flex flex-col">
        <div className="sticky top-0 z-10 pt-6 pb-6 px-3 lg:px-6 flex flex-col gap-0 shrink-0 bg-gradient-to-b from-primary from-42% to-transparent">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium font-display tracking-tight text-foreground">
              {title}
            </h2>
            <div className="flex items-center gap-2">
              {actions}
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="flex items-center justify-center size-6 text-secondary-foreground hover:text-foreground cursor-pointer"
                >
                  <XIcon className="size-5" />
                </button>
              )}
            </div>
          </div>
          {subheader}
        </div>
        <div className={cn('px-3 lg:px-6 pb-6 flex flex-col gap-4', bodyClassName)}>
          {children}
        </div>
      </div>
      {footer && <div className="shrink-0 px-3 lg:px-6 pb-6">{footer}</div>}
    </div>
  )
}
