import { Link } from '@tanstack/react-router'
import { CaretRightIcon } from '@phosphor-icons/react'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge.tsx'
import { CampaignIcon, campaignAbbr } from '@/components/layout/CampaignIcon.tsx'
import { StatTile } from '@/components/campaigns/overview/StatTile.tsx'
import { useCampaignSummaries } from '@/hooks/useCampaigns.ts'
import { usePlatformViews } from '@/hooks/usePlatforms.ts'
import { campaignColorVar } from '@/lib/campaignColor.ts'
import {
  attentionItems,
  contentSnapshot,
  setupChecks,
  SCHEDULED_STATUSES,
  type AttentionSeverity,
} from '@/lib/campaignReadiness.ts'
import type { Campaign } from '@/types/campaigns.ts'
import type { PostSummary } from '@/types/posts.ts'

/**
 * One campaign on the Campaigns list: who it is, how it is doing, how it is
 * set up.
 *
 * The identity block is the same one the sidebar shows — same coloured mark,
 * same abbreviation — so a campaign is recognised the same way wherever it
 * appears. Below it, the widget row is the Overview's Content module verbatim
 * (`StatTile`): the list is for comparing campaigns, and equal-width counts
 * compare, while prose doesn't. The setup line under that is the campaign's
 * configuration, not its progress, so it stays quiet.
 *
 * Every number comes from `lib/campaignReadiness` — the Overview's rules are
 * the contract (docs/attention-rules.md), and a list that scored campaigns its
 * own way would quietly disagree with the screen behind it.
 */

/** The header verdict takes the colour of the campaign's worst open item. */
const HEADLINE_TONE: Record<AttentionSeverity, StatusTone> = {
  alert: 'destructive',
  risk: 'warn',
  todo: 'warn',
  info: 'neutral',
}

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  // One query for the whole list, not one per card (CON-152). Every card
  // subscribes to the same key, so the request is fired once no matter how
  // many campaigns are on screen.
  const summariesQuery = useCampaignSummaries()
  const platformViews = usePlatformViews()

  const title = campaign.name.trim() || 'Untitled campaign'
  const typeLabel =
    campaign.campaign_type?.label ?? campaign.campaign_type?.name ?? null
  const dates = setupChecks(campaign, platformViews).find((c) => c.id === 'dates')!
  // Only a complete range describes the campaign; a half-set one is a gap, and
  // the attention badge already carries it.
  const properties = [typeLabel, dates.ok ? dates.detail : null]
    .filter(Boolean)
    .join(' · ')

  // The counts are claims about the posts, so they wait for them — scoring a
  // campaign against an empty list would flash a row of zeroes at a campaign
  // that has failures. A *failed* query is not an empty campaign either:
  // rendering "All clear" off an error would be a lie, so the verdict and the
  // tiles only draw from a successful fetch.
  //
  // Load state comes from the query, never from the presence of this
  // campaign's entry: the server omits campaigns with no posts, so an absent
  // id means "none", not "not yet".
  const settled = summariesQuery.isSuccess
  const failed = summariesQuery.isError
  const posts = summariesQuery.data?.[campaign.id] ?? []
  // Time-based rules are recomputed per render against the current clock,
  // exactly as the Overview screen does it.
  const items = settled
    ? attentionItems(campaign, posts, platformViews, new Date())
    : []
  const snapshot = contentSnapshot(posts)
  const planned = campaign.estimated_post_count

  // A count, not a roster. Which channels a campaign runs on is settings'
  // business; here it only has to say whether it can publish at all, and six
  // channel names would crowd the stage off the line they share.
  const platformCount = campaign.target_platforms.length
  const platformSummary =
    platformCount === 0
      ? 'No platforms connected'
      : `${platformCount} platform${platformCount === 1 ? '' : 's'}`
  const stage = currentStage(campaign, posts)
  const advanced = advancedSummary(campaign)

  return (
    <section className="w-full max-w-content mx-auto rounded-md bg-primary p-5 flex flex-col gap-4 min-w-0">
      <Link
        to="/campaigns/$campaignId"
        params={{ campaignId: campaign.id }}
        className="group -mx-2 -my-1 flex items-center gap-3 rounded-md px-2 py-1 hover:bg-secondary min-w-0"
      >
        {/* 40px of mark against 40px of text — the two lines below set the
            height, and the icon spans both rather than hanging off the title. */}
        <CampaignIcon
          abbr={campaignAbbr(title)}
          color={campaignColorVar(campaign.id)}
          className="size-10 shrink-0"
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-display text-base/6 font-medium truncate">
            {title}
          </span>
          {properties && (
            <span className="text-xs/4 text-tertiary-foreground truncate">
              {properties}
            </span>
          )}
        </span>
        {settled &&
          (items.length === 0 ? (
            <StatusBadge tone="positive" label="All clear" className="shrink-0" />
          ) : (
            <StatusBadge
              tone={HEADLINE_TONE[items[0].severity]}
              label={`${items.length} item${items.length === 1 ? '' : 's'} to review`}
              className="shrink-0"
            />
          ))}
        <span className="sr-only">Open {title}</span>
        <CaretRightIcon
          className="size-4 shrink-0 text-tertiary-foreground group-hover:text-primary-foreground"
          weight="bold"
          aria-hidden
        />
      </Link>

      {failed ? (
        <p className="text-sm text-tertiary-foreground">
          Couldn’t load post counts — they’ll appear once they’re reachable
          again.
        </p>
      ) : settled ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          <StatTile value={plannedToday(posts, new Date())} label="Planned for today" />
          <StatTile value={snapshot.readyToGo} label="Ready to go" />
          <StatTile value={snapshot.notReady} label="Still drafting" />
          <StatTile
            value={snapshot.byStatus.failed}
            label="Failed"
            tone={snapshot.byStatus.failed > 0 ? 'alert' : 'default'}
          />
          {/* The total carries the plan with it — a count with nothing to
              measure against says less than "12 of 40". */}
          <StatTile
            value={snapshot.total}
            label={planned ? `of ${planned} planned` : 'Total'}
          />
        </div>
      ) : (
        <Skeleton className="h-16 w-full" />
      )}

      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-secondary-foreground">
          <span>{platformSummary}</span>
          {stage && (
            <>
              <span className="text-tertiary-foreground" aria-hidden>
                ·
              </span>
              <span className="text-tertiary-foreground">{stage}</span>
            </>
          )}
        </div>
        {/* Advanced settings take their own line: they are the exception, so
            they must not push the channels — which every campaign has — off
            the end of theirs. */}
        {advanced && (
          <div className="text-xs text-tertiary-foreground">{advanced}</div>
        )}
      </div>
    </section>
  )
}

/** Posts due to go out inside today's local calendar day, still unpublished. */
function plannedToday(posts: PostSummary[], now: Date): number {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = start.getTime() + 24 * 60 * 60 * 1000
  return posts.filter((p) => {
    if (!p.scheduled_at || !SCHEDULED_STATUSES.includes(p.status)) return false
    const at = Date.parse(p.scheduled_at)
    return at >= start.getTime() && at < end
  }).length
}

/**
 * Where the campaign is in its plan, as a spelled-out sentence rather than a
 * bare ordinal: "Stage 2 of 3: Distribute & Cross-Link".
 *
 * Every system campaign type ships phases — evergreen included — so the API is
 * taken at its word and any type with phases gets a stage.
 *
 * Phases carry a sequence but no dates, so "current" is read off the work
 * rather than off the clock: the earliest phase that still has posts to
 * finish is what the campaign is working on. Once every phase is done the
 * last one stands as where it ended up.
 */
function currentStage(campaign: Campaign, posts: PostSummary[]): string | null {
  const phases = [...(campaign.campaign_type?.phases ?? [])].sort(
    (a, b) => a.sequence - b.sequence,
  )
  if (phases.length === 0) return null

  const openPhaseIds = new Set(
    posts
      .filter((p) => p.status !== 'published' && p.status !== 'not_published')
      .map((p) => p.campaign_type_phase_id)
      .filter((id): id is string => id !== null),
  )
  const index = phases.findIndex((ph) => openPhaseIds.has(ph.id))
  const current = index === -1 ? phases.length - 1 : index
  return `Stage ${current + 1} of ${phases.length}: ${phases[current].name}`
}

/**
 * The advanced settings, if any were filled in. Written as a sentence rather
 * than a label grid — this is a footnote on a list card, and a campaign with
 * none of it set should cost no space at all.
 */
function advancedSummary(campaign: Campaign): string | null {
  const parts: string[] = []
  if (campaign.budget != null && campaign.budget > 0) {
    parts.push(
      `Budget ${campaign.budget.toLocaleString()} ${campaign.currency}`.trim(),
    )
  }
  const target = campaign.estimated_post_count
  const language = campaign.language.trim()
  if (target != null && target > 0) {
    parts.push(
      language
        ? `Target: ${target} posts in ${language.toUpperCase()}`
        : `Target: ${target} posts`,
    )
  } else if (language) {
    parts.push(`Language: ${language.toUpperCase()}`)
  }
  return parts.length > 0 ? parts.join(' · ') : null
}
