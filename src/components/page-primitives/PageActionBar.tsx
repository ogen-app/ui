import {
  Children,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AlertCircleIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { ZIndex } from '@/config/zIndex'
import { cn } from '@/lib'

/**
 * The bottom padding a page must leave under its last card so the bar never
 * covers it: 56px of bar and 24px of breath above it.
 */
export const PAGE_ACTION_BAR_INSET = 'pb-20'

/**
 * Long enough to read as a deliberate hand-off, short enough not to wait on.
 * Outlasts the fade's `duration-100` by 10ms, so the new set never appears
 * while the old one is still visibly going.
 */
const FADE_MS = 110

/**
 * The hand-off is animation, and the pause exists only to pace it — someone
 * who asked for no motion shouldn't get a blank unclickable moment with no
 * motion to explain it. Read per hand-off rather than cached: it can change
 * mid-session.
 */
const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * A fact about the object, shown after the actions — with a short form for
 * when the long one won't fit.
 *
 * `key` is what tells the bar the wording changed and it should re-measure;
 * the nodes themselves are elements, and the bar can't read inside them.
 */
export type BarStatus = {
  full: ReactNode
  compact: ReactNode
  key: string
}

/**
 * The commit panel — the actions that advance *this* object through its
 * lifecycle, on a white band along the bottom of the content column.
 *
 * The rule it implements: the top of a screen is about the object (where you
 * are, and which view of it you are looking at), the bottom is about the work
 * (what you can do to it). Only **editor** screens get one. A post, an asset
 * and a campaign brief are documents you are inside, with something to commit;
 * a list is a place you browse, and creating a row is not a commit.
 *
 * **The band is the nav's account row, carried across.** 56px with a rule on
 * top, the height of the rail's footer (`AppSidebar`), so the two read as one
 * band along the bottom of the app. It spans the content column edge to edge;
 * the buttons sit on the left, on the cards' gutter, the main one first and
 * black (`defaultInverted`), the others white with a border (`outline`). Never
 * a grey or a ghost button, and labels in sentence case.
 *
 * ## Placement
 *
 * Renders absolutely, so the caller must give it a positioned ancestor, and
 * that ancestor must be the **content column** rather than the page's scroll
 * container: inside the scroller the band would scroll away with the content,
 * and fixed to the viewport it would run under the right rail when that opens.
 *
 * Pass actions as siblings or an array, not wrapped in a fragment: a fragment
 * arrives as a single child.
 *
 * ## A child that renders nothing still takes a slot
 *
 * `Children.toArray` counts an element whose render returns `null`. Anything
 * conditional must be `null` *here*, at the call site — which is why `status`
 * is a slot with its own prop rather than something you hand in with the
 * actions.
 */
export function PageActionBar({
  blocker,
  status,
  contentKey,
  children,
  className,
}: {
  /**
   * Why the main action can't run yet, said in place beside it. The band is
   * the only affordance with room for this — a header button could only
   * refuse.
   */
  blocker?: ReactNode
  /** Read-only context for the actions before it. See `BarStatus`. */
  status?: BarStatus | null
  /**
   * Changes when the *set of actions* changes — not when their internal state
   * does. It is what the band fades on: a value that also moved for a spinner
   * would restart the hand-off mid-flight.
   */
  contentKey?: string
  children: ReactNode
  className?: string
}) {
  const items = Children.toArray(children)
  if (items.length === 0) return null

  return (
    <div
      className={cn(
        'absolute inset-x-0 bottom-0 flex h-14 items-center border-t border-border bg-primary px-3 lg:px-6',
        className,
      )}
      style={{ zIndex: ZIndex.pageActionBar }}
    >
      <BarRow
        blocker={blocker}
        status={status ?? null}
        contentKey={contentKey}
        items={items}
      />
    </div>
  )
}

/**
 * The band's row, and the two things it works out for itself: whether the
 * long status still fits, and how to hand from one set of actions to the next.
 *
 * **The hand-off.** When the actions change, the old set fades out and only
 * then does the new set appear. Cross-fading would have two sets of words
 * legible on top of each other, and re-flowing the buttons under the cursor
 * while they are still readable invites a click on whatever slides into place.
 */
function BarRow({
  blocker,
  status,
  contentKey,
  items,
}: {
  blocker?: ReactNode
  status: BarStatus | null
  contentKey?: string
  items: ReactNode[]
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const [compact, setCompact] = useState(false)
  const [measuring, setMeasuring] = useState(true)
  const [fading, setFading] = useState(false)
  const [shownKey, setShownKey] = useState(contentKey)

  /**
   * What is painted right now, which during a hand-off is the *previous* set.
   *
   * Held in a ref rather than state: `children` is a fresh array of elements on
   * every render, so storing it would either loop or need an equality check
   * over nodes the bar can't read. `contentKey` is the caller's promise about
   * when it has actually changed, and it is the only thing trusted here.
   */
  const held = useRef({ blocker, status, items })
  if (contentKey === undefined || contentKey === shownKey) {
    held.current = { blocker, status, items }
  }
  const shown = held.current

  useEffect(() => {
    if (contentKey === undefined || contentKey === shownKey) return
    if (prefersReducedMotion()) {
      setShownKey(contentKey)
      return
    }
    setFading(true)
    const id = setTimeout(() => {
      setShownKey(contentKey)
      setFading(false)
    }, FADE_MS)
    return () => clearTimeout(id)
  }, [contentKey, shownKey])

  // Anything that can change the row's natural width re-opens the question of
  // whether the long status still fits.
  useLayoutEffect(() => {
    setMeasuring(true)
  }, [shownKey, shown.status?.key, shown.blocker])

  /**
   * A layout effect, so the browser never paints between the passes: the long
   * form is measured against the band and, if it doesn't fit, replaced by the
   * short one before anything reaches the screen. Measured against the long
   * form always — the short one fits by definition, so measuring *it* would
   * flip the status back and forth forever.
   */
  useLayoutEffect(() => {
    if (!measuring) return
    const row = rowRef.current
    const band = row?.parentElement
    if (!row || !band) return
    const pad = getComputedStyle(band)
    const room =
      band.clientWidth -
      parseFloat(pad.paddingLeft) -
      parseFloat(pad.paddingRight)
    // Zero means the element has no layout — jsdom, or a detached tree. Not a
    // measurement, so it decides nothing.
    if (row.scrollWidth > 0) setCompact(row.scrollWidth > room)
    setMeasuring(false)
  }, [measuring])

  const statusNode = shown.status
    ? measuring || !compact
      ? shown.status.full
      : shown.status.compact
    : null

  return (
    <div
      ref={rowRef}
      className={cn(
        'flex w-max min-w-0 items-center gap-2',
        'transition-opacity duration-100 motion-reduce:transition-none',
        // Faded doesn't mean gone: during the hand-off the old buttons are
        // still in the tree at opacity 0. Neither set may take a click the
        // user can't see landing.
        fading ? 'pointer-events-none opacity-0' : 'opacity-100',
      )}
    >
      {shown.items}
      {statusNode && (
        <>
          <PageActionBarDivider />
          {statusNode}
        </>
      )}
      {shown.blocker && (
        <span className="flex items-center gap-1.5 px-1 text-xs text-tertiary-foreground">
          <HugeiconsIcon
            icon={AlertCircleIcon}
            size={16}
            strokeWidth={1.5}
            className="shrink-0"
          />
          {shown.blocker}
        </span>
      )}
    </div>
  )
}

/** The bar's own rule between two controls. */
function PageActionBarDivider() {
  return <span className="h-6 w-px shrink-0 bg-border" aria-hidden />
}
