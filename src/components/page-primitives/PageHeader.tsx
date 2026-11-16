import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ListIcon } from '@phosphor-icons/react'
import { useRouterState } from '@tanstack/react-router'
import { NavIcon } from '@/components/layout/nav/NavIcon'
import { placeGlyph } from '@/components/layout/nav/placeGlyph'
import { whereOf } from '@/lib/campaignScope'
import { useSidebar } from '@/components/ui/sidebar'
import { ZIndex } from '@/config/zIndex'
import { cn } from '@/lib'
import { findScrollParent } from '@/lib/scrollParent'
import { Button } from '@/components/ui/button.tsx'
import { useIsMobile } from '@/hooks/use-mobile.ts'

type PageHeaderProps = {
  title?: string
  /** A fully-formed back control (button or link), rendered before the title. */
  back?: ReactNode
  /** Custom left-side content rendered after the title (or instead of it). */
  children?: ReactNode
  className?: string
  /**
   * Passive status for the middle of the row — the autosave indicator, and
   * nothing else. Non-interactive by rule: the slot is `pointer-events-none`
   * so a wide status can never swallow a click meant for the title or an
   * action behind it.
   */
  center?: ReactNode
  actions?: ReactNode
  /**
   * Fades the title and the fader gradient out once the page scrolls; the
   * buttons on both sides stay visible and clickable. Requires a scrollable
   * ancestor (the header must sit inside the page's scroll container).
   */
  fadeOnScroll?: boolean
}

/**
 * The one page-header primitive: a sticky 40px row ruled off from the page by
 * a hairline that runs the content column's full width, with 8px above the row
 * and 8px below it, so an action on the right sits centred between the two. Solid while it stays put, so content
 * passes behind the rule rather than through it; the fading variant keeps its
 * gradient and lets the rule go with the title. Every top bar (workspace
 * pages, post details, asset editor) composes this component — don't
 * hand-roll header chrome elsewhere.
 *
 * A page with no back control is a module's own page, and its title leads with
 * that module's glyph in its hue — the rail row's, read off the address
 * (`whereOf`), so the header and the highlighted row name the same place. A
 * page with a back control was opened from a module, and leads with the way
 * back instead.
 */
export function PageHeader({
  title,
  back,
  children,
  className,
  center,
  actions,
  fadeOnScroll,
}: PageHeaderProps) {
  const { toggleSidebar } = useSidebar()
  const isMobile = useIsMobile()
  const rootRef = useRef<HTMLDivElement>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!fadeOnScroll) return
    const scroller = findScrollParent(rootRef.current)
    if (!scroller) return
    const onScroll = () => setScrolled(scroller.scrollTop > 8)
    onScroll()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [fadeOnScroll])

  const faded = fadeOnScroll && scrolled
  const place = useRouterState({
    select: (s) =>
      whereOf(
        s.location.pathname,
        (s.location.search as { pick?: unknown }).pick,
      ).place,
  })
  const glyph = !back && place ? placeGlyph(place) : null

  return (
    <div
      ref={rootRef}
      className={cn(
        'sticky top-0 pt-2 shrink-0',
        // The fading variant moves the gradient to its own layer (so it can
        // dissolve independently) and must not eat clicks once that layer is
        // gone — pointer events are re-enabled per button group below.
        fadeOnScroll ? 'pointer-events-none' : 'bg-background',
        className,
      )}
      style={{ zIndex: ZIndex.pageHeader }}
    >
      {fadeOnScroll && (
        <div
          aria-hidden
          className={cn(
            'absolute inset-0 bg-gradient-to-b from-background from-42% to-transparent transition-opacity duration-300',
            faded && 'opacity-0',
          )}
        />
      )}
      <div className="relative flex h-10 items-center gap-3 px-3 lg:px-6">
        <div
          className={cn(
            'md:hidden shrink-0',
            fadeOnScroll && 'pointer-events-auto',
          )}
        >
          <Button
            variant={'default'}
            size={isMobile ? 'smIcon' : 'defaultIcon'}
            onClick={toggleSidebar}
            className="relative"
            style={{ zIndex: ZIndex.sidebarOverlay + 1 }}
            aria-label="Toggle sidebar"
          >
            <ListIcon className="size-5" />
          </Button>
        </div>
        {/* `relative` on both side groups only so they paint over the
            absolutely-positioned centre when a long title runs into it. */}
        <div className="relative flex flex-1 min-w-0 items-center gap-2">
          {back &&
            (fadeOnScroll ? (
              <span className="flex shrink-0 pointer-events-auto">{back}</span>
            ) : (
              back
            ))}
          {glyph && (
            <span
              className={cn(
                'flex shrink-0',
                fadeOnScroll && 'transition-opacity duration-300',
                faded && 'opacity-0',
              )}
            >
              <NavIcon icon={glyph.icon} tone={glyph.tone} size={22} />
            </span>
          )}
          {title !== undefined && (
            <h1
              className={cn(
                'type-display font-display text-display font-semibold tracking-tight text-primary-foreground truncate',
                fadeOnScroll && 'transition-opacity duration-300',
                faded && 'opacity-0',
              )}
            >
              {title}
            </h1>
          )}
          {children}
        </div>
        {/* Absolute rather than a third flex child: a flex centre only lands
            on the true middle when both side groups are the same width, and
            they never are. It also doesn't fade with the title — whether your
            edits are saved matters most once you've scrolled into the
            document. */}
        {center && (
          <div className="pointer-events-none absolute inset-x-0 flex justify-center">
            <div className="flex items-center">{center}</div>
          </div>
        )}
        {actions && (
          <div
            className={cn(
              'relative flex shrink-0 items-center gap-2',
              fadeOnScroll && 'pointer-events-auto',
            )}
          >
            {actions}
          </div>
        )}
      </div>
      <div
        aria-hidden
        className={cn(
          'relative mt-2 h-px bg-border',
          fadeOnScroll && 'transition-opacity duration-300',
          faded && 'opacity-0',
        )}
      />
    </div>
  )
}
