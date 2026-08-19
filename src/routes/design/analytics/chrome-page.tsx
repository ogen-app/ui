import { useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { AnalyticsSurface } from '@/components/analytics/AnalyticsSurface'
import type {
  AnalyticsData,
  AnalyticsScope,
  AnalyticsSurfaceState,
} from '@/components/analytics/types'
import { DEFAULT_PERIOD, PERIODS } from './-fixtures'

/**
 * Shared furniture for the analytics harnesses. Ignored by the router — the
 * plugin's `routeFileIgnorePattern` drops anything ending `page.tsx`.
 */

export function HarnessShell({
  title,
  lede,
  children,
}: {
  title: string
  lede: ReactNode
  children: ReactNode
}) {
  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-2">
          <p className="font-grotesk text-xs font-medium uppercase tracking-[0.08em] text-tertiary-foreground">
            Design reference
          </p>
          <h1 className="font-display text-[2rem] leading-12 font-medium tracking-tight">
            {title}
          </h1>
          <p className="max-w-2xl text-sm text-secondary-foreground">{lede}</p>
          {/*
            Surfaces first, then the widget benches behind them. There is no
            hub page above these: a harness earns its place by rendering
            something, and a page of prose about the other pages is the kind of
            thing that goes stale the first time one of them changes.
          */}
          <nav className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <HarnessLink to="/design/analytics/campaign">Campaign</HarnessLink>
            <HarnessLink to="/design/analytics/post">Post</HarnessLink>
            <HarnessLink to="/design/analytics/widgets" exact>
              Campaign widgets
            </HarnessLink>
            <HarnessLink to="/design/analytics/widgets/post">
              Post widgets
            </HarnessLink>
          </nav>
        </header>
        {children}
      </div>
    </div>
  )
}

function HarnessLink({
  to,
  exact = false,
  children,
}: {
  to: string
  /**
   * Whether a child route still counts as being here. Off by default so a
   * widget page keeps its bench lit in the nav; on for "Campaign widgets",
   * whose path is a prefix of "Post widgets" and would otherwise light both.
   */
  exact?: boolean
  children: ReactNode
}) {
  return (
    <Link
      to={to}
      className="text-tertiary-foreground underline underline-offset-2 hover:text-foreground"
      activeProps={{ className: 'text-foreground font-medium' }}
      activeOptions={{ exact }}
    >
      {children}
    </Link>
  )
}

export function Specimen({
  label,
  note,
  children,
}: {
  label: string
  note?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 border-b border-border pb-2">
        <h2 className="font-grotesk text-sm font-medium">{label}</h2>
        {note && (
          <p className="max-w-2xl text-xs text-tertiary-foreground">{note}</p>
        )}
      </div>
      {/* The app's own content column, so widths are honest. */}
      <div className="rounded-lg bg-background p-4">{children}</div>
    </section>
  )
}

/**
 * A surface with its controls wired, so the scope line — platforms and period
 * both — can actually be used. The fixed specimens pin one state each; this one
 * is for driving.
 */
export function LiveSurface({
  scope,
  data,
}: {
  scope: AnalyticsScope
  data: AnalyticsData
}) {
  const [period, setPeriod] = useState(DEFAULT_PERIOD)
  // Switching a platform off moves the control and the sentence under it; the
  // figures don't follow, because these are fixtures. That is the one thing
  // this harness cannot show, so don't read the totals while filtered.
  const [platforms, setPlatforms] = useState(() =>
    data.platforms.filter((p) => p.accounts > 0).map((p) => p.id),
  )

  return (
    <AnalyticsSurface
      scope={scope}
      state={settled(data)}
      selectedPlatforms={platforms}
      onPlatformsChange={setPlatforms}
      period={period}
      periods={PERIODS}
      onPeriodChange={setPeriod}
    />
  )
}

/** A surface pinned to one state, for reading rather than driving. */
export function FixedSurface({
  scope,
  state,
}: {
  scope: AnalyticsScope
  state: AnalyticsSurfaceState
}) {
  return (
    <AnalyticsSurface
      scope={scope}
      state={state}
      period={DEFAULT_PERIOD}
      periods={PERIODS}
      onPeriodChange={() => {}}
      selectedPlatforms={(state.data?.platforms ?? []).map((p) => p.id)}
      onPlatformsChange={() => {}}
    />
  )
}

/**
 * The parking bay.
 *
 * Everything below this heading was designed alongside the widgets above it and
 * is **not in scope** — no data path, no decision on whether it ships, and in
 * one case (Outcomes) no field on the API to fill it. It stays rendered rather
 * than deleted because the argument each card makes is the expensive part and
 * the code is cheap to keep compiling; what it must never do is sit on the real
 * surface, where a card is a promise that its number is maintained.
 *
 * Framed rather than styled differently: dimming or greying these would make
 * them unreviewable, and the reason they are here is so someone can still
 * review them.
 */
export function OutOfScope({
  note,
  children,
}: {
  note: ReactNode
  children: ReactNode
}) {
  return (
    <section className="mt-6 flex flex-col gap-6 rounded-lg border border-dashed border-border p-5">
      <header className="flex flex-col gap-1">
        <h2 className="font-display text-2xl font-medium leading-8 tracking-tight">
          Not in scope
        </h2>
        <p className="max-w-2xl text-sm text-secondary-foreground">{note}</p>
      </header>
      {children}
    </section>
  )
}

export function settled(data: AnalyticsData): AnalyticsSurfaceState {
  return { data, isPending: false, isError: false, isUnavailable: false, isCold: false }
}

export function cold(data: AnalyticsData): AnalyticsSurfaceState {
  return { data, isPending: false, isError: false, isUnavailable: false, isCold: true }
}

export const LOADING: AnalyticsSurfaceState = {
  isPending: true,
  isError: false,
  isUnavailable: false,
  isCold: false,
}

export const FAILED: AnalyticsSurfaceState = {
  isPending: false,
  isError: true,
  isUnavailable: false,
  isCold: false,
}

export const NO_ANALYTICS: AnalyticsSurfaceState = {
  isPending: false,
  isError: false,
  isUnavailable: true,
  isCold: false,
}

export const CAMPAIGN_SCOPE: AnalyticsScope = {
  kind: 'campaign',
  label: 'Spring implant campaign',
  campaignId: 'design-harness',
  evergreen: false,
}
