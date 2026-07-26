import { Link } from "@tanstack/react-router";
import { PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { PostStatusBadge } from "@/components/posts/PostStatusBadge.tsx";
import { useAddPost } from "@/hooks/usePosts.ts";
import { cn, formatTitle } from "@/lib";
import {
  channelProgress,
  contentSnapshot,
} from "@/lib/campaignReadiness.ts";
import { getPlatformInfo } from "@/lib/platformDictionary.ts";
import { relativeTime } from "@/lib/relativeTime.ts";
import type { CampaignOverview } from "@/types/campaigns";
import type { Post } from "@/types/posts";
import { CardHeaderLink, OverviewCard } from "./OverviewCard.tsx";

export function ContentModule({
  campaignId,
  posts,
  plannedTotal,
  overview,
  overviewError,
}: {
  campaignId: string;
  posts: Post[];
  /** `estimated_post_count`: shown against the total instead of as a rail row. */
  plannedTotal: number | null;
  overview: CampaignOverview | undefined;
  overviewError: boolean;
}) {
  const addPost = useAddPost(campaignId);
  const snapshot = contentSnapshot(posts);
  const channels = channelProgress(posts);

  if (snapshot.total === 0) {
    return (
      <OverviewCard title="Content">
        <p className="text-sm text-secondary-foreground">
          No posts yet — this is where the campaign comes to life. Add posts
          one by one, or ask the assistant to generate a content plan.
        </p>
        <div>
          <Button variant="defaultInverted" onClick={addPost}>
            <PlusIcon />
            <span>ADD POST</span>
          </Button>
        </div>
      </OverviewCard>
    );
  }

  const upcoming =
    snapshot.byStatus.scheduled +
    snapshot.byStatus.scheduled_for_manual_publishing;

  return (
    <OverviewCard
      title="Content"
      action={
        <CardHeaderLink
          target="posts"
          campaignId={campaignId}
          label="Open all posts"
        />
      }
    >
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <StatTile
          value={snapshot.total}
          label={plannedTotal ? `of ${plannedTotal} planned` : "Total posts"}
        />
        <StatTile value={snapshot.byStatus.published} label="Published" />
        <StatTile value={upcoming} label="Scheduled" />
        <StatTile value={snapshot.byStatus.draft} label="Drafts" />
        {snapshot.byStatus.failed > 0 && (
          <StatTile
            value={snapshot.byStatus.failed}
            label="Failed"
            className="text-destructive"
          />
        )}
      </div>

      {snapshot.upNext.length > 0 && (
        <PostList
          heading="Up next"
          posts={snapshot.upNext}
          campaignId={campaignId}
          timeOf={(p) => p.scheduled_at}
        />
      )}

      {snapshot.recentlyPublished.length > 0 && (
        <PostList
          heading="Recently published"
          posts={snapshot.recentlyPublished}
          campaignId={campaignId}
          timeOf={(p) => p.published_at}
        />
      )}

      <Distribution
        overview={overview}
        overviewError={overviewError}
        channels={channels}
      />
    </OverviewCard>
  );
}

function StatTile({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className?: string;
}) {
  return (
    <div className="flex flex-col">
      <span className={cn("font-display text-2xl font-medium", className)}>
        {value}
      </span>
      <span className="text-xs text-tertiary-foreground">{label}</span>
    </div>
  );
}

function PostList({
  heading,
  posts,
  campaignId,
  timeOf,
}: {
  heading: string;
  posts: Post[];
  campaignId: string;
  timeOf: (post: Post) => string | null;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-xs text-tertiary-foreground">{heading}</h3>
      <ul className="flex flex-col">
        {posts.map((post) => {
          const info = getPlatformInfo(post.platform_id);
          const time = timeOf(post);
          return (
            <li key={post.id}>
              <Link
                to="/campaigns/$campaignId/posts/$postId"
                params={{ campaignId, postId: post.id }}
                className="flex items-center gap-3 py-2 -mx-2 px-2 rounded-md hover:bg-secondary"
              >
                {info && (
                  <info.icon
                    className="size-4 shrink-0"
                    style={{ color: info.color }}
                  />
                )}
                <span className="flex-1 min-w-0 truncate text-sm">
                  {formatTitle(post.title, "Untitled post")}
                </span>
                <PostStatusBadge status={post.status} className="shrink-0" />
                {time && (
                  <span
                    className="w-24 text-right text-xs text-tertiary-foreground shrink-0"
                    title={new Date(time).toLocaleString()}
                  >
                    {relativeTime(time)}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * How content spreads across phases (from the CON-113 overview endpoint) and
 * channels (computed from the posts the screen already has). The endpoint
 * failing must not take the rest of the card down — it degrades to an inline
 * note while the channel breakdown still renders.
 */
function Distribution({
  overview,
  overviewError,
  channels,
}: {
  overview: CampaignOverview | undefined;
  overviewError: boolean;
  channels: ReturnType<typeof channelProgress>;
}) {
  const phases = overview?.phases ?? [];
  const maxPhaseCount = Math.max(
    1,
    ...phases.map((ph) => ph.postCount),
    overview?.distribution.unassignedPhasePostCount ?? 0,
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1 min-w-0">
        <h3 className="text-xs text-tertiary-foreground">By phase</h3>
        {overviewError ? (
          <p className="text-sm text-tertiary-foreground">
            Couldn't load the phase breakdown.
          </p>
        ) : !overview ? (
          <div className="flex flex-col gap-2 pt-1">
            <Skeleton className="h-4" />
            <Skeleton className="h-4" />
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {phases.map((phase) => (
              <PhaseBar
                key={phase.id}
                name={phase.name}
                purpose={phase.purpose}
                count={phase.postCount}
                max={maxPhaseCount}
              />
            ))}
            {(overview?.distribution.unassignedPhasePostCount ?? 0) > 0 && (
              <PhaseBar
                name="No phase"
                count={overview!.distribution.unassignedPhasePostCount}
                max={maxPhaseCount}
              />
            )}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-1 min-w-0">
        <h3 className="text-xs text-tertiary-foreground">By channel</h3>
        <ul className="flex flex-col gap-1.5">
          {channels.map((ch) => {
            const info = getPlatformInfo(ch.platformId);
            return (
              <li key={ch.platformId} className="flex items-center gap-2 text-sm">
                {info && (
                  <info.icon
                    className="size-4 shrink-0"
                    style={{ color: info.color }}
                  />
                )}
                <span className="flex-1 min-w-0 truncate">
                  {info?.name ?? "Unknown channel"}
                </span>
                <span className="text-xs text-tertiary-foreground shrink-0">
                  {ch.published} of {ch.total} published
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function PhaseBar({
  name,
  purpose,
  count,
  max,
}: {
  name: string;
  purpose?: string;
  count: number;
  max: number;
}) {
  return (
    <li className="flex items-center gap-2 text-sm" title={purpose}>
      <span className="flex-1 min-w-0 truncate">{name}</span>
      <span className="w-24 h-1.5 rounded-full bg-quinary overflow-hidden shrink-0">
        <span
          className="block h-full rounded-full bg-chart-4"
          style={{ width: `${(count / max) * 100}%` }}
        />
      </span>
      <span className="w-6 text-right text-xs text-tertiary-foreground tabular-nums shrink-0">
        {count}
      </span>
    </li>
  );
}
