import { useEffect, useRef, type ReactNode } from 'react'
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
import { usePageCrumbStore } from '@/stores/pageCrumbStore'

type PageHeaderProps = {
  /** The place's name — "Strategy", "Posts". The campaign is the switcher's. */
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
   * A field laid over the whole row — 4px past it on every side, the glyph
   * and the actions included — while what it covers stays where it was,
   * inert, so opening and closing it moves nothing. Ideas' capture field.
   */
  overlay?: ReactNode
  /**
   * A document page: the header scrolls away with the page, and the bar over
   * the page takes over its title (`pageCrumbStore`). Requires a scrollable ancestor (the header must sit
   * inside the page's scroll container).
   */
  scrollAway?: boolean
}

/**
 * The one page-header primitive: a 40px row ruled off from the page by a
 * hairline that runs the content column's full width, with 8px above the row
 * and 8px below it, so an action on the right sits centred between the two.
 * Always solid. Every top bar (workspace pages, post details, asset editor)
 * composes this component — don't hand-roll header chrome elsewhere.
 *
 * The title is the place's name and nothing else, at both levels: which
 * campaign it is narrowed to is the switcher's to say, in the bar above.
 *
 * A page with no back control is a module's own page, and its title leads with
 * that module's glyph in its hue — the rail row's, read off the address
 * (`whereOf`), so the header and the highlighted row name the same place. A
 * page with a back control was opened from a module, and leads with the way
 * back instead.
 *
 * **Two behaviours on scroll.** A list or a grid keeps its header pinned —
 * its actions are what you steer it with. A document (`scrollAway`) lets the
 * header go with the page, and the bar over the page carries its title
 * instead, after the campaign. Only the title: which card is being read is
 * not tracked.
 */
export function PageHeader({
  title,
  back,
  children,
  className,
  center,
  actions,
  overlay,
  scrollAway,
}: PageHeaderProps) {
  const { toggleSidebar } = useSidebar()
  const isMobile = useIsMobile()
  const rootRef = useRef<HTMLDivElement>(null)
  const show = usePageCrumbStore((s) => s.show)
  const hide = usePageCrumbStore((s) => s.hide)

  useEffect(() => {
    if (!scrollAway || title === undefined) return
    const scroller = findScrollParent(rootRef.current)
    if (!scroller) return
    const owner = Symbol(title)
    const toTop = () => scroller.scrollTo({ top: 0, behavior: 'smooth' })
    const onScroll = () => {
      const header = rootRef.current?.getBoundingClientRect()
      if (!header) return
      if (header.bottom > scroller.getBoundingClientRect().top) hide(owner)
      else show(owner, { title, toTop })
    }
    onScroll()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      hide(owner)
    }
  }, [scrollAway, title, show, hide])

  const place = useRouterState({
    select: (s) => whereOf(s.location.pathname).place,
  })
  const glyph = !back && place ? placeGlyph(place) : null

  return (
    <div
      ref={rootRef}
      className={cn(
        'pt-2 shrink-0 bg-background',
        !scrollAway && 'sticky top-0',
        className,
      )}
      style={scrollAway ? undefined : { zIndex: ZIndex.pageHeader }}
    >
      <div className="relative flex min-h-10 items-center gap-3 px-3 lg:px-6">
        <div className="md:hidden shrink-0">
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
        <div
          inert={!!overlay}
          className="relative flex flex-1 min-w-0 items-center gap-2"
        >
          {back}
          {glyph && (
            <span className="flex shrink-0">
              <NavIcon icon={glyph.icon} tone={glyph.tone} size={22} />
            </span>
          )}
          {title !== undefined && (
            <h1 className="type-display font-display text-display font-semibold tracking-tight text-primary-foreground truncate">
              {title}
            </h1>
          )}
          {children}
        </div>
        {/* Absolute rather than a third flex child: a flex centre only lands
            on the true middle when both side groups are the same width, and
            they never are. */}
        {center && (
          <div className="pointer-events-none absolute inset-x-0 flex justify-center">
            <div className="flex items-center">{center}</div>
          </div>
        )}
        {actions && (
          <div
            inert={!!overlay}
            className="relative flex shrink-0 items-center gap-2"
          >
            {actions}
          </div>
        )}
        {overlay && (
          // The row's padding less 4px: the field's edge runs 4px outside
          // the glyph and the action it covers.
          <div className="absolute -top-1 right-2 left-2 lg:right-5 lg:left-5">
            {overlay}
          </div>
        )}
      </div>
      <div aria-hidden className="relative mt-2 h-px bg-border" />
    </div>
  )
}
