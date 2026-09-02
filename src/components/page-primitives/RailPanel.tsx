import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react'
import { XIcon } from '@phosphor-icons/react'
import { ZIndex } from '@/config/zIndex.ts'
import { SurfaceFader } from '@/components/page-primitives/SurfaceFader'
import { cn } from '@/lib'

/**
 * Solid panel from the ramp's own top edge down, so the heading never sits on
 * anything but the surface itself.
 */
const HEADER_SOLID = 36

/** The ramp below it: colour and blur both from full to nothing across this. */
const HEADER_FADE = 48

/**
 * How far above the panel's top edge the whole ramp is hung.
 *
 * The ramp is for the body passing *under* the header. At rest there is nothing
 * under it yet, so any part of it still live where the body begins is a wash
 * over the first line of a panel nobody has scrolled — which read as the fade
 * being half-applied to the content rather than to anything behind it. Lifting
 * it clears the tail off that line; the body's own `pt-2` below opens the rest
 * of the gap, and the two together are what the first line needs to arrive
 * clean.
 *
 * Only the tail is really moving. The lift comes off the solid run as well, but
 * that run has 24px of header padding above the title to give up before it
 * reaches type.
 */
const HEADER_LIFT = 8

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
   * Solid panel from the bottom edge up, in px — set it to the middle of the
   * footer's last row, the way the header's is the middle of the title's line.
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
  subheader,
  leading,
  titleAdornment,
  onTitleClick,
  titleLabel,
  footerSolid,
  footerFade = 32,
}: RailPanelProps) {
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
        {/* One ramp for the whole header, not a solid block with a fade tacked
            under it — so the header has no bottom edge to see. It is sized in
            its own right rather than to the block, because what it has to clear
            is the type: solid to the middle of the title, then out. */}
        <div
          className="sticky top-0 shrink-0 flex flex-col"
          style={{ zIndex: ZIndex.pageHeader }}
        >
          <SurfaceFader
            edge="top"
            solid={`${HEADER_SOLID}px`}
            fade={HEADER_FADE}
            style={{
              top: -HEADER_LIFT,
              height: HEADER_SOLID + HEADER_FADE,
            }}
          />
          <div className="relative pt-6 px-3 lg:px-6 flex flex-col gap-0">
            <div className="flex items-stretch justify-between gap-3">
              {/* The whole block is the affordance when it has somewhere to go
                  — mark, title, adornment and, where there is a mark, the
                  second line too. They describe one thing, so they are one
                  target rather than a link with decoration around it. */}
              <TitleBlock
                onClick={onTitleClick}
                label={titleLabel}
                leading={leading}
              >
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
          {/* Where the header stops. The body's own `pt-2` sits under this. */}
          <div className="h-3 shrink-0" aria-hidden />
        </div>
        <div
          className={cn(
            // `pt-2` is the other half of `HEADER_LIFT`: it starts the body
            // clear of the ramp's tail, so the first line is never washed by a
            // fade that has nothing behind it yet.
            'px-3 lg:px-6 pt-2 flex flex-col gap-4',
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
          {/* The header's ramp, mirrored off the bottom edge. `footerSolid` is
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
  const className = 'flex min-w-0 flex-1 items-stretch gap-3 text-left'
  const inner = (
    <>
      {leading}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        {children}
      </div>
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
