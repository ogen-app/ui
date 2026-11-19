import type { ReactNode, Ref } from 'react'
import { XIcon } from '@phosphor-icons/react'
import { ZIndex } from '@/config/zIndex.ts'
import { CHROME_BAR_H } from '@/components/layout/chrome'
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
  /**
   * A mark to the left of the title — the panel's own square, the way the
   * rail's trigger is the assistant's.
   *
   * It sits inside the title's button when `onTitleClick` is set, so it must
   * not be interactive itself. To answer the hover it can style off
   * `group-hover/title:`.
   */
  leading?: ReactNode
  /**
   * Sits on the title's baseline, after it — a count or a badge. Must stay
   * non-interactive: with `onTitleClick` set, the whole title row (adornment
   * included) renders inside one button, and a control in here would nest
   * interactive content and lose its clicks to the title action.
   */
  titleAdornment?: ReactNode
  /** Makes the whole title row a button. Give it an `aria-label` via `titleLabel`. */
  onTitleClick?: () => void
  /** Accessible name for the title button, when `onTitleClick` is set. */
  titleLabel?: string
  /**
   * The footer section's padding, for a footer whose content brings its own
   * (the assistant's composer is a 56px row, the header's band).
   */
  footerClassName?: string
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
  leading,
  titleAdornment,
  onTitleClick,
  titleLabel,
  footerClassName,
}: RailPanelProps) {
  return (
    <div className={cn('h-full flex flex-col', className)}>
      <div ref={scrollRef} className="h-0 grow overflow-y-auto flex flex-col">
        {/* The header is the frame's 56px band (`CHROME_BAR_H`), opaque and
            ruled off across the panel's whole width, so its line runs on from
            the bar over the page and the body scrolls under a line, not into
            a fade. One line only: anything a panel says under its title is
            the body's first row. */}
        <div
          className={cn(
            'sticky top-0 shrink-0 flex items-center justify-between gap-3 bg-primary border-b border-border px-3 lg:px-6',
            CHROME_BAR_H,
          )}
          style={{ zIndex: ZIndex.pageHeader }}
        >
          {/* The whole block is the affordance when it has somewhere to go —
              mark, title and adornment. They describe one thing, so they are
              one target rather than a link with decoration around it. */}
          <TitleBlock
            onClick={onTitleClick}
            label={titleLabel}
            leading={leading}
          >
            <h2 className="shrink-0 text-lg font-medium font-display tracking-tight text-foreground">
              {title}
            </h2>
            {titleAdornment}
          </TitleBlock>
          <div className="flex shrink-0 items-center gap-2">
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
        <div
          className={cn(
            'px-3 lg:px-6 pt-4 pb-6 flex flex-col gap-4',
            bodyClassName,
          )}
        >
          {children}
        </div>
      </div>
      {/* The footer is the header's counterpart: a solid section ruled off
          across the panel's whole width, under the scroll rather than over it,
          so the body ends at a line instead of fading out behind a ramp. */}
      {footer && (
        <div
          className={cn(
            'shrink-0 border-t border-border bg-primary px-3 py-4 lg:px-6',
            footerClassName,
          )}
        >
          {footer}
        </div>
      )}
    </div>
  )
}

function TitleBlock({
  onClick,
  label,
  leading,
  children,
}: {
  onClick?: () => void
  label?: string
  leading?: ReactNode
  children: ReactNode
}) {
  const className = 'flex min-w-0 flex-1 items-center gap-3 text-left'
  const inner = (
    <>
      {leading}
      <div className="flex min-w-0 flex-1 items-baseline gap-2">{children}</div>
    </>
  )
  if (!onClick) return <div className={className}>{inner}</div>
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      // Named, because the mark hangs its hover state off it — see `leading`.
      className={cn(className, 'group/title cursor-pointer')}
    >
      {inner}
    </button>
  )
}
