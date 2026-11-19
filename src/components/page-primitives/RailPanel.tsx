import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react'
import { XIcon } from '@phosphor-icons/react'
import { ZIndex } from '@/config/zIndex.ts'
import { SurfaceFader } from '@/components/page-primitives/SurfaceFader'
import { CHROME_BAR_H } from '@/components/layout/chrome'
import { cn } from '@/lib'

/**
 * Set by a host that already names the panel — the post editor's tabs. Inside
 * it a panel drops its 56px title band and its close button; what the band
 * carried besides the title (a count, its actions) stays, on a slim row at the
 * top of the body, because a version's RESTORE has nowhere else to go.
 */
const RailPanelEmbedded = createContext(false)
export const RailPanelEmbeddedProvider = RailPanelEmbedded.Provider

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
   * Solid panel from the bottom edge up, in px — set it to the middle of the
   * footer's last row.
   *
   * Only worth setting when that row's height is known. Left off, the ramp falls
   * back to covering the footer's whole box and overhanging it by `footerFade`,
   * which is the safe shape for a footer of any depth.
   */
  footerSolid?: number
  /**
   * The ramp above `footerSolid`. Only the part of it clear of the footer's own
   * box is visible: the scroll area stops at that top edge, so nothing is ever
   * painted behind the footer for the rest of the ramp to work on.
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
  leading,
  titleAdornment,
  onTitleClick,
  titleLabel,
  footerSolid,
  footerFade = 32,
}: RailPanelProps) {
  const embedded = useContext(RailPanelEmbedded)
  const footerRef = useRef<HTMLDivElement>(null)
  // The footer overlays the scroll rather than sitting beside it, so the body
  // needs to be told how much room to leave at the end. Measured, because the
  // footer is whatever the panel put there — a composer, a button, chips over a
  // composer — and it resizes as the user types.
  const [footerHeight, setFooterHeight] = useState(0)
  useLayoutEffect(() => {
    const el = footerRef.current
    if (!el) return
    const observer = new ResizeObserver(() => setFooterHeight(el.offsetHeight))
    observer.observe(el)
    setFooterHeight(el.offsetHeight)
    return () => observer.disconnect()
  }, [footer])

  return (
    // `relative`: the footer is positioned against this, not against the
    // scroller — it has to stay put while the thread runs underneath it.
    <div className={cn('relative h-full flex flex-col', className)}>
      <div ref={scrollRef} className="h-0 grow overflow-y-auto flex flex-col">
        {/* The header is the frame's 56px band (`CHROME_BAR_H`), opaque and
            ruled off across the panel's whole width, so its line runs on from
            the bar over the page and the body scrolls under a line, not into
            a fade. One line only: anything a panel says under its title is
            the body's first row. */}
        {embedded ? (
          (titleAdornment || actions) && (
            <div className="flex shrink-0 items-center justify-between gap-3 px-3 pt-4 lg:px-6">
              <div className="flex min-w-0 items-baseline gap-2">
                <h3 className="truncate text-sm font-medium text-foreground">
                  {title}
                </h3>
                {titleAdornment}
              </div>
              <div className="flex shrink-0 items-center gap-2">{actions}</div>
            </div>
          )
        ) : (
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
        )}
        <div
          className={cn(
            'px-3 lg:px-6 pt-4 flex flex-col gap-4',
            // With a footer the room at the end is the spacer's job — it has to
            // match the footer exactly, or the last line either hides under it
            // or stops short of it.
            footer ? null : 'pb-6',
            bodyClassName,
          )}
        >
          {children}
        </div>
        {footer && (
          <div
            style={{ height: footerHeight }}
            className="shrink-0"
            aria-hidden
          />
        )}
      </div>
      {footer && (
        <div
          ref={footerRef}
          className="absolute inset-x-0 bottom-0 px-3 lg:px-6 pb-6"
          style={{ zIndex: ZIndex.pageHeader }}
        >
          {/* A ramp off the bottom edge. `footerSolid` is
              measured from that edge, so it is set to reach the middle of
              whatever row the footer ends with — the composer, a button — and
              the ramp climbs from there, up through the top of that row and out
              over the scroll. Now that the thread runs underneath, the part of
              the ramp crossing the row has something to fade: it shows in the
              gaps the row's own fills leave. */}
          <SurfaceFader
            edge="bottom"
            solid={
              footerSolid === undefined
                ? `calc(100% - ${footerFade}px)`
                : `${footerSolid}px`
            }
            fade={footerFade}
            className="bottom-0"
            style={
              footerSolid === undefined
                ? { top: -footerFade }
                : { height: footerSolid + footerFade }
            }
          />
          <div className="relative">{footer}</div>
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
