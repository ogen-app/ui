import * as React from 'react'
import {
  CaretDoubleLeftIcon,
  CaretLeftIcon,
  DotsThreeIcon,
  GearSixIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CampaignIcon } from '@/components/layout/CampaignIcon'
import { WorkspaceMark } from '@/components/layout/WorkspaceMark'
import { Logo } from '@/components/Logo'
import { identityAbbr, identityColorVar } from '@/lib/identity'
import { cn } from '@/lib'
import {
  CAMPAIGNS,
  L0_PRIMARY,
  L0_SECONDARY,
  L1_SECTIONS,
  TODAY_MODULES,
  TODAY_SECTIONS,
  USER,
  WORKSPACE,
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
  /** C — as A, plus a way back out to a workspace destination in one move. */
  | 'drill-tail'

export type RailState = {
  level: 0 | 1
  campaignId: string | null
  l0: string
  l1: string
}

const WORKSPACE_ITEMS = [...L0_PRIMARY, ...L0_SECONDARY]

// ── Rows ────────────────────────────────────────────────────────────────────

/**
 * A nav row, drawn on the app’s own `menu` button variant rather than on
 * `AppSidebarButtonMenu`.
 *
 * The real component takes a router `to` and renders a `Link`; every
 * destination here is a state change in a component with no routes behind it,
 * and half of them are rows we have established cannot be built at all.
 * Borrowing the variant keeps the type, the tracking, the hover and the
 * selected grey identical, which is the part that has to be honest.
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
 * A campaign, drawn exactly as today’s rail draws one — same row height, same
 * type, same 20px mark, same selected grey.
 *
 * It was briefly a smaller, dimmer thing, on the theory that a list you pass
 * through on the way somewhere should recede. That was wrong twice over: the
 * campaign rows are the most-clicked thing in the rail, and a second row
 * treatment is one more vocabulary to learn in a design whose entire argument
 * is that there is already one too many.
 */
function CampaignRow({
  campaign,
  isActive,
  onClick,
}: {
  campaign: HarnessCampaign
  isActive: boolean
  onClick: () => void
}) {
  return (
    <Button
      variant="menu"
      size="excluded"
      active={isActive}
      onClick={onClick}
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
  )
}

/**
 * What it would take to build this row, on the row.
 *
 * `now` gets nothing: the baseline should be silent, or every row carries a
 * badge and the two that matter stop standing out.
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
          ? 'bg-warning/15 text-warning'
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
  /** Slowed down, the transition is judged rather than felt. */
  durationMs: number
  state: RailState
  onState: (next: RailState) => void
}) {
  const campaign = CAMPAIGNS.find((c) => c.id === state.campaignId) ?? null
  const drilled = variant !== 'today' && state.level === 1 && campaign !== null

  return (
    <div className="flex h-[680px] w-72 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-sidebar-primary text-sidebar-primary-foreground select-none">
      <Header
        campaign={drilled ? campaign : null}
        onBack={() => onState({ ...state, level: 0 })}
      />

      {variant === 'today' ? (
        <TodayLevel state={state} onState={onState} />
      ) : (
        // Both levels stay mounted: the outgoing one has to be on screen for
        // the length of the slide, and unmounting it is what turns a push into
        // a cut. `pointer-events-none` on the hidden one stops a row that is
        // 8px off-stage from swallowing a click.
        <div className="relative flex-1 overflow-hidden">
          <Pane shown={!drilled} durationMs={durationMs} from="left">
            <WorkspaceLevel
              state={state}
              onState={onState}
              onDrill={(id) =>
                onState({ ...state, level: 1, campaignId: id, l1: 'overview' })
              }
            />
          </Pane>
          <Pane shown={drilled} durationMs={durationMs} from="right">
            {campaign && (
              <CampaignLevel
                campaign={campaign}
                state={state}
                onState={onState}
              />
            )}
          </Pane>
        </div>
      )}

      <Footer
        variant={variant}
        drilled={drilled}
        onPick={(id) => onState({ ...state, level: 0, l0: id })}
      />
    </div>
  )
}

/**
 * The rail’s top slot, above the nav and outside the slide.
 *
 * Back lives here rather than as the first row of level 1, and that is the
 * whole of its argument: a row inside the nav is one destination among the
 * sections, sitting where a section would be and scrolling with them. The way
 * out of a level is not a place in it. Up here it is chrome — always in the
 * same spot, never in the list.
 *
 * The mark beside it is the campaign’s, in the slot the product logo holds at
 * level 0. Swapping it is what says the rail now belongs to something: the
 * logo is the one element that never changes, so changing it is the loudest
 * available way to say the scope did.
 */
function Header({
  campaign,
  onBack,
}: {
  campaign: HarnessCampaign | null
  onBack: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-1 p-3 lg:p-6">
      <div className="flex min-w-0 items-center gap-1">
        {campaign && (
          <Button
            variant="ghost"
            size="smIcon"
            onClick={onBack}
            aria-label="Back to workspace"
            className="-ml-1.5 flex-none text-tertiary-foreground hover:text-sidebar-primary-foreground"
          >
            <CaretLeftIcon weight="bold" className="size-4" />
          </Button>
        )}
        {campaign ? (
          <CampaignIcon
            abbr={identityAbbr(campaign.name)}
            color={identityColorVar(campaign.id)}
            active
            className="size-10 flex-none"
          />
        ) : (
          <Logo className="size-10 flex-none" />
        )}
      </div>
      {/* Present because the real header has it and this rail is meant to be
          read against that one. Inert: the harness has no collapsed state, and
          a control that half-works teaches the wrong thing about the design. */}
      <Button
        variant="ghost"
        size="xsIcon"
        disabled
        aria-hidden
        tabIndex={-1}
        className="flex-none opacity-40"
      >
        <CaretDoubleLeftIcon className="size-3 text-quaternary-foreground" />
      </Button>
    </div>
  )
}

/**
 * One level of the stack.
 *
 * The outgoing pane moves 32px, not its full width. A push where both panes
 * travel the same distance reads as a carousel — two peers sliding past each
 * other — and the claim of a drill-down is that one of these is *under* the
 * other. The small offset plus the fade is what says "still there, behind
 * this", which is also what makes the back control believable.
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
      // Motion is the subject, so it cannot be a Tailwind duration class: the
      // harness sets it per render to replay the same push at a quarter speed.
      // `motion-reduce` drops it to nothing — a rail that swaps instantly is a
      // legitimate rendering of this design, and one the orientation question
      // has to survive.
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
              under the row while it is the selected one. Scaffolding — in the
              app the cards are on `/campaigns`. */}
          {item.id === 'campaigns' && state.l0 === 'campaigns' && (
            <div className="flex w-full flex-col gap-1 pb-2">
              {CAMPAIGNS.map((c) => (
                <CampaignRow
                  key={c.id}
                  campaign={c}
                  isActive={false}
                  onClick={() => onDrill(c.id)}
                />
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
  state,
  onState,
}: {
  campaign: HarnessCampaign
  state: RailState
  onState: (next: RailState) => void
}) {
  const color = identityColorVar(campaign.id)
  const pct = Math.round((campaign.made / campaign.goal) * 100)

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* The identity colour as a rule down the level. Static: it belongs to
          the level the way the level’s rows do, and a bar that draws itself on
          arrival turns a property of the place into an event that happened —
          which is one more thing moving during the only moment the user is
          trying to work out where they landed. */}
      <span
        aria-hidden
        style={{ background: color }}
        className="absolute left-0 top-0 h-full w-[3px]"
      />

      <div className="shrink-0 px-3 pb-4 lg:px-6">
        <span className="block truncate font-grotesk text-sm font-medium uppercase tracking-[0.02em]">
          {campaign.name}
        </span>
        {/* The commitment, in the one place every section is read from. This
            is the argument for a campaign having a level at all: the number is
            true of the campaign and of nothing else in the app. */}
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
    </div>
  )
}

// ── Footer ──────────────────────────────────────────────────────────────────

/**
 * Settings, then who and where you are — the footer as the app has it.
 *
 * At level 1 in the tail variant the identity block is replaced by a menu of
 * the workspace destinations. That swap is the whole of variant C, and it is
 * deliberately a replacement rather than an addition: an eight-glyph strip was
 * tried here first and it read as a second nav stapled under the first, which
 * is exactly the doubling the drill-down exists to remove. One control in a
 * slot that already holds one is the version that costs nothing new.
 *
 * What it costs instead is the account menu, which at level 1 has nowhere to
 * live. That is the open question this variant is asking.
 */
function Footer({
  variant,
  drilled,
  onPick,
}: {
  variant: Variant
  drilled: boolean
  onPick: (id: string) => void
}) {
  const showWorkspaceMenu = variant === 'drill-tail' && drilled

  return (
    <div className="flex shrink-0 flex-col gap-3 p-3 lg:gap-6 lg:p-6">
      <Button
        variant="menu"
        size="excluded"
        active={false}
        className="group/row relative"
      >
        <GearSixIcon weight="regular" className="size-5 flex-none" />
        <div>
          {/* Wider than the nav rows above: those reserve the right edge for
              an FE/BE chip, and this row has none to make room for. Same rule
              the real sidebar follows for a row with no count. */}
          <span className="block w-[180px] truncate text-left tracking-[0.02em]">
            Workspace settings
          </span>
        </div>
      </Button>

      {showWorkspaceMenu ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div
              role="button"
              tabIndex={0}
              aria-label="Go to a workspace destination"
              className="flex w-full cursor-pointer items-center gap-6 overflow-hidden select-none"
            >
              <span className="flex size-10 flex-none items-center justify-center rounded-md bg-sidebar-secondary text-tertiary-foreground">
                <DotsThreeIcon weight="bold" className="size-5" />
              </span>
              <div className="flex min-w-0 flex-col items-start">
                <p className="w-full truncate text-left text-sm">Workspace</p>
                <p className="w-full truncate text-left text-xs text-tertiary-foreground">
                  {WORKSPACE.name}
                </p>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64 p-2 shadow-md"
            side="right"
            align="end"
            sideOffset={8}
          >
            {WORKSPACE_ITEMS.map((item) => (
              <DropdownMenuItem
                key={item.id}
                size="lg"
                className="px-2"
                onSelect={() => onPick(item.id)}
              >
                <item.icon weight="regular" />
                <span className="flex-1">{item.label}</span>
                {item.build !== 'now' && (
                  <span className="font-mono text-[9px] text-tertiary-foreground">
                    {item.build === 'blocked' ? 'BE' : 'FE'}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex w-full items-center gap-6 overflow-hidden">
          <WorkspaceMark
            id={WORKSPACE.id}
            name={WORKSPACE.name}
            className="size-10 text-sm"
          />
          <div className="flex min-w-0 flex-col items-start">
            <p className="w-full truncate text-left text-sm">{USER.name}</p>
            <p className="w-full truncate text-left text-xs text-tertiary-foreground">
              {WORKSPACE.name}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── The control ─────────────────────────────────────────────────────────────

/**
 * Today’s rail, unchanged, so the comparison is against the real thing rather
 * than a description of it: every campaign listed, the active one expanding
 * into its six sections in place.
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
            <CampaignRow
              campaign={campaign}
              isActive={isActive}
              onClick={() =>
                onState({ ...state, campaignId: campaign.id, l1: 'overview' })
              }
            />
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
