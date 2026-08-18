import type { ReactNode, Ref } from 'react'
import { XIcon } from '@phosphor-icons/react'
import { ZIndex } from '@/config/zIndex.ts'
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
  /**
   * A mark to the left of the title, as tall as the title and `subheader`
   * together — the panel's own square, the way the rail's trigger is the
   * assistant's. Setting it moves `subheader` into the block beside the mark,
   * so the two lines read as one heading rather than as a row with a caption
   * under it.
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
  leading,
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
        <div
          className="sticky top-0 shrink-0 flex flex-col"
          style={{ zIndex: ZIndex.pageHeader }}
        >
          <div className="bg-primary pt-6 px-3 lg:px-6 flex flex-col gap-0">
            <div className="flex items-stretch justify-between gap-3">
              {/* The whole block is the affordance when it has somewhere to go
                  — mark, title, adornment and, where there is a mark, the
                  second line too. They describe one thing, so they are one
                  target rather than a link with decoration around it. */}
              <TitleBlock onClick={onTitleClick} label={titleLabel} leading={leading}>
                <div className="flex min-w-0 items-baseline gap-2">
                  <h2 className="shrink-0 text-lg font-medium font-display tracking-tight text-foreground">
                    {title}
                  </h2>
                  {titleAdornment}
                </div>
                {leading && subheader}
              </TitleBlock>
              {/* Fixed to the title's own line height rather than centred on
                  the block: with a two-line header, centring drops the close
                  button half a line and it stops reading as the panel's. */}
              <div className="flex h-7 shrink-0 items-center gap-2">
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
            {/* Without a mark the second line is the header's own full-width
                row and runs under the actions, which is what a breadcrumb or a
                metadata line wants. A mark makes the header a block, and the
                line belongs inside it — indented to the title, ending where
                the title ends. */}
            {!leading && subheader}
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
  const className = 'flex min-w-0 flex-1 items-stretch gap-3 text-left'
  const inner = (
    <>
      {leading}
      <div className="flex min-w-0 flex-1 flex-col justify-center">{children}</div>
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
