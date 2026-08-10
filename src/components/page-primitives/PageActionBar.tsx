import {
  Children,
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { WarningCircleIcon } from '@phosphor-icons/react'
import { ZIndex } from '@/config/zIndex'
import { cn } from '@/lib'

/**
 * The bottom padding a page must leave under its last card so the bar never
 * covers it: 48px of bar, 16px of gap below it, 16px of breath above.
 */
export const PAGE_ACTION_BAR_INSET = 'pb-20'

/**
 * The widest the bar may grow: the content column's own maximum. A bar wider
 * than the cards it acts on stops reading as part of the document and starts
 * reading as page chrome, so instead of overflowing it asks its status for a
 * shorter form.
 */
export const MAX_BAR_WIDTH = 740

/** Long enough to read as a deliberate hand-off, short enough not to wait on. */
const FADE_MS = 110
const RESIZE_MS = 190

/**
 * A fact about the object, shown beside the actions — with a short form for
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
 * The floating commit bar — the actions that advance *this* object through its
 * lifecycle, on their own surface at the bottom of the content column.
 *
 * The rule it implements: the top of a screen is about the object (where you
 * are, and which view of it you are looking at), the bottom is about the work
 * (what you can do to it, and the assistant). It replaces the pile of status
 * buttons that used to share the top-right corner with the view toggles and
 * the save indicator, where a control pressed twenty times an hour sat 8px
 * from one that schedules a post.
 *
 * Only **editor** screens get a bar. A post, an asset and a campaign brief are
 * documents you are inside, with something to commit; a list is a place you
 * browse, and creating a row is not a commit — ADD CAMPAIGN stays top-right.
 *
 * ## Placement
 *
 * Renders absolutely, so the caller must give it a positioned ancestor, and
 * that ancestor must be the **content column** rather than the page's scroll
 * container:
 *
 * - Inside the scroller, the bar would scroll away with the content.
 * - Fixed to the viewport, it would stay put when the right rail opens and
 *   drift off the column it acts on.
 *
 * `h-12` is not decoration: it is the assistant trigger's height, and the two
 * share `bottom-4`, so the whole bottom edge of the app sits on one line. The
 * trigger is inset 16px from the right against the content gutter's 24px —
 * half a step outside it, because it is the one control on screen that belongs
 * to the app rather than to the page.
 *
 * Pass actions as siblings or an array, not wrapped in a fragment: the bar
 * rules between them, and a fragment arrives as a single child.
 *
 * ## A child that renders nothing still takes a slot
 *
 * `Children.toArray` counts an element whose render returns `null`, so passing
 * one leaves a gap that still earns a divider. Anything conditional must be
 * `null` *here*, at the call site — which is why `status` is a slot with its
 * own prop rather than something you hand in with the actions.
 */
export function PageActionBar({
  blocker,
  status,
  contentKey,
  children,
  className,
}: {
  /**
   * Why the primary action can't run yet, said in place. The bar is the only
   * affordance with room for this — a header button could only refuse.
   */
  blocker?: ReactNode
  /** Read-only context for the actions beside it. See `BarStatus`. */
  status?: BarStatus | null
  /**
   * Changes when the *set of actions* changes — not when their internal state
   * does. It is what the bar animates on: a value that also moved for a
   * spinner would restart the hand-off mid-flight.
   */
  contentKey?: string
  children: ReactNode
  className?: string
}) {
  const items = Children.toArray(children)
  if (items.length === 0) return null

  return (
    <div
      // `pointer-events-none` on the full-width track so it never eats a click
      // meant for the page underneath; the bar itself takes them back.
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-4 flex justify-center',
        className,
      )}
      style={{ zIndex: ZIndex.pageActionBar }}
    >
      <BarSurface
        blocker={blocker}
        status={status ?? null}
        contentKey={contentKey}
        items={items}
      />
    </div>
  )
}

type Phase = 'idle' | 'fading' | 'resizing'

/**
 * The bar's surface, and the two things it has to work out for itself: how
 * wide it should be, and how to get there.
 *
 * **The hand-off.** When the actions change, the old set fades out, the
 * surface travels to its new width, and only then does the new set appear.
 * Cross-fading instead would have two different sets of words legible on top
 * of each other at once, and re-flowing the buttons under the cursor while
 * they are still readable invites a click on whatever slides into place. The
 * empty middle is the point: it says the bar is answering, not that a button
 * moved.
 *
 * **The width.** `width` is animated in pixels, which means it has to be
 * measured. The inner row is `w-max`, so its `scrollWidth` is the width the
 * content *wants* regardless of what the surface is currently clipped to —
 * that is the number, and the surface transitions to it.
 */
function BarSurface({
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
  const innerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState<number | null>(null)
  const [compact, setCompact] = useState(false)
  const [measuring, setMeasuring] = useState(true)
  const [phase, setPhase] = useState<Phase>('idle')
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

  // Fade out, swap, then let the width transition run before revealing.
  useEffect(() => {
    if (contentKey === undefined || contentKey === shownKey) return
    setPhase('fading')
    const id = setTimeout(() => {
      setShownKey(contentKey)
      setPhase('resizing')
    }, FADE_MS)
    return () => clearTimeout(id)
  }, [contentKey, shownKey])

  useEffect(() => {
    if (phase !== 'resizing') return
    const id = setTimeout(() => setPhase('idle'), RESIZE_MS)
    return () => clearTimeout(id)
  }, [phase])

  // Anything that can change the content's natural width re-opens the
  // question of whether the long status still fits.
  useLayoutEffect(() => {
    setMeasuring(true)
  }, [shownKey, shown.status?.key])

  /**
   * Both passes are layout effects, so the browser never paints between them:
   * the long form is measured and, if it doesn't fit, replaced by the short one
   * before anything reaches the screen. A passive effect here would show the
   * overflowing form for a frame on every wording change.
   */
  useLayoutEffect(() => {
    if (!measuring) return
    const el = innerRef.current
    if (!el) return
    // Zero means the element has no layout — jsdom, or a detached tree. Not a
    // measurement, so it decides nothing.
    if (el.scrollWidth > 0) setCompact(el.scrollWidth > MAX_BAR_WIDTH)
    setMeasuring(false)
  }, [measuring])

  useLayoutEffect(() => {
    const el = innerRef.current
    if (!el || measuring) return
    if (el.scrollWidth > 0) setWidth(el.scrollWidth)
  }, [measuring, shownKey, compact, shown.status?.key])

  // Measured against the long form, always: the short one is narrower by
  // definition, so measuring *it* would report that the long one now fits and
  // flip the status back and forth forever.
  const statusNode = shown.status
    ? measuring || !compact
      ? shown.status.full
      : shown.status.compact
    : null

  return (
    <div
      className={cn(
        'pointer-events-auto overflow-hidden bg-primary shadow-lg',
        'transition-[width] duration-200 ease-out motion-reduce:transition-none',
      )}
      style={{ width: width ?? undefined }}
    >
      <div
        ref={innerRef}
        className={cn(
          'flex h-12 w-max items-center gap-2 px-4',
          'transition-opacity duration-100 motion-reduce:transition-none',
          phase === 'idle' ? 'opacity-100' : 'opacity-0',
        )}
      >
        {shown.blocker && (
          <>
            <span className="flex items-center gap-1.5 px-1 text-xs text-tertiary-foreground">
              <WarningCircleIcon className="size-4 shrink-0" />
              {shown.blocker}
            </span>
            <PageActionBarDivider />
          </>
        )}
        {statusNode && (
          <>
            {statusNode}
            <PageActionBarDivider />
          </>
        )}
        {shown.items.map((child, index) => (
          <Fragment key={index}>
            {index > 0 && <PageActionBarDivider />}
            {child}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

/** The bar's own rule between two controls. */
function PageActionBarDivider() {
  return <span className="h-6 w-px shrink-0 bg-border" aria-hidden />
}
