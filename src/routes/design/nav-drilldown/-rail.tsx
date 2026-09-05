import * as React from 'react'
import { CaretLeftIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { CampaignIcon } from '@/components/layout/CampaignIcon'
import { identityAbbr, identityColorVar } from '@/lib/identity'
import { cn } from '@/lib'
import {
  CAMPAIGNS,
  L0_PRIMARY,
  L0_SECONDARY,
  L1_SECTIONS,
  TODAY_MODULES,
  TODAY_SECTIONS,
  type Buildability,
  type HarnessCampaign,
  type RailItem,
} from './-fixtures'

/** Which rail is on screen. */
export type Variant =
  /** Today’s rail: every campaign listed, the active one expanded in place. */
  | 'today'
  /** A — the rail is replaced wholesale by the campaign’s own. */
  | 'drill'
  /** C — as A, but the workspace stays reachable as an icon strip. */
  | 'drill-tail'

export type RailState = {
  level: 0 | 1
  campaignId: string | null
  l0: string
  l1: string
}

// ── Row ─────────────────────────────────────────────────────────────────────

/**
 * A nav row, drawn on the app’s own `menu` button variant rather than on
 * `AppSidebarButtonMenu`.
 *
 * The real component takes a router `to` and renders a `Link`; every
 * destination in this harness is a state change in a component that has no
 * routes behind it, and half of them are rows we have established cannot be
 * built at all. Borrowing the variant keeps the type, the tracking, the hover
 * and the selected grey identical, which is the part that has to be honest.
 */
function Row({
  item,
  isActive,
  onClick,
  indent,
  compact,
}: {
  item: RailItem
  isActive: boolean
  onClick: () => void
  /** Today’s rail indents a campaign’s sections under it. */
  indent?: boolean
  /** One step down in height and type, as today’s sub-rows are. */
  compact?: boolean
}) {
  return (
    <Button
      variant="menu"
      size="excluded"
      active={isActive}
      onClick={onClick}
      className={cn(
        'group/row relative',
        compact &&
          'lg:h-8 text-xs hover:bg-secondary data-[active=true]:bg-secondary',
        indent && 'pl-10 lg:pl-3',
        isActive && 'text-sidebar-primary-foreground',
      )}
    >
      <span
        className="flex size-5 flex-none items-center justify-center"
        style={{ color: item.tone }}
      >
        <item.icon className={compact ? 'size-4' : 'size-5'} weight="regular" />
      </span>
      <div>
        <span className="block w-[148px] truncate text-left tracking-[0.02em]">
          {item.label}
        </span>
      </div>
      <BuildMark build={item.build} isActive={isActive} />
    </Button>
  )
}

/**
 * What it would take to build this row, on the row.
 *
 * `now` gets nothing: the baseline should be silent, or every row carries a
 * badge and the two that matter stop standing out. Mono because it is the
 * figure voice, and 9px because it must lose to the label at a glance and win
 * only when looked for.
 */
function BuildMark({
  build,
  isActive,
}: {
  build: Buildability
  isActive: boolean
}) {
  if (build === 'now') return null
  const isBlocked = build === 'blocked'
  return (
    <span
      className={cn(
        'absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm px-1 font-mono text-[9px] leading-4 tracking-wide',
        isBlocked
          ? 'bg-destructive/12 text-destructive'
          : isActive
            ? 'bg-quaternary text-tertiary-foreground'
            : 'bg-sidebar-secondary text-tertiary-foreground group-hover/row:bg-quaternary',
      )}
      title={isBlocked ? 'Blocked on the backend' : 'Front-end work only'}
    >
      {isBlocked ? 'BE' : 'FE'}
    </span>
  )
}

/** `font-mono`, as `AppSidebar`’s own section headings are. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-1.5 pt-5 pb-1 font-mono text-xs/4 font-medium uppercase text-sidebar-secondary-foreground lg:px-2.5">
      {children}
    </div>
  )
}

// ── The rail ────────────────────────────────────────────────────────────────

export function DrillRail({
  variant,
  durationMs,
  state,
  onState,
}: {
  variant: Variant
  /** Slowed down, the transition is the thing being judged rather than felt. */
  durationMs: number
  state: RailState
  onState: (next: RailState) => void
}) {
  const campaign = CAMPAIGNS.find((c) => c.id === state.campaignId) ?? null
  const drilled = variant !== 'today' && state.level === 1 && campaign !== null

  return (
    <div className="flex h-[620px] w-72 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-sidebar-primary text-sidebar-primary-foreground select-none">
      {variant === 'today' ? (
        <TodayLevel state={state} onState={onState} />
      ) : (
        // Both levels stay mounted: the outgoing one has to be on screen for
        // the length of the slide, and unmounting it is what turns a push into
        // a cut. `pointer-events-none` on the hidden one keeps a row that is
        // 8px off-stage from swallowing a click.
        <div className="relative flex-1 overflow-hidden">
          <Pane shown={!drilled} durationMs={durationMs} from="left">
            <WorkspaceLevel
              state={state}
              onState={onState}
              onDrill={(id) => onState({ ...state, level: 1, campaignId: id })}
            />
          </Pane>
          <Pane shown={drilled} durationMs={durationMs} from="right">
            {campaign && (
              <CampaignLevel
                campaign={campaign}
                variant={variant}
                drilled={drilled}
                durationMs={durationMs}
                state={state}
                onState={onState}
              />
            )}
          </Pane>
        </div>
      )}
    </div>
  )
}

/**
 * One level of the stack.
 *
 * The outgoing pane moves 32px, not its full width. A push where both panes
 * travel the same distance reads as a carousel — two peers sliding past each
 * other — and the whole claim of a drill-down is that one of these is *under*
 * the other. The small offset plus the fade is what says "still there, behind
 * this", which is also what makes the back row believable.
 */
function Pane({
  shown,
  durationMs,
  from,
  children,
}: {
  shown: boolean
  durationMs: number
  from: 'left' | 'right'
  children: React.ReactNode
}) {
  return (
    <div
      aria-hidden={!shown}
      // Motion is the subject here, so it cannot be a Tailwind duration class:
      // the harness sets it per render to replay the same push at a quarter
      // speed. `motion-reduce` drops it to nothing — a rail that swaps
      // instantly is a legitimate rendering of this design, and one the
      // orientation question has to survive.
      style={{ transitionDuration: `${durationMs}ms` }}
      className={cn(
        'absolute inset-0 flex flex-col transition-[transform,opacity] ease-out motion-reduce:transition-none',
        shown
          ? 'translate-x-0 opacity-100'
          : cn(
              'opacity-0 pointer-events-none',
              from === 'left' ? '-translate-x-8' : 'translate-x-full',
            ),
      )}
    >
      {children}
    </div>
  )
}

// ── Level 0 ─────────────────────────────────────────────────────────────────

function WorkspaceLevel({
  state,
  onState,
  onDrill,
}: {
  state: RailState
  onState: (next: RailState) => void
  onDrill: (campaignId: string) => void
}) {
  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4 lg:px-6">
      <SectionLabel>Workspace</SectionLabel>
      {L0_PRIMARY.map((item) => (
        <React.Fragment key={item.id}>
          <Row
            item={item}
            isActive={state.l0 === item.id}
            onClick={() => onState({ ...state, l0: item.id })}
          />
          {/* The entry point. Picking a campaign is the list screen’s job, but
              a rail with no way into level 1 cannot be tested, so the three sit
              under the row while it is the selected one. This is scaffolding —
              in the app the cards are on `/campaigns`. */}
          {item.id === 'campaigns' && state.l0 === 'campaigns' && (
            <div className="flex flex-col gap-1 pb-2">
              {CAMPAIGNS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onDrill(c.id)}
                  className="group/row flex h-8 w-full items-center gap-3 rounded-md px-1.5 text-left font-grotesk text-xs font-medium uppercase tracking-[0.02em] text-tertiary-foreground transition-colors hover:bg-secondary hover:text-sidebar-primary-foreground lg:px-3"
                >
                  <CampaignIcon
                    abbr={identityAbbr(c.name)}
                    color={identityColorVar(c.id)}
                    className="size-4 flex-none"
                  />
                  <span className="flex-1 truncate">{c.name}</span>
                  <CaretLeftIcon
                    weight="bold"
                    className="size-3 rotate-180 opacity-0 transition-opacity group-hover/row:opacity-100"
                  />
                </button>
              ))}
            </div>
          )}
        </React.Fragment>
      ))}

      {/* The rule is the demotion. Above it is where the work happens; below
          it is what the work is set up from and looked back on. */}
      <div className="mx-1.5 my-3 h-px shrink-0 bg-quaternary lg:mx-2.5" />

      {L0_SECONDARY.map((item) => (
        <Row
          key={item.id}
          item={item}
          isActive={state.l0 === item.id}
          onClick={() => onState({ ...state, l0: item.id })}
        />
      ))}
    </nav>
  )
}

// ── Level 1 ─────────────────────────────────────────────────────────────────

function CampaignLevel({
  campaign,
  variant,
  drilled,
  durationMs,
  state,
  onState,
}: {
  campaign: HarnessCampaign
  variant: Variant
  drilled: boolean
  durationMs: number
  state: RailState
  onState: (next: RailState) => void
}) {
  const color = identityColorVar(campaign.id)
  const pct = Math.round((campaign.made / campaign.goal) * 100)

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* The identity colour, as a rule down the level rather than a wash.
          It arrives after the pane has landed — a bar that travels with the
          slide is just part of the moving block, while one that draws itself
          afterwards is the level announcing what it belongs to. */}
      <span
        aria-hidden
        style={{
          background: color,
          transitionDuration: `${durationMs}ms`,
          transitionDelay: drilled
            ? `${Math.round(durationMs * 0.35)}ms`
            : '0ms',
          transform: drilled ? 'scaleY(1)' : 'scaleY(0)',
        }}
        className="absolute left-0 top-0 h-full w-[3px] origin-top transition-transform ease-out motion-reduce:transition-none"
      />

      {/* Back first, and as a row rather than a chevron on the title: it is
          the only control that undoes the whole level, and the thing people
          reach for when they do not recognise where they are. */}
      <button
        type="button"
        onClick={() => onState({ ...state, level: 0 })}
        className="group/row flex h-10 shrink-0 items-center gap-2 px-3 font-grotesk text-xs font-medium uppercase tracking-[0.02em] text-tertiary-foreground transition-colors hover:text-sidebar-primary-foreground lg:px-6"
      >
        <CaretLeftIcon weight="bold" className="size-3.5 flex-none" />
        <span>Workspace</span>
      </button>

      <div className="shrink-0 px-3 pb-4 lg:px-6">
        <div className="flex items-center gap-2.5">
          <CampaignIcon
            abbr={identityAbbr(campaign.name)}
            color={color}
            active
            className="size-5 flex-none"
          />
          <span className="truncate font-grotesk text-sm font-medium uppercase tracking-[0.02em]">
            {campaign.name}
          </span>
        </div>
        {/* The commitment, in the one place every section is read from. This
            is the argument for a campaign having a level at all: the number
            is true of the campaign and of nothing else in the app. */}
        <p className="mt-1.5 font-mono text-xs text-tertiary-foreground">
          {campaign.window} · {campaign.made} of {campaign.goal}
        </p>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-quaternary">
          <span
            className="block h-full rounded-full"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4 lg:px-6">
        {L1_SECTIONS.map((item) => (
          <Row
            key={item.id}
            item={item}
            isActive={state.l1 === item.id}
            onClick={() => onState({ ...state, l1: item.id })}
          />
        ))}
      </nav>

      {variant === 'drill-tail' && (
        <WorkspaceTail
          onPick={(id) => onState({ ...state, level: 0, l0: id })}
        />
      )}
    </div>
  )
}

/**
 * Level 0 collapsed to its glyphs, pinned to the bottom of level 1.
 *
 * This is the whole difference between the two drill variants, and it exists
 * to answer one objection: mid-campaign, the most common thing anyone does is
 * check a guardrail, and in a pure drill-down that is pop out, find Foundation,
 * drill back in. Forty pixels buys the lateral move back.
 *
 * It costs the claim that a level is a place — the tail is level 0 leaking
 * into level 1 — which is exactly the trade this harness is for.
 */
function WorkspaceTail({ onPick }: { onPick: (id: string) => void }) {
  const items = [...L0_PRIMARY, ...L0_SECONDARY]
  return (
    <div className="flex shrink-0 items-center gap-0.5 border-t border-quaternary px-2 py-2 lg:px-4">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          title={item.label}
          aria-label={item.label}
          onClick={() => onPick(item.id)}
          className="flex size-8 flex-none items-center justify-center rounded-md text-tertiary-foreground transition-colors hover:bg-sidebar-secondary hover:text-sidebar-primary-foreground"
        >
          <item.icon className="size-4" weight="regular" />
        </button>
      ))}
    </div>
  )
}

// ── The control ─────────────────────────────────────────────────────────────

/**
 * Today’s rail, unchanged, so the comparison is against the real thing rather
 * than against a description of it: every campaign listed, the active one
 * expanding into its six sections in place.
 */
function TodayLevel({
  state,
  onState,
}: {
  state: RailState
  onState: (next: RailState) => void
}) {
  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4 lg:px-6">
      <SectionLabel>Modules</SectionLabel>
      {TODAY_MODULES.map((item) => (
        <Row
          key={item.id}
          item={item}
          isActive={state.campaignId === null && state.l0 === item.id}
          onClick={() =>
            onState({ ...state, l0: item.id, campaignId: null, level: 0 })
          }
        />
      ))}

      <SectionLabel>Campaigns</SectionLabel>
      {CAMPAIGNS.map((campaign) => {
        const isActive = state.campaignId === campaign.id
        return (
          <React.Fragment key={campaign.id}>
            <Button
              variant="menu"
              size="excluded"
              active={isActive}
              onClick={() =>
                onState({ ...state, campaignId: campaign.id, l1: 'overview' })
              }
              className={cn(
                'group/row relative',
                isActive && 'text-sidebar-primary-foreground',
              )}
            >
              <CampaignIcon
                abbr={identityAbbr(campaign.name)}
                active={isActive}
                color={identityColorVar(campaign.id)}
                className="size-5 flex-none"
              />
              <div>
                <span className="block w-[148px] truncate text-left tracking-[0.02em]">
                  {campaign.name}
                </span>
              </div>
            </Button>
            {isActive && (
              <div className="flex w-full flex-col gap-1 border-b-2 border-quaternary pb-3">
                {TODAY_SECTIONS.map((item) => (
                  <Row
                    key={item.id}
                    item={item}
                    compact
                    indent
                    isActive={state.l1 === item.id}
                    onClick={() => onState({ ...state, l1: item.id })}
                  />
                ))}
              </div>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}
