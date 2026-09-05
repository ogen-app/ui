import {
  CalendarDotsIcon,
  ChartLineUpIcon,
  GearSixIcon,
  LightbulbIcon,
  NotepadIcon,
  PaletteIcon,
  PulseIcon,
  ScanIcon,
  SidebarIcon,
  ToolboxIcon,
  TrayIcon,
  type Icon,
} from '@phosphor-icons/react'

/**
 * Fixtures for the nav drill-down harness. Nothing here is wired to the API —
 * the question this harness asks is about the *transition*, and a rail that
 * has to wait on `useCampaigns` cannot be replayed at quarter speed.
 *
 * Labels are English strings rather than catalogue keys on purpose: a harness
 * that gets deleted must not leave entries behind in `en.json` for someone to
 * find later and wonder about.
 */

/**
 * What each row would cost to build, as established by the nav gap analysis.
 *
 * The harness draws this, because the whole point of arguing about a rail is
 * to know which of its rows you could ship on Monday. A rail that looks
 * finished while half its destinations have no endpoint behind them is the
 * failure this marking exists to prevent.
 */
export type Buildability =
  /** Ships today — the screen exists, or the endpoint does. */
  | 'now'
  /** Front-end work only: a move, a merge or a rename of things that exist. */
  | 'fe'
  /** No model, no column, no endpoint. Cannot be built honestly. */
  | 'blocked'

export type RailItem = {
  id: string
  label: string
  icon: Icon
  build: Buildability
  /** Why it is blocked or what the FE work is — shown in the harness legend. */
  note?: string
  /** Permanent glyph colour, as `lib/campaignSections` does it. */
  tone?: string
}

// ── Level 0: the workspace ──────────────────────────────────────────────────

/** Above the rule: the places you go to do the work. */
export const L0_PRIMARY: RailItem[] = [
  {
    id: 'inbox',
    label: 'Inbox',
    icon: TrayIcon,
    build: 'fe',
    note: 'Replaces the / → /campaigns redirect. Folds in the existing TasksBoard, and inherits every caveat in the `tasks` flag (one KV row, client-side reconciliation, assignment notifies nobody).',
  },
  {
    id: 'ideas',
    label: 'Ideas',
    icon: LightbulbIcon,
    build: 'blocked',
    note: 'No model, no table, no endpoint, no posts.idea_id, no idea↔campaign M2M. Generation emits DraftPost, not ideas.',
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    icon: ToolboxIcon,
    build: 'now',
    note: 'Exists. This is the row that drills.',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: CalendarDotsIcon,
    build: 'fe',
    note: 'GET /api/posts is already tenant-wide. The work is that all seven calendar components and every hook in usePosts.ts take a campaignId.',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: ChartLineUpIcon,
    build: 'now',
    note: 'Shipped in 1bb1157. The gap is the axes (by pillar, by idea), not the screen.',
  },
]

/** Below the rule: the places you go to set the work up, or to look back. */
export const L0_SECONDARY: RailItem[] = [
  {
    id: 'foundation',
    label: 'Foundation',
    icon: PaletteIcon,
    build: 'fe',
    note: 'Rename of Brand, Look + Templates merged, Content Bank surfaced as Sources. Positioning, Pillars and Facts-as-a-ledger are blocked — BrandGuardrails.Facts is a flat StringSlice with no source and no date.',
  },
  {
    id: 'activity',
    label: 'Activity',
    icon: PulseIcon,
    build: 'blocked',
    note: 'CON-224. activity_event exists as a model but has no HTTP surface; today’s feed is derived from batched campaign summaries, so entries vanish when the post behind them changes.',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: GearSixIcon,
    build: 'now',
    note: 'Already in the footer today.',
  },
]

// ── Level 1: inside one campaign ────────────────────────────────────────────

/**
 * The drilled rail. Four rows now, six when the backend catches up.
 *
 * Settings is absent by design rather than by omission: walk the campaign’s
 * columns and the fields Settings would hold are the campaign itself —
 * thesis, narrowing, window, quantity, arc — which is what Strategy is. The
 * residue (rename, archive, budget, tags) is a header menu, not a section.
 */
export const L1_SECTIONS: RailItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: SidebarIcon,
    build: 'now',
    tone: 'var(--nav-overview)',
    note: 'The only question that exists solely inside a campaign: am I going to make what I committed to? estimated_post_count × goal_cadence over the window.',
  },
  {
    id: 'strategy',
    label: 'Strategy',
    icon: NotepadIcon,
    build: 'fe',
    tone: 'var(--nav-brief)',
    note: 'Brief + Settings merged. Every field already exists on models.Campaign. Renders the Foundation inheritance — brand_voice_id is nullable and falls back to the workspace default.',
  },
  {
    id: 'ideas',
    label: 'Ideas',
    icon: LightbulbIcon,
    build: 'blocked',
    tone: 'var(--nav-content)',
    note: 'Same blocker as the workspace Ideas module.',
  },
  {
    id: 'posts',
    label: 'Posts',
    icon: CalendarDotsIcon,
    build: 'now',
    tone: 'var(--nav-posts)',
    note: 'The campaign is a sequence (post 4 of 12); the calendar is a schedule (Tuesday 09:00). Same rows, genuinely different information design.',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: ChartLineUpIcon,
    build: 'fe',
    tone: 'var(--nav-analytics)',
    note: 'The workspace dashboard with a campaignId prop. Cheap under drill-down, because it no longer puts a second Analytics in the same sidebar.',
  },
  {
    id: 'activity',
    label: 'Activity',
    icon: PulseIcon,
    build: 'blocked',
    note: 'Same blocker as the workspace Activity module.',
  },
]

// ── What the current rail draws, for the control variant ────────────────────

/** Today’s campaign sections, in today’s order. See `lib/campaignSections`. */
export const TODAY_SECTIONS: RailItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: SidebarIcon,
    build: 'now',
    tone: 'var(--nav-overview)',
  },
  {
    id: 'posts',
    label: 'Posts',
    icon: CalendarDotsIcon,
    build: 'now',
    tone: 'var(--nav-posts)',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: ChartLineUpIcon,
    build: 'now',
    tone: 'var(--nav-analytics)',
  },
  {
    id: 'brief',
    label: 'Brief',
    icon: NotepadIcon,
    build: 'now',
    tone: 'var(--nav-brief)',
  },
  {
    id: 'content',
    label: 'Content',
    icon: ScanIcon,
    build: 'now',
    tone: 'var(--nav-content)',
  },
  { id: 'settings', label: 'Settings', icon: GearSixIcon, build: 'now' },
]

/** Today’s workspace modules, in today’s order. */
export const TODAY_MODULES: RailItem[] = [
  { id: 'campaigns', label: 'Campaigns', icon: ToolboxIcon, build: 'now' },
  { id: 'content-bank', label: 'Content Bank', icon: ScanIcon, build: 'now' },
  { id: 'brand', label: 'Brand', icon: PaletteIcon, build: 'now' },
  { id: 'analytics', label: 'Analytics', icon: ChartLineUpIcon, build: 'now' },
]

// ── Campaigns ───────────────────────────────────────────────────────────────

export type HarnessCampaign = {
  id: string
  name: string
  /** The window, already formatted — the harness has no date to format. */
  window: string
  made: number
  goal: number
}

/**
 * Three campaigns, because three is where today’s rail starts to hurt: three
 * campaigns times six sections is eighteen latent rows in one sidebar.
 *
 * The ids are UUID-shaped so `identityColorVar` hashes them the way it will in
 * production — FNV-1a over a short slug lands on a different hue than over the
 * real thing, and the whole point of the colour is that it is stable.
 */
export const CAMPAIGNS: HarnessCampaign[] = [
  {
    id: '8f14e45f-ceea-467a-9c1d-1a2b3c4d5e6f',
    name: 'Q3 Launch',
    window: 'Sep 1 – Sep 30',
    made: 7,
    goal: 12,
  },
  {
    id: 'c9f0f895-fb98-4b0f-b0a1-9d8e7f6a5b4c',
    name: 'Always-On',
    window: 'Ongoing',
    made: 23,
    goal: 24,
  },
  {
    id: '45c48cce-2e2d-4fbd-aa1c-3d4e5f607182',
    name: 'Founder Story',
    window: 'Aug 12 – Oct 4',
    made: 4,
    goal: 16,
  },
]
