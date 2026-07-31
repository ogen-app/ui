import { useEffect, useState, type ReactNode } from 'react'
import { CloudCheckIcon, CloudIcon, FileArrowUpIcon } from '@phosphor-icons/react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { StatusBadge } from '@/components/ui/status-badge'
import { SidebarMenuSkeleton } from '@/components/ui/sidebar'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { PostsTable } from '@/components/tables/postsTable'
import { WeeklyCalendarSkeleton } from '@/components/campaigns/calendar/WeeklyCalendarSkeleton'
import { cn } from '@/lib'

/**
 * Every loading state in the app, on one page, running.
 *
 * Loading is the state we design least and ship most: it turns up in a dozen
 * files, each author reaching for whatever was nearest. Seeing them side by
 * side is the only way to notice that we have four different ways of saying
 * "working" — and which of them are worth keeping.
 *
 * Each specimen says where it is actually used. When you retire one, delete
 * its entry here too; a catalogue that lies is worse than none.
 */
export default function LoadingStatesPage() {
  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-2">
          <p className="font-grotesk text-xs font-medium uppercase tracking-[0.08em] text-tertiary-foreground">
            Design reference
          </p>
          <h1 className="font-display text-[2rem] leading-12 font-medium tracking-tight">
            Loading states
          </h1>
          <p className="max-w-2xl text-sm text-secondary-foreground">
            Everything the app shows while it is waiting — the primitives, every screen
            that fetches, and the states built on them. All of it is live: nothing here is
            a screenshot.
          </p>
        </header>

        <Primitives />
        <RouteLoaders />
        <PanelLoaders />
        <InControls />
        <Determinate />
        <Inventory />

        <footer className="border-t border-border pt-6 text-xs text-tertiary-foreground">
          Reduced motion: none of the states on this page have a{' '}
          <code className="font-grotesk">prefers-reduced-motion</code> fallback in{' '}
          <code className="font-grotesk">index.css</code> — the spinner sweep, the
          skeleton pulse, the logo line and the autosave cloud all keep animating.
        </footer>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Sections                                                                    */
/* -------------------------------------------------------------------------- */

function Primitives() {
  return (
    <Section
      title="Primitives"
      blurb="The three components almost everything else composes from."
    >
      <Specimen
        name="Spinner"
        source="ui/spinner.tsx"
        usedIn={['Button (loading)', 'ConnectPlatformsSection', 'CreateCampaignDialog', 'auth/logout']}
        note="A 2px bar that sweeps, not a disc that turns. Its default tone assumes an inverted surface (it mostly rides inside buttons); anything drawing it on a page passes tone=&quot;onSurface&quot;."
      >
        <div className="flex flex-wrap items-center gap-6">
          <Swatch label="onPrimary (default)">
            <span className="flex h-10 items-center justify-center bg-primary-foreground px-6">
              <Spinner />
            </span>
          </Swatch>
          <Swatch label="onSurface">
            <span className="flex h-10 items-center justify-center px-6">
              <Spinner tone="onSurface" />
            </span>
          </Swatch>
          <Swatch label="onSurface, full width (logout)">
            <span className="flex h-10 items-center px-2">
              <Spinner tone="onSurface" className="h-[2px] w-40" />
            </span>
          </Swatch>
        </div>
      </Specimen>

      <Specimen
        name="Skeleton"
        source="ui/skeleton.tsx"
        usedIn={[
          'campaigns/$campaignId/overview',
          'CampaignCard',
          'AssistantPanel',
          'PostQualityPanelView',
          'ContentModule',
        ]}
        note="A pulsing block sized by the caller. Used where the shape of what is coming is known — the page keeps its layout instead of collapsing to a spinner and jumping back."
      >
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="pt-2" />
          <Skeleton className="h-20 w-full" />
        </div>
      </Specimen>

      <Specimen
        name="SidebarMenuSkeleton"
        source="ui/sidebar.tsx"
        usedIn={['— currently unused']}
        note="The skeleton with a random 50–90% width per row, so a stack of them doesn't read as a barcode. Shipped with the sidebar kit and never wired up — AppSidebar's campaign list, the one place that wants it, renders nothing while it loads."
      >
        <div className="flex w-64 flex-col gap-1">
          <SidebarMenuSkeleton showIcon />
          <SidebarMenuSkeleton showIcon />
          <SidebarMenuSkeleton showIcon />
        </div>
      </Specimen>

      <Specimen
        name="PageLoader"
        source="page-primitives/PageLoader.tsx"
        usedIn={[
          'campaigns index + $campaignId',
          'posts/$postId',
          'content-bank_/$assetId',
          'workspace-settings',
          'ContentBankList',
        ]}
        note="The whole-route fallback: the Spinner's line sweep over one word of mono capitals, on the surface tone. The only state here that owns the full height of its container."
      >
        <div className="h-40 w-full bg-background">
          <PageLoader />
        </div>
      </Specimen>

      <Specimen
        name="Logo (loading)"
        source="Logo.tsx · .logo-line-loading"
        usedIn={['AssessProgress heading']}
        note="`loading` swaps the filled mark for the same shape drawn as one open stroke, which draws, reverses and pulses. The most expensive-looking thing we have — reserved for waits measured in tens of seconds. The last swatch is the same component without the prop, for comparison; the caller flips it, nothing settles on its own."
      >
        <div className="flex items-end gap-8">
          <Logo variant="mark" loading className="size-12 text-accent" />
          <Logo variant="mark" loading className="size-8 text-foreground" />
          <Logo variant="square" loading className="size-12 text-foreground" />
          <Swatch label="loading={false}">
            <Logo variant="mark" className="size-8 text-foreground" />
          </Swatch>
        </div>
      </Specimen>
    </Section>
  )
}

function RouteLoaders() {
  return (
    <Section
      title="Route loaders"
      blurb="What each fetching screen shows between navigation and data. One entry per surface — the verdict says whether the wait holds the layout or throws something away."
    >
      <Specimen
        name="Whole-route fallback"
        source="PageLoader, in seven routes"
        usedIn={[
          'campaigns index',
          'campaigns/$campaignId',
          'campaigns/$campaignId/settings',
          'campaigns/$campaignId/brief',
          'posts/$postId',
          'content-bank_/$assetId',
          'workspace-settings',
          'ContentBankList',
        ]}
        note="Centred in whatever height the route owns, so nothing else is drawn until the data lands. Consistent, and the cheapest thing to reach for — but it also means six screens tell you nothing about what is coming."
        verdict="holds"
        wide
      >
        <div className="h-40 w-full bg-background">
          <PageLoader />
        </div>
      </Specimen>

      <Specimen
        name="Campaign overview"
        source="campaigns/$campaignId/overview.tsx"
        usedIn={['useCampaign + useCampaignPosts']}
        note="Four blocks in the heights the modules will occupy. The gate is `postsQuery.isPending`, not `!posts` — the backend sends null for a campaign with no posts, so truthiness would hang here forever."
        verdict="holds"
        wide
      >
        <div className="flex w-full flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-7 w-full" />
        </div>
      </Specimen>

      <Specimen
        name="Posts list"
        source="campaigns/$campaignId/list.tsx · VirtualTable `loading`"
        usedIn={['useCampaignPosts']}
        note="Eight skeleton rows under the real header, at the real row height and in the real column widths — the table the data lands in, minus the data. The route gates on `isPending` now, so the empty state (and its invitation to add the first post) waits until we know there are none."
        verdict="holds"
        wide
      >
        <div className="flex h-72 w-full overflow-hidden bg-background">
          <PostsTable posts={[]} campaignId={DEMO_CAMPAIGN} onDelete={noop} loading />
        </div>
      </Specimen>

      <Specimen
        name="Calendar week"
        source="campaigns/calendar/WeeklyCalendarSkeleton.tsx"
        usedIn={['useCampaignPosts', 'useCalendarSettings']}
        note="Same columns, same gutters, same card rhythm as the week it becomes. Two queries feed it — the posts, and the preference that decides which columns there are — so it waits for both."
        verdict="holds"
        wide
      >
        <div className="flex h-72 w-full flex-col overflow-hidden bg-background">
          <WeeklyCalendarSkeleton anchor={DEMO_ANCHOR} firstDayOfWeek={1} />
        </div>
      </Specimen>

      <Specimen
        name="Unknown week shape"
        source="hooks/useCalendarSettings.ts · PostsToolbar"
        usedIn={['WeeklyCalendarSkeleton', 'PostsToolbar', 'CalendarSettingsPanel']}
        note="The hook returns its defaults plus `isPending`, so a caller can tell a real Monday-first preference from not knowing yet. Until it lands the columns are anonymous and the range label is a bar — the week's first day is exactly what is unknown, so neither can be written."
        verdict="holds"
        wide
      >
        <div className="flex w-full flex-col gap-2">
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-56" />
            <span className="font-grotesk text-[11px] text-quaternary-foreground">
              toolbar range
            </span>
          </div>
          <div className="h-40">
            <WeeklyCalendarSkeleton anchor={DEMO_ANCHOR} firstDayOfWeek={null} />
          </div>
        </div>
      </Specimen>

      <Specimen
        name="Sidebar campaign list"
        source="layout/AppSidebar.tsx"
        usedIn={['useCampaigns']}
        note="Three menu rows in the campaigns group, at the width the names will take. SidebarMenuSkeleton shipped with the sidebar kit and had never been wired to anything; this is its one caller."
        verdict="holds"
      >
        <div className="flex w-64 flex-col gap-1">
          <span className="font-grotesk text-[11px] uppercase tracking-[0.08em] text-quaternary-foreground">
            Campaigns
          </span>
          <SidebarMenuSkeleton showIcon />
          <SidebarMenuSkeleton showIcon />
          <SidebarMenuSkeleton showIcon />
        </div>
      </Specimen>
    </Section>
  )
}

function PanelLoaders() {
  return (
    <Section
      title="Inside a screen"
      blurb="Fetches that own one module rather than the route. Every one of these can be waiting while the page around it is already interactive."
    >
      <Specimen
        name="Campaign card counts"
        source="campaigns/CampaignCard.tsx"
        usedIn={['useCampaignPosts, once per card']}
        note="Each card fetches its own posts for the counts and gates on `isSuccess`, so a grid of eight cards runs eight queries and settles row by row. The skeleton sits in the strip the counts will fill."
        verdict="holds"
      >
        <div className="flex w-64 flex-col gap-3 bg-secondary p-4">
          <span className="text-sm font-medium">Spring launch</span>
          <Skeleton className="h-16 w-full" />
        </div>
      </Specimen>

      <Specimen
        name="Overview content module"
        source="campaigns/overview/ContentModule.tsx"
        usedIn={['useCampaignOverview']}
        note="One module inside an already-rendered overview, so it gets a single block rather than the route's whole stack."
        verdict="holds"
      >
        <Skeleton className="h-24 w-full max-w-md" />
      </Specimen>

      <Specimen
        name="Rail panel skeletons"
        source="posts/quality/PostQualityPanelView.tsx · assistant/AssistantPanel.tsx"
        usedIn={['usePostAssessment', 'assistant thread fetch']}
        note="The right-hand rail panels keep their own shape while loading: the quality panel stacks the score card and two dimension cards, the assistant draws the paragraph its reply will be."
        verdict="holds"
      >
        <div className="flex flex-col gap-6 sm:flex-row">
          <Swatch label="quality panel">
            <div className="flex w-56 flex-col gap-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          </Swatch>
          <Swatch label="assistant reply">
            <div className="flex w-56 flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </Swatch>
        </div>
      </Specimen>

      <Specimen
        name="Workspace name"
        source="workspace-settings/WorkspaceSection.tsx"
        usedIn={['useCurrentTenant']}
        note="A word where the value will be. Fine here — the card is already the right size, so nothing moves when the name replaces it."
        verdict="holds"
      >
        <p className="text-sm text-tertiary-foreground">Loading…</p>
      </Specimen>

      <Specimen
        name="Auto-publish allowlist"
        source="PostQuickSettingsBar · PlatformsControl · AutoPublishControl"
        usedIn={['useAutoPublishAllowlist']}
        note="`data ?? []` reads as not-allowlisted, so this used to promise manual publishing before it had asked. Every line that states the method now waits for the answer, and so do the status actions — SCHEDULE lands on auto or manual depending on this list, and that is not a mistake the user can see happening."
        verdict="holds"
      >
        <div className="flex flex-col gap-3">
          <Swatch label="post bar · publish method">
            <span className="flex items-center gap-2.5 text-sm">
              <span className="text-tertiary-foreground">Fri 24 Jul, 09:00</span>
              <span className="text-quaternary-foreground">·</span>
              <Skeleton className="h-4 w-28" />
            </span>
          </Swatch>
          <Swatch label="workspace settings · control">
            <span className="flex w-72 flex-col gap-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-12 w-36" />
            </span>
          </Swatch>
        </div>
      </Specimen>

      <Specimen
        name="Controls with unloaded options"
        source="ui/tags-input.tsx · PostSettingsForm · AssetSection · ConnectPlatformsSection"
        usedIn={['useTags', 'useCampaign', 'useAssets', 'useZernioHealth']}
        note="These used to render as answered while unanswered: a tag field showing no tags for a post that has them, a phase select whose only option is None, an asset panel reading No assets used, a connect tile that takes a click the health check would have refused. Each now holds its own shape and stays inert until its options exist."
        verdict="holds"
      >
        <div className="flex flex-col gap-3">
          <Swatch label="tags field">
            <span className="flex min-h-10 w-64 flex-wrap items-center gap-1.5 border-b border-quaternary bg-input px-3 py-1.5">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </span>
          </Swatch>
          <Swatch label="campaign-shaped select">
            <Skeleton className="h-10 w-64" />
          </Swatch>
          <Swatch label="asset section rows">
            <span className="flex w-64 flex-col gap-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </span>
          </Swatch>
        </div>
      </Specimen>
    </Section>
  )
}

function InControls() {
  return (
    <Section
      title="Inside controls"
      blurb="Where the waiting belongs to one element rather than the page."
    >
      <Specimen
        name="Button loading"
        source="ui/button.tsx"
        usedIn={['CampaignSettingsForm', 'auth forms', 'settingsSave']}
        note="The label stays put and the spinner is laid over it, so the button never changes width mid-click. It also disables itself — `loading` implies `disabled`."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button loading>SAVE</Button>
          <Button variant="defaultInverted" loading>
            SAVE
          </Button>
          <Button variant="outline" loading>
            SAVE
          </Button>
          <Button variant="destructive" loading>
            DELETE
          </Button>
          <Button variant="ghost" loading>
            SAVE
          </Button>
          <Button size="xl" loading>
            BIGGER
          </Button>
        </div>
      </Specimen>

      <Specimen
        name="Autosave status"
        source="posts/PostDetailsHeader.tsx"
        usedIn={['post editor header']}
        note="Autosave is continuous, so this is a status rather than a wait: the cloud breathes while a save is in flight and settles into a tick. Nothing blocks."
      >
        <div className="flex items-center gap-8">
          <Swatch label="saving">
            <span className="flex size-8 items-center justify-center text-secondary-foreground">
              <CloudIcon className="size-5 animate-pulse-opacity" />
            </span>
          </Swatch>
          <Swatch label="saved">
            <span className="flex size-8 items-center justify-center text-secondary-foreground">
              <CloudCheckIcon className="size-5" />
            </span>
          </Swatch>
        </div>
      </Specimen>
    </Section>
  )
}

function Determinate() {
  const progress = useLoopingProgress()

  return (
    <Section
      title="Determinate progress"
      blurb="The rare cases where we actually know how far along we are — all of them uploads."
    >
      <Specimen
        name="Upload bar"
        source="uploads/UploadRow.tsx"
        usedIn={['upload tracker']}
        note="A 2px rule under the filename. The percentage is already in the badge, so the bar carries no label of its own."
      >
        <div className="flex flex-col gap-1 py-2">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-sm text-foreground">brand-guidelines-v4.pdf</span>
            <StatusBadge tone="progress" label={`Uploading ${progress}%`} />
          </div>
          <div className="h-0.5 w-full bg-quaternary">
            <div
              className="h-full bg-chart-4 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </Specimen>

      <Specimen
        name="Pending media tile"
        source="posts/PostMediaCard.tsx"
        usedIn={['post editor media card']}
        note="The upload occupies the slot its result will land in, so the grid doesn't reflow when it completes."
      >
        <div className="flex flex-col items-center justify-center gap-2 bg-tertiary px-2 text-center size-32">
          <FileArrowUpIcon className="size-5 text-tertiary-foreground" />
          <span className="w-full truncate text-xs text-tertiary-foreground">hero-shot.jpg</span>
          <span className="h-[2px] w-20 bg-quaternary">
            <span
              className="block h-full bg-foreground transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </span>
        </div>
      </Specimen>
    </Section>
  )
}

/**
 * Every query in the app and what the screen does while it is in flight.
 * Derived by hand from the `useQuery` call sites — if you add a hook, add a
 * row, and if you fix a `flash` row, change its verdict here.
 */
const INVENTORY: {
  surface: string
  query: string
  pending: string
  verdict: Verdict
}[] = [
  {
    surface: 'campaigns index',
    query: 'useCampaigns',
    pending: 'PageLoader',
    verdict: 'holds',
  },
  {
    surface: 'campaigns/$campaignId (layout)',
    query: 'useCampaign',
    pending: 'PageLoader',
    verdict: 'holds',
  },
  {
    surface: 'campaign overview',
    query: 'useCampaign + useCampaignPosts',
    pending: 'four skeleton blocks',
    verdict: 'holds',
  },
  {
    surface: 'overview → content module',
    query: 'useCampaignOverview',
    pending: 'one skeleton block',
    verdict: 'holds',
  },
  {
    surface: 'campaign brief',
    query: 'useCampaign',
    pending: 'PageLoader',
    verdict: 'holds',
  },
  {
    surface: 'campaign settings',
    query: 'useCampaign',
    pending: 'PageLoader',
    verdict: 'holds',
  },
  {
    surface: 'posts list',
    query: 'useCampaignPosts',
    pending: 'skeleton rows in the real columns',
    verdict: 'holds',
  },
  {
    surface: 'calendar week',
    query: 'useCampaignPosts',
    pending: 'WeeklyCalendarSkeleton',
    verdict: 'holds',
  },
  {
    surface: 'calendar week · toolbar · not-scheduled panel',
    query: 'useCalendarSettings',
    pending: 'columns and label held back',
    verdict: 'holds',
  },
  {
    surface: 'calendar header actions',
    query: 'useCampaignPosts',
    pending: 'unscheduled badge appears when known',
    verdict: 'silent',
  },
  {
    surface: 'campaign card (per card, in the grid)',
    query: 'useCampaignPosts',
    pending: 'skeleton in the counts strip',
    verdict: 'holds',
  },
  {
    surface: 'sidebar campaign list',
    query: 'useCampaigns',
    pending: 'three SidebarMenuSkeleton rows',
    verdict: 'holds',
  },
  {
    surface: 'post editor route',
    query: 'usePost',
    pending: 'PageLoader',
    verdict: 'holds',
  },
  {
    surface: 'post editor → media card + validations',
    query: 'usePostAttachments + usePostTypeRules',
    pending: 'checks held back until `ready`',
    verdict: 'holds',
  },
  {
    surface: 'post editor → quick settings + settings form',
    query: 'useCampaign',
    pending: 'pickers inert until the campaign lands',
    verdict: 'holds',
  },
  {
    surface: 'post editor → publish method',
    query: 'useAutoPublishAllowlist',
    pending: 'method and status actions wait',
    verdict: 'holds',
  },
  {
    surface: 'post quality panel',
    query: 'usePostAssessment',
    pending: 'three skeleton cards',
    verdict: 'holds',
  },
  {
    surface: 'assistant panel',
    query: 'thread fetch (assistantStore)',
    pending: 'three-line skeleton',
    verdict: 'holds',
  },
  {
    surface: 'content usage forms (post + campaign)',
    query: 'useAssets',
    pending: 'skeleton asset rows',
    verdict: 'holds',
  },
  {
    surface: 'content bank list (all tabs)',
    query: 'useAssets',
    pending: 'PageLoader',
    verdict: 'holds',
  },
  {
    surface: 'content bank asset detail',
    query: 'useAsset',
    pending: 'PageLoader',
    verdict: 'holds',
  },
  {
    surface: 'workspace settings route',
    query: 'usePlatforms',
    pending: 'PageLoader',
    verdict: 'holds',
  },
  {
    surface: 'workspace settings → workspace card',
    query: 'useCurrentTenant',
    pending: '"Loading…"',
    verdict: 'holds',
  },
  {
    surface: 'workspace settings → platforms',
    query: 'useAutoPublishAllowlist',
    pending: 'skeleton sentence + button',
    verdict: 'holds',
  },
  {
    surface: 'workspace settings → connect platforms',
    query: 'useZernioHealth',
    pending: 'tiles visible, not clickable',
    verdict: 'holds',
  },
  {
    surface: 'tags input (campaign + post forms)',
    query: 'useTags',
    pending: 'skeleton chips, field inert',
    verdict: 'holds',
  },
  {
    surface: 'upload tracker row',
    query: 'asset status poll',
    pending: 'determinate bar + badge',
    verdict: 'holds',
  },
]

function Inventory() {
  return (
    <Section
      title="Everything that loads"
      blurb="Every query in the app, the screen it is on, and what that screen shows while it waits. Four verdicts: holds the layout, flashes something it then takes back, renders blank, or says nothing at all."
    >
      <div className="overflow-x-auto bg-primary">
        <table className="w-full min-w-[40rem] border-collapse text-left text-xs">
          <thead>
            <tr className="bg-table-header">
              {['Surface', 'Query', 'While pending', 'Verdict'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2 font-grotesk text-[11px] font-medium uppercase tracking-[0.08em] text-tertiary-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {INVENTORY.map((row) => (
              <tr key={`${row.surface}-${row.query}`} className="border-t border-border">
                <td className="px-4 py-2 align-top text-foreground">{row.surface}</td>
                <td className="px-4 py-2 align-top font-grotesk text-tertiary-foreground">
                  {row.query}
                </td>
                <td className="px-4 py-2 align-top text-secondary-foreground">
                  {row.pending}
                </td>
                <td className="px-4 py-2 align-top">
                  <VerdictChip verdict={row.verdict} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-tertiary-foreground">
        {INVENTORY.filter((r) => r.verdict === 'flash').length} flashing ·{' '}
        {INVENTORY.filter((r) => r.verdict === 'blank').length} blank ·{' '}
        {INVENTORY.filter((r) => r.verdict === 'silent').length} silent ·{' '}
        {INVENTORY.filter((r) => r.verdict === 'holds').length} holding, out of{' '}
        {INVENTORY.length}.
      </p>
    </Section>
  )
}

/* -------------------------------------------------------------------------- */
/* Demo drivers                                                                */
/* -------------------------------------------------------------------------- */

/** A campaign id for the fixtures. Nothing is fetched for it. */
const DEMO_CAMPAIGN = 'design-harness'

/** A fixed week for the calendar fixtures, so the page looks the same twice. */
const DEMO_ANCHOR = new Date(2026, 6, 20)

const noop = () => {}

/** Walks 0 → 100 and starts over, for the determinate bars. */
function useLoopingProgress(): number {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setProgress((p) => (p >= 100 ? 0 : p + 4)), 220)
    return () => clearInterval(timer)
  }, [])
  return progress
}

/* -------------------------------------------------------------------------- */
/* Page furniture                                                             */
/* -------------------------------------------------------------------------- */

function Section({
  title,
  blurb,
  children,
}: {
  title: string
  blurb: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 border-b border-border pb-3">
        <h2 className="font-display text-xl font-medium tracking-tight">{title}</h2>
        <p className="text-sm text-tertiary-foreground">{blurb}</p>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}

/**
 * What the wait costs the user, not what it looks like:
 * `holds` — the layout is kept and nothing is taken back.
 * `flash` — something is drawn and then replaced by different content.
 * `blank` — nothing is rendered where content will be.
 * `silent` — a control renders as if answered while the answer is in flight.
 */
type Verdict = 'holds' | 'flash' | 'blank' | 'silent'

const VERDICT_TONE: Record<Verdict, string> = {
  holds: 'text-positive',
  flash: 'text-destructive',
  blank: 'text-warning',
  silent: 'text-tertiary-foreground',
}

function VerdictChip({ verdict }: { verdict: Verdict }) {
  return (
    <span
      className={cn(
        'font-grotesk text-[11px] uppercase tracking-[0.08em]',
        VERDICT_TONE[verdict],
      )}
    >
      {verdict}
    </span>
  )
}

function Specimen({
  name,
  source,
  usedIn,
  note,
  verdict,
  /** Route-scale frames: the note goes above so the specimen gets the width. */
  wide = false,
  children,
}: {
  name: string
  source: string
  usedIn: string[]
  note: string
  verdict?: Verdict
  wide?: boolean
  children: ReactNode
}) {
  return (
    <article
      className={cn(
        'flex flex-col gap-4 bg-primary px-10 py-6',
        !wide && 'sm:flex-row sm:gap-8',
      )}
    >
      <div
        className={cn('flex flex-col gap-1', wide ? 'max-w-2xl' : 'shrink-0 sm:w-56')}
      >
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-medium">{name}</h3>
          {verdict && <VerdictChip verdict={verdict} />}
        </div>
        <p className="font-grotesk text-xs text-tertiary-foreground">{source}</p>
        <p className="pt-1 text-xs leading-relaxed text-secondary-foreground">{note}</p>
        <p className="pt-1 text-xs text-quaternary-foreground">{usedIn.join(' · ')}</p>
      </div>
      <div className="flex min-w-0 flex-1 items-center">{children}</div>
    </article>
  )
}

/** Labels one variant inside a specimen that shows several. */
function Swatch({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className={cn('flex flex-col items-start gap-1.5')}>
      {children}
      <span className="font-grotesk text-[11px] text-quaternary-foreground">{label}</span>
    </span>
  )
}
