import { useEffect, useState, type ReactNode } from 'react'
import { CheckIcon, CircleIcon } from '@phosphor-icons/react'
import { Logo } from '@/components/Logo'
import { ASSESS_STEPS, stepLabel } from '@/lib/postQuality.ts'
import { cn } from '@/lib'

/** How long one tick is given before the next may land. */
const REVEAL_MS = 260

/**
 * Paces the ticks so they land one at a time.
 *
 * The stream does not arrive evenly: `validateInput` and `buildContext` can
 * complete in the same breath, and a cached run (CON-92) jumps from the second
 * stage to the end. Applying a burst in one render is what made the list read
 * as redrawing rather than as progressing. So this trails the stream by up to
 * `REVEAL_MS` per outstanding tick and catches up.
 *
 * Nothing waits on it: the panel swaps to the result when the stream completes,
 * so at worst the last tick or two are still animating as the list is replaced.
 */
function useRevealed(count: number): number {
  // Seeded from the first `count` seen, so a panel mounted onto a run already
  // in flight shows its history rather than replaying it.
  const [revealed, setRevealed] = useState(count)

  useEffect(() => {
    // A new run resets `steps` to empty; drop back rather than trailing a
    // count that no longer exists.
    if (revealed > count) {
      setRevealed(count)
      return
    }
    if (revealed === count) return
    const timer = setTimeout(() => setRevealed((r) => r + 1), REVEAL_MS)
    return () => clearTimeout(timer)
  }, [count, revealed])

  return Math.min(revealed, count)
}

/**
 * A run in flight. The flow's stages are known up front, so this shows all of
 * them and ticks them off — an assessment takes long enough that knowing how
 * much is left beats a spinner.
 *
 * The list is not purely declarative: a cached run (CON-92) skips straight
 * from `buildContext` to the end, and the flow could gain a stage this file
 * doesn't know about. Both are handled by trusting the events over the list —
 * anything unrecognised is appended rather than dropped.
 */
export function AssessProgress({ steps }: { steps: string[] }) {
  const revealed = useRevealed(steps.length)
  const shown = steps.slice(0, revealed)

  const done = new Set(shown)
  const extra = shown.filter((step) => !ASSESS_STEPS.some((s) => s.step === step))
  const rows = [
    ...ASSESS_STEPS.map((s) => ({ key: s.step, label: s.label, done: done.has(s.step) })),
    ...extra.map((step) => ({ key: step, label: stepLabel(step), done: true })),
  ]

  // The flow runs its stages in order, so the first one still outstanding is
  // the one being worked on. A cached run leaves the stages it skipped
  // outstanding for the moment it has left to live, which points the marker at
  // a stage that will never tick — harmless, and cheaper than second-guessing
  // the server about which stages a given run intends to emit.
  const activeIndex = rows.findIndex((row) => !row.done)

  return (
    <div className="flex flex-col gap-3">
      {/* The heading is the first row of the same list, on the same icon
          column: the mark sits in the slot the ticks below it occupy, so all
          the labels line up on one edge. */}
      <p className="flex items-center gap-2 text-sm text-foreground">
        <Glyph>
          <Logo variant="mark" loading className="size-4 text-accent" />
        </Glyph>
        <span className="animate-pulse-opacity">Assessing this post…</span>
      </p>
      <ol className="flex flex-col gap-1.5">
        {rows.map((row, i) => {
          const active = i === activeIndex
          return (
            <li
              key={row.key}
              className={cn(
                'flex items-center gap-2 text-sm transition-colors duration-300',
                row.done ? 'text-secondary-foreground' : 'text-tertiary-foreground',
              )}
            >
              <Glyph>
                {row.done ? (
                  // Mounted fresh when the row ticks — which is what runs the
                  // animation, no state of its own required.
                  <CheckIcon
                    aria-hidden
                    weight="bold"
                    className="size-4 text-positive animate-step-tick"
                  />
                ) : active ? (
                  <span className="relative flex size-4 items-center justify-center">
                    {/* The halo overflows the 16px column, so it has to be
                        positioned out of flow or it would push the label. */}
                    <span
                      aria-hidden
                      className="absolute size-2 rounded-full bg-warning animate-step-ping"
                    />
                    <span aria-hidden className="relative size-2 rounded-full bg-warning" />
                  </span>
                ) : (
                  <CircleIcon aria-hidden weight="regular" className="size-4" />
                )}
              </Glyph>
              {active ? (
                // Tinted to body text: the pulsing dot beside it already says
                // which row this is, and an orange label as well would make one
                // line of a six-line list shout.
                <span className="animate-text-shimmer animate-text-shimmer-muted">
                  {row.label}
                </span>
              ) : (
                <span>{row.label}</span>
              )}
            </li>
          )
        })}
      </ol>
      <p className="text-xs text-tertiary-foreground">
        Scoring runs on a small model and usually takes under a minute. You can keep editing —
        the run reads the post as it was when you started it.
      </p>
    </div>
  )
}

/** The shared 16px icon column. Every label starts after it, tick or mark. */
function Glyph({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden className="flex size-4 shrink-0 items-center justify-center">
      {children}
    </span>
  )
}
