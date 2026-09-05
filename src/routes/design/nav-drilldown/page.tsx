import * as React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib'
import { DrillRail, type RailState, type Variant } from './-rail'
import {
  L0_PRIMARY,
  L0_SECONDARY,
  L1_SECTIONS,
  type RailItem,
} from './-fixtures'

/**
 * Design harness — the campaign drill-down.
 *
 * The question is not what the two levels contain; ASCII settled that. It is
 * whether the *push between them* reads as going deeper into the thing you
 * were already looking at, or as the application swapping itself out. That
 * only fails in motion, which is why the three rails below are live, run at a
 * speed you can set, and sit next to each other rather than in three tabs.
 *
 * Delete `routes/design/` and the `/design` exemption in `__root.tsx` when the
 * question is answered.
 */

const VARIANTS: { id: Variant; title: string; blurb: string }[] = [
  {
    id: 'today',
    title: 'Today',
    blurb:
      'Every campaign listed, the active one expanded in place. Three campaigns × six sections = eighteen latent rows, and two rows reading “Analytics” told apart only by indentation.',
  },
  {
    id: 'drill',
    title: 'A · Drill-down',
    blurb:
      'The campaign replaces the rail. Never two of the same word on screen. Costs the lateral move: Foundation is now pop out, find, drill back in.',
  },
  {
    id: 'drill-tail',
    title: 'C · Drill-down + tail',
    blurb:
      'As A, with level 0 kept as an icon strip along the bottom. Buys back the lateral move for 40px, at the cost of a level that is no longer purely a place.',
  },
]

const SPEEDS = [
  { label: '1×', ms: 240 },
  { label: '½×', ms: 480 },
  { label: '¼×', ms: 960 },
]

const INITIAL: RailState = {
  level: 0,
  campaignId: null,
  l0: 'campaigns',
  l1: 'overview',
}

export function NavDrilldownHarness() {
  const [durationMs, setDurationMs] = React.useState(240)
  const [states, setStates] = React.useState<Record<Variant, RailState>>({
    today: INITIAL,
    drill: INITIAL,
    'drill-tail': INITIAL,
  })

  const setState = (variant: Variant) => (next: RailState) =>
    setStates((prev) => ({ ...prev, [variant]: next }))

  /**
   * Drives all three at once, from the top. Judging a push means watching it
   * more than once, and re-clicking three rails by hand desynchronises them —
   * which is precisely when you start comparing the wrong two frames.
   */
  const replay = () => {
    setStates({ today: INITIAL, drill: INITIAL, 'drill-tail': INITIAL })
    window.setTimeout(() => {
      const drilled: RailState = {
        level: 1,
        campaignId: '8f14e45f-ceea-467a-9c1d-1a2b3c4d5e6f',
        l0: 'campaigns',
        l1: 'overview',
      }
      setStates({ today: drilled, drill: drilled, 'drill-tail': drilled })
    }, 400)
  }

  return (
    <div className="min-h-screen bg-primary px-8 py-10 text-primary-foreground">
      <header className="mx-auto max-w-[1100px]">
        <p className="font-mono text-xs uppercase tracking-wide text-tertiary-foreground">
          Design harness · not a product route
        </p>
        <h1 className="mt-2 font-grotesk text-2xl font-medium">
          Campaign drill-down
        </h1>
        <p className="mt-3 max-w-[68ch] text-sm/6 text-secondary-foreground">
          The system has two things called Campaigns — the collection, which is
          a module and belongs in a rail, and the instance, which is an object
          and has no rail slot. Today’s sidebar nests one inside the other, so
          the instance imports the module vocabulary and the rail becomes a
          replica of itself. A drill-down separates them: the module stays, the
          instance replaces the level.
        </p>
        <p className="mt-3 max-w-[68ch] text-sm/6 text-secondary-foreground">
          Open <strong className="font-medium">Campaigns</strong>, pick a
          campaign, then use the back row. What is being judged is whether you
          know where you are on the way in and on the way out — not whether the
          rows are the right rows.
        </p>
      </header>

      <div className="mx-auto mt-8 flex max-w-[1100px] flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase text-tertiary-foreground">
            Speed
          </span>
          {SPEEDS.map((speed) => (
            <Button
              key={speed.ms}
              variant={durationMs === speed.ms ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDurationMs(speed.ms)}
            >
              {speed.label}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={replay}>
          Replay all three
        </Button>
        <p className="font-mono text-xs text-tertiary-foreground">
          prefers-reduced-motion drops the push entirely — the swap has to
          survive that too.
        </p>
      </div>

      <div className="mx-auto mt-8 flex max-w-[1100px] flex-wrap gap-6">
        {VARIANTS.map((variant) => (
          <section key={variant.id} className="flex w-72 flex-col gap-3">
            <div className="min-h-[132px]">
              <h2 className="font-grotesk text-sm font-medium uppercase tracking-[0.02em]">
                {variant.title}
              </h2>
              <p className="mt-1.5 text-xs/5 text-tertiary-foreground">
                {variant.blurb}
              </p>
            </div>
            <DrillRail
              variant={variant.id}
              durationMs={durationMs}
              state={states[variant.id]}
              onState={setState(variant.id)}
            />
            <p className="font-mono text-[11px] text-tertiary-foreground">
              {states[variant.id].level === 1 && states[variant.id].campaignId
                ? `level 1 · ${states[variant.id].l1}`
                : `level 0 · ${states[variant.id].l0}`}
            </p>
          </section>
        ))}
      </div>

      <Legend />
    </div>
  )
}

/**
 * What each row would cost, listed out.
 *
 * A rail drawn without this reads as a plan; half these destinations have no
 * endpoint behind them, and the marks on the rows are only useful if the
 * reason is somewhere.
 */
function Legend() {
  const rows: { scope: string; items: RailItem[] }[] = [
    { scope: 'Workspace', items: [...L0_PRIMARY, ...L0_SECONDARY] },
    { scope: 'Campaign', items: L1_SECTIONS },
  ]

  return (
    <section className="mx-auto mt-14 max-w-[1100px]">
      <h2 className="font-grotesk text-sm font-medium uppercase tracking-[0.02em]">
        What each row costs
      </h2>
      <p className="mt-1.5 max-w-[68ch] text-xs/5 text-tertiary-foreground">
        Unmarked rows ship today. <Chip kind="fe" /> is front-end work only — a
        move, a merge or a rename of things that already exist.{' '}
        <Chip kind="be" /> has no model, no column and no endpoint.
      </p>

      <div className="mt-6 flex flex-col gap-8">
        {rows.map(({ scope, items }) => (
          <div key={scope}>
            <h3 className="font-mono text-xs uppercase text-tertiary-foreground">
              {scope}
            </h3>
            <dl className="mt-3 flex flex-col gap-2.5">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <dt className="flex w-40 flex-none items-start gap-2">
                    <item.icon
                      className="mt-0.5 size-4 flex-none"
                      style={{ color: item.tone }}
                      weight="regular"
                    />
                    <span className="font-grotesk text-xs font-medium uppercase tracking-[0.02em]">
                      {item.label}
                    </span>
                    {item.build !== 'now' && (
                      <Chip kind={item.build === 'blocked' ? 'be' : 'fe'} />
                    )}
                  </dt>
                  <dd className="max-w-[64ch] text-xs/5 text-tertiary-foreground">
                    {item.note ?? '—'}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  )
}

function Chip({ kind }: { kind: 'fe' | 'be' }) {
  return (
    <span
      className={cn(
        'inline-block rounded-sm px-1 align-middle font-mono text-[9px] leading-4 tracking-wide',
        kind === 'be'
          ? 'bg-destructive/12 text-destructive'
          : 'bg-tertiary text-tertiary-foreground',
      )}
    >
      {kind === 'be' ? 'BE' : 'FE'}
    </span>
  )
}
