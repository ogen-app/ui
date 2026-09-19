import type { ReactNode } from 'react'
import { cn } from '@/lib'

/**
 * One level of the rail, sliding.
 *
 * **The outgoing pane moves 32px, not its full width.** A push where both
 * panes travel the same distance reads as a carousel — two peers going past
 * each other — and the whole claim of a drill-down is that one of these is
 * *under* the other. The small offset plus the fade is what says "still there,
 * behind this", which is also what makes the way back believable before you
 * have found the control for it.
 *
 * Both panes stay mounted through the move: the outgoing one has to be on
 * screen for the length of the slide, and unmounting it is exactly what turns
 * a push into a cut. `pointer-events-none` on the hidden one stops a row that
 * is 32px off-stage from swallowing a click meant for the level in front.
 *
 * `motion-reduce` drops the movement entirely. A rail that swaps instantly is
 * a legitimate rendering of this design — the level still changes, the header
 * still changes with it — and the orientation has to survive without the
 * motion, not depend on it.
 */
export function NavPane({
  shown,
  from,
  children,
}: {
  shown: boolean
  from: 'left' | 'right'
  children: ReactNode
}) {
  return (
    <div
      aria-hidden={!shown}
      className={cn(
        'absolute inset-0 flex flex-col transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none',
        shown
          ? 'translate-x-0 opacity-100'
          : cn(
              'pointer-events-none opacity-0',
              from === 'left' ? '-translate-x-8' : 'translate-x-full',
            ),
      )}
    >
      {children}
    </div>
  )
}
