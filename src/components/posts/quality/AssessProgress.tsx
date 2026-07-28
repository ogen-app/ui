import { CheckIcon, CircleIcon } from '@phosphor-icons/react'
import { ASSESS_STEPS, stepLabel } from '@/lib/postQuality.ts'
import { cn } from '@/lib'

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
  const done = new Set(steps)
  const extra = steps.filter((step) => !ASSESS_STEPS.some((s) => s.step === step))
  const rows = [
    ...ASSESS_STEPS.map((s) => ({ key: s.step, label: s.label, done: done.has(s.step) })),
    ...extra.map((step) => ({ key: step, label: stepLabel(step), done: true })),
  ]

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-secondary-foreground">Assessing this post…</p>
      <ol className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <li
            key={row.key}
            className={cn(
              'flex items-center gap-2 text-sm',
              row.done ? 'text-secondary-foreground' : 'text-tertiary-foreground',
            )}
          >
            {row.done ? (
              <CheckIcon aria-hidden weight="bold" className="size-4 shrink-0 text-positive" />
            ) : (
              <CircleIcon aria-hidden weight="regular" className="size-4 shrink-0" />
            )}
            <span>{row.label}</span>
          </li>
        ))}
      </ol>
      <p className="text-xs text-tertiary-foreground">
        Scoring runs on a small model and usually takes under a minute. You can keep editing —
        the run reads the post as it was when you started it.
      </p>
    </div>
  )
}
