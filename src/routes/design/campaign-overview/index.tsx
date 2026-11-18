import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import {
  CampaignOverview,
  type OverviewHandlers,
} from '@/components/campaigns/overview/CampaignOverview'
import { overviewModel } from '@/lib/campaignOverview'
import { cn } from '@/lib/styles'
import {
  CAMPAIGN_ID,
  NO_EDGES,
  NOW,
  STAGES,
  harnessInput,
  type Edges,
  type HarnessStage,
} from './-fixtures'

/**
 * TEMPORARY — design harness for the campaign Overview. Lives on
 * `design/campaign-overview` and never on `develop`: it opens without a
 * session, which needs the exemption in `__root.tsx`.
 *
 * The real `overviewModel` and `CampaignOverview` over fixtures, in a frame
 * the size of the app's content column. The state is the address, so a
 * specimen can be linked: `?stage=closing&edges=failures,signedOut&rail=1`.
 */
type Search = { stage: HarnessStage; edges: string; rail: boolean }

export const Route = createFileRoute('/design/campaign-overview/')({
  validateSearch: (raw: Record<string, unknown>): Search => ({
    stage: STAGES.includes(raw.stage as HarnessStage)
      ? (raw.stage as HarnessStage)
      : 'running',
    edges: typeof raw.edges === 'string' ? raw.edges : '',
    rail: raw.rail === true || raw.rail === 1 || raw.rail === '1',
  }),
  component: OverviewHarness,
})

const EDGE_LABELS: Record<keyof Edges, string> = {
  noGoal: 'No goal',
  signedOut: 'Instagram signed out',
  failures: 'Failed posts',
  heavyProblems: 'Many problems',
  emptyWeek: 'Empty week',
  noAnalytics: 'No analytics',
}

const log =
  (what: string) =>
  (...args: unknown[]) =>
    console.info(`[overview harness] ${what}`, ...args)

const HANDLERS: OverviewHandlers = {
  ask: log('ask'),
  askAll: log('askAll'),
  ignore: log('ignore'),
  addPost: log('addPost'),
  generate: log('generate'),
}

function OverviewHarness() {
  const { stage, edges: edgeList, rail } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const on = new Set(edgeList.split(',').filter(Boolean))
  const edges = Object.fromEntries(
    Object.keys(NO_EDGES).map((k) => [k, on.has(k)]),
  ) as Edges
  const model = overviewModel(harnessInput(stage, edges))
  const set = (next: Partial<Search>) =>
    void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true })
  const toggle = (k: string) => {
    const nextOn = new Set(on)
    if (nextOn.has(k)) nextOn.delete(k)
    else nextOn.add(k)
    set({ edges: [...nextOn].join(',') })
  }

  return (
    <div className="flex h-svh flex-col bg-background">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border px-4 py-2 text-xs">
        <span className="font-semibold tracking-[0.06em] text-tertiary-foreground uppercase">
          Overview harness
        </span>
        <Group>
          {STAGES.map((s) => (
            <Chip
              key={s}
              active={s === stage}
              onClick={() => set({ stage: s })}
            >
              {s}
            </Chip>
          ))}
        </Group>
        <Group>
          {(Object.keys(EDGE_LABELS) as (keyof Edges)[]).map((k) => (
            <Chip key={k} active={on.has(k)} onClick={() => toggle(k)}>
              {EDGE_LABELS[k]}
            </Chip>
          ))}
        </Group>
        <Chip active={rail} onClick={() => set({ rail: !rail })}>
          Right rail
        </Chip>
        <span className="ml-auto text-tertiary-foreground">
          Today is{' '}
          {NOW[stage].toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          })}
        </span>
      </div>

      {/* The app's frame, roughly: the menu, the content column, the rail. */}
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-60 shrink-0 border-r border-border bg-sidebar-secondary lg:block" />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-14 shrink-0 items-center px-3 lg:px-6">
            <h1 className="font-display text-xl font-medium">
              {stage === 'new' ? 'Holiday gift guide' : 'Spring launch'}
            </h1>
          </div>
          <div className="min-h-0 flex-1 px-3 pt-4 lg:px-6">
            <CampaignOverview
              model={model}
              campaignId={CAMPAIGN_ID}
              handlers={HANDLERS}
              now={NOW[stage]}
            />
          </div>
        </div>
        {rail && (
          <div className="w-[380px] shrink-0 border-l border-border bg-primary" />
        )}
      </div>
    </div>
  )
}

function Group({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-1">{children}</div>
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-full border px-2.5 py-0.5',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'border-border text-secondary-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
