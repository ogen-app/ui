import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { toast, useToastStore, type ToastVariant } from '@/stores/toastStore'

/** One line per design row, in the order the design sheet lists them. */
const ROWS: Array<{ variant: ToastVariant; label: string; title: string }> = [
  { variant: 'info', label: 'INFO', title: 'Live data updates are temporarily paused' },
  { variant: 'success', label: 'SUCCESS', title: 'The holding has been added to your portfolio' },
  { variant: 'warning', label: 'DANGER', title: 'The changes were not saved' },
  { variant: 'error', label: 'ERROR', title: "We couldn't save your changes" },
]

/** Effectively "never" — for inspecting the deck instead of watching it expire. */
const HELD = 600_000

export function ToastsDesignHarness() {
  const [hold, setHold] = useState(false)
  const timers = useRef<number[]>([])

  // Read through a ref so a staggered run started before the toggle flipped
  // still uses the setting that was live when each toast fires.
  const holdRef = useRef(hold)
  holdRef.current = hold
  const opts = () => (holdRef.current ? { duration: HELD } : undefined)

  const clear = () => {
    for (const id of timers.current) window.clearTimeout(id)
    timers.current = []
    for (const t of useToastStore.getState().toasts) toast.dismiss(t.id)
  }

  /** Fire `rows` one at a time, `gap` ms apart, so the deck forms visibly. */
  const stagger = (rows: typeof ROWS, gap: number) => {
    rows.forEach((row, i) => {
      timers.current.push(
        window.setTimeout(() => toast[row.variant](row.title, opts()), i * gap),
      )
    })
  }

  useEffect(() => stagger(ROWS.slice(0, 2), 700), [])
  useEffect(() => clear, [])

  return (
    <div className="min-h-screen bg-background p-10 pt-40">
      <h1 className="mb-2 font-mono text-sm font-bold uppercase tracking-widest">Toast</h1>
      <p className="mb-6 max-w-prose text-sm text-tertiary-foreground">
        Fixtures only — nothing here calls the API or changes any data.
      </p>

      <label className="mb-8 flex w-fit items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={hold}
          onChange={(e) => setHold(e.target.checked)}
          className="size-4"
        />
        Hold them open (off = real auto-dismiss timers, 5–8s by variant)
      </label>

      <div className="flex flex-col items-start gap-3">
        {ROWS.map((row) => (
          <div key={row.variant} className="flex items-center gap-4">
            <span className="w-24 font-mono text-xs uppercase tracking-widest text-tertiary-foreground">
              {row.label}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast[row.variant](row.title, opts())}
            >
              Fire one
            </Button>
          </div>
        ))}

        <h2 className="mt-8 font-mono text-xs font-bold uppercase tracking-widest">
          The deck
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button size="sm" onClick={() => stagger(ROWS.slice(0, 2), 700)}>
            Two, 700ms apart
          </Button>
          <Button variant="outline" size="sm" onClick={() => stagger(ROWS, 900)}>
            Four, 900ms apart
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              for (const row of ROWS) toast[row.variant](row.title, opts())
            }}
          >
            Four at once
          </Button>
          <Button variant="outline" size="sm" onClick={clear}>
            Clear
          </Button>
        </div>

        <h2 className="mt-8 font-mono text-xs font-bold uppercase tracking-widest">
          Height variance
        </h2>
        <p className="max-w-prose text-sm text-tertiary-foreground">
          Cards are not a uniform height, so the card behind can show below the
          front one as well as above it.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              toast.error('Unable to schedule', {
                description: 'The publish window has already passed.',
                ...opts(),
              })
            }
          >
            With a description
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              toast.warning(
                'This campaign targets six platforms and three of them have no connected account, so the post cannot be scheduled yet',
                opts(),
              )
            }
          >
            Long title (wraps)
          </Button>
        </div>
      </div>
    </div>
  )
}
