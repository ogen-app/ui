import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { PlusIcon, SparkleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { StatusBadge } from "@/components/ui/status-badge.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { PostStatusBadge } from "@/components/posts/PostStatusBadge.tsx";
import { useCampaignOverview } from "@/hooks/useCampaigns.ts";
import { useAddPost } from "@/hooks/usePosts.ts";
import { formatTitle } from "@/lib";
import { contentSnapshot } from "@/lib/campaignReadiness.ts";
import {
  channelRows,
  phaseRows,
  type DistributionRow,
} from "@/lib/campaignDistribution.ts";
import { getPlatformInfo } from "@/lib/platformDictionary.ts";
import { relativeTime } from "@/lib/relativeTime.ts";
import { threadIdFor, useAssistantStore } from "@/stores/assistantStore.ts";
import { useSettingsStore } from "@/stores/settingsStore.ts";
import type { Campaign } from "@/types/campaigns";
import type { Post } from "@/types/posts";
import { CallToAction } from "./CallToAction.tsx";
import { LineItem, type LineItemIndicator } from "./LineItem.tsx";
import { OverviewCard } from "./OverviewCard.tsx";
import { StatTile } from "./StatTile.tsx";

/** The tab value that means "don't filter" — no platform id can collide. */
const ALL = "all";

export function ContentModule({
  campaign,
  posts,
}: {
  campaign: Campaign;
  posts: Post[];
}) {
  const campaignId = campaign.id;
  const addPost = useAddPost(campaignId);
  const [platformId, setPlatformId] = useState<string>(ALL);

  const askFor = useAssistantStore((s) => s.askFor);
  const openRightPanel = useSettingsStore((s) => s.openRightPanel);

  // The campaign's thread is already open — the layout starts it on arrival —
  // so this only has to point the panel at it with the ask written out. It
  // stops there: generating writes posts, so the send is the user's.
  const generatePlan = () => {
    openRightPanel("assistant");
    askFor(
      threadIdFor({ kind: "campaign", campaignId }),
      "Generate a content plan for this campaign.",
    );
  };

  if (posts.length === 0) {
    return (
      <OverviewCard
        title="Content"
        status={<StatusBadge tone="warn" label="No posts yet" />}
      >
        <CallToAction
          headline="This is where the campaign comes to life — everything else on this screen is about what gets published here."
          support="Write a post yourself, or have Ogen draft a whole plan from the brief."
        >
          {/* Same order as the brief: the user's own hand first, Ogen second.
              Wrapped, not passed bare: useAddPost takes an optional Date for
              the calendar's click-to-create, so onClick={addPost} would hand
              it a MouseEvent. */}
          <Button
            variant="defaultInverted"
            size="xl"
            onClick={() => addPost()}
          >
            <PlusIcon />
            <span>ADD POST</span>
          </Button>
          <Button variant="outline" size="xl" onClick={generatePlan}>
            <SparkleIcon />
            <span>GENERATE WITH OGEN</span>
          </Button>
        </CallToAction>
      </OverviewCard>
    );
  }

  // One tab per channel that is actually set up on this campaign — selected
  // *and* carrying a post type. A channel with nothing chosen for it can't
  // receive content, so it isn't a place to look at content; whatever it has
  // still counts under "All platforms". Whether an account is connected is a
  // workspace matter and doesn't belong in this decision.
  const channels = campaign.target_platforms.flatMap((tp) => {
    if (tp.post_types.length === 0) return [];
    const info = getPlatformInfo(tp.id);
    return info ? [info] : [];
  });

  const selected = channels.find((c) => c.id === platformId);
  const shown = selected
    ? posts.filter((p) => p.platform_id === selected.id)
    : posts;
  const snapshot = contentSnapshot(shown);

  return (
    <OverviewCard
      title="Content"
      link={{ target: "posts", campaignId, label: "Open all posts" }}
    >
      {channels.length > 1 && (
        <Tabs value={platformId} onValueChange={setPlatformId}>
          {/* One tone off the card, not the toolbar's darker track — this
              strip sits on a white card, not on the page canvas. */}
          <TabsList
            variant="segmented"
            size="excluded"
            className="max-w-full overflow-x-auto bg-secondary"
          >
            {/* Tighter than the default segment: six channels have to fit the
                content column before the strip starts scrolling. */}
            <TabsTrigger variant="segmented" value={ALL} className="px-3">
              All platforms
            </TabsTrigger>
            {channels.map((channel) => (
              <TabsTrigger
                key={channel.id}
                variant="segmented"
                value={channel.id}
                className="gap-1.5 px-3"
              >
                <channel.icon className="size-4 shrink-0" />
                {channel.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <StatTile value={snapshot.readyToGo} label="Ready to go" />
        <StatTile value={snapshot.notReady} label="Still drafting" />
        <StatTile value={snapshot.byStatus.published} label="Published" />
        <StatTile
          value={snapshot.byStatus.failed}
          label="Failed"
          tone={snapshot.byStatus.failed > 0 ? "alert" : "default"}
        />
        {/* Just the total: the campaign's post target is being reworked into a
            goal (CON-156), so nothing is measured against it for now. */}
        <StatTile
          value={snapshot.total}
          label={selected ? `on ${selected.name}` : "Total"}
        />
      </div>

      {/* The server's roll-up is campaign-wide, so it only belongs on the
          campaign-wide view — under a channel tab it would sit beneath tiles
          counting one channel and quietly disagree with them. */}
      {!selected && <Distribution campaignId={campaignId} />}

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

      {snapshot.total === 0 && (
        <p className="text-sm text-secondary-foreground">
          Nothing on {selected?.name} yet.
        </p>
      )}
    </OverviewCard>
  );
}

/**
 * How the campaign's posts are spread — across the phases of its plan, and
 * across its channels — counted by the server rather than from the page's
 * post list (CON-113).
 *
 * It fetches on its own so a slow or failed roll-up costs only this section:
 * everything else in the module is derived from `posts`, which is already
 * loaded by the time this renders.
 */
function Distribution({ campaignId }: { campaignId: string }) {
  const { data, isPending, isError } = useCampaignOverview(campaignId);

  if (isPending) return <Skeleton className="h-24 w-full" />;

  // A one-liner, not an error card: the module behind it is fully usable, and
  // the distribution is a detail of it rather than the point of it.
  if (isError || !data) {
    return (
      <p className="text-sm text-tertiary-foreground">
        Couldn't load the distribution.
      </p>
    );
  }

  const phases = phaseRows(data);
  const channels = channelRows(data);
  if (phases.length === 0 && channels.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {phases.length > 0 && (
        <CountList heading="Posts per phase" rows={phases} />
      )}
      {channels.length > 0 && (
        <CountList heading="Posts per channel" rows={channels} withIcons />
      )}
    </div>
  );
}

/** The platform's mark in a LineItem's 16px slot — shared by every list here. */
function platformIndicator(platformId: string): LineItemIndicator | undefined {
  const info = getPlatformInfo(platformId);
  if (!info) return undefined;
  return {
    kind: "custom",
    node: <info.icon className="size-4" style={{ color: info.color }} />,
  };
}

function CountList({
  heading,
  rows,
  withIcons = false,
}: {
  heading: string;
  rows: DistributionRow[];
  /** Channel rows key on a platform id, so they can carry its mark. */
  withIcons?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-xs text-tertiary-foreground">{heading}</h3>
      <ul className="flex flex-col">
        {rows.map((row) => (
          <li key={row.key}>
            <LineItem
              indicator={withIcons ? platformIndicator(row.key) : undefined}
              label={row.label}
              trailing={row.count.toLocaleString()}
            />
          </li>
        ))}
      </ul>
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
          const time = timeOf(post);
          return (
            <li key={post.id}>
              <LineItem
                asChild
                indicator={platformIndicator(post.platform_id)}
                label={formatTitle(post.title, "Untitled post")}
                trailing={
                  <>
                    <PostStatusBadge status={post.status} />
                    {time && (
                      <span
                        className="w-24 text-right"
                        title={new Date(time).toLocaleString()}
                      >
                        {relativeTime(time)}
                      </span>
                    )}
                  </>
                }
              >
                <Link
                  to="/campaigns/$campaignId/posts/$postId"
                  params={{ campaignId, postId: post.id }}
                />
              </LineItem>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
