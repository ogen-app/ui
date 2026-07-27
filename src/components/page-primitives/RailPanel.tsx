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
  /** Sits on the title's baseline, after it — a count, a badge, a switcher. */
  titleAdornment?: ReactNode
  /** Makes the whole title row a button. Give it an `aria-label` via `titleLabel`. */
  onTitleClick?: () => void
  /** Accessible name for the title button, when `onTitleClick` is set. */
  titleLabel?: string
  /**
   * Height in px of the fade above the footer. Taller when the footer carries
   * more than the one row it usually does.
   */
  footerFade?: number
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
  titleAdornment,
  onTitleClick,
  titleLabel,
  footerFade = 24,
}: RailPanelProps) {
  return (
    <div className={cn('h-full flex flex-col', className)}>
      <div ref={scrollRef} className="h-0 grow overflow-y-auto flex flex-col">
        {/* Opaque behind the title and subheader, fading only below them —
            a long thread would otherwise scroll visibly through the header. */}
        <div className="sticky top-0 z-10 shrink-0 flex flex-col">
          <div className="bg-primary pt-6 px-3 lg:px-6 flex flex-col gap-0">
            <div className="flex items-center justify-between gap-3">
              {/* The whole title row is the affordance when it has somewhere
                  to go — the adornment is part of the target, not a control
                  sitting next to one. */}
              <TitleRow onClick={onTitleClick} label={titleLabel}>
                <h2 className="shrink-0 text-lg font-medium font-display tracking-tight text-foreground">
                  {title}
                </h2>
                {titleAdornment}
              </TitleRow>
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
          <div
            className="h-6 shrink-0 bg-gradient-to-b from-primary to-transparent"
            aria-hidden
          />
        </div>
        <div className={cn('px-3 lg:px-6 pb-6 flex flex-col gap-4', bodyClassName)}>
          {children}
        </div>
      </div>
      {footer && (
        <div className="relative shrink-0 bg-primary px-3 lg:px-6 pb-6">
          {/* The header's fade, mirrored. The scroll area stops at the footer's
              top edge, so without this the thread is cut off mid-line by
              whatever the footer holds — chips one moment, the composer the
              next. Sits above the footer and over the last of the scroll. */}
          <div
            aria-hidden
            style={{ height: footerFade }}
            className="pointer-events-none absolute inset-x-0 bottom-full bg-gradient-to-t from-primary to-transparent"
          />
          {footer}
        </div>
      )}
    </div>
  )
}

function TitleRow({
  onClick,
  label,
  children,
}: {
  onClick?: () => void
  label?: string
  children: ReactNode
}) {
  const className = 'flex min-w-0 items-baseline gap-2 text-left'
  if (!onClick) return <div className={className}>{children}</div>
  return (
    <button type="button" onClick={onClick} aria-label={label} className={cn(className, 'cursor-pointer')}>
      {children}
    </button>
  )
}
