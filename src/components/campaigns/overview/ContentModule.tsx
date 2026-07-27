import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button.tsx";
import { StatusBadge } from "@/components/ui/status-badge.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { PostStatusBadge } from "@/components/posts/PostStatusBadge.tsx";
import { useAddPost } from "@/hooks/usePosts.ts";
import { cn, formatTitle } from "@/lib";
import { contentSnapshot } from "@/lib/campaignReadiness.ts";
import { getPlatformInfo } from "@/lib/platformDictionary.ts";
import { relativeTime } from "@/lib/relativeTime.ts";
import type { Campaign } from "@/types/campaigns";
import type { Post } from "@/types/posts";
import { CallToAction, CTA_PRIMARY } from "./CallToAction.tsx";
import { LineItem } from "./LineItem.tsx";
import { OverviewCard } from "./OverviewCard.tsx";

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

  if (posts.length === 0) {
    return (
      <OverviewCard
        title="Content"
        status={<StatusBadge tone="warn" label="No posts yet" />}
      >
        <CallToAction
          headline="This is where the campaign comes to life — everything else on this screen is about what gets published here."
          support="Add posts one by one, or ask the assistant to generate a content plan from the brief."
        >
          <Button
            variant="default"
            size="xl"
            className={CTA_PRIMARY}
            onClick={addPost}
          >
            <PlusIcon />
            <span>ADD POST</span>
          </Button>
        </CallToAction>
      </OverviewCard>
    );
  }

  // One tab per channel the campaign settings select, whether or not it has
  // posts yet — the strip is the campaign's channel list, so a channel with
  // nothing on it is worth seeing, and one the campaign dropped is not.
  const channels = campaign.target_platforms.flatMap((tp) => {
    const info = getPlatformInfo(tp.id);
    return info ? [info] : [];
  });

  const selected = channels.find((c) => c.id === platformId);
  const shown = selected
    ? posts.filter((p) => p.platform_id === selected.id)
    : posts;
  const snapshot = contentSnapshot(shown);
  const planned = campaign.estimated_post_count;

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
        {/* The total carries the plan with it — the target is campaign-wide,
            so filtering to one channel drops it. */}
        <StatTile
          value={snapshot.total}
          label={
            selected
              ? `on ${selected.name}`
              : planned
                ? `of ${planned} planned`
                : "Total"
          }
        />
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

      {snapshot.total === 0 && (
        <p className="text-sm text-secondary-foreground">
          Nothing on {selected?.name} yet.
        </p>
      )}
    </OverviewCard>
  );
}

/**
 * One count in the widget row. All four share the row equally so the shape of
 * the campaign is readable as a bar chart of numbers, not just as text.
 */
function StatTile({
  value,
  label,
  tone = "default",
}: {
  value: number;
  label: string;
  tone?: "default" | "alert";
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md bg-secondary px-3 py-2.5 min-w-0">
      <span
        className={cn(
          "font-display text-2xl font-medium leading-7",
          tone === "alert" && "text-destructive",
          value === 0 && tone === "default" && "text-tertiary-foreground",
        )}
      >
        {value}
      </span>
      <span className="text-xs text-tertiary-foreground truncate">{label}</span>
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
              <LineItem
                asChild
                indicator={
                  info
                    ? {
                        kind: "custom",
                        node: (
                          <info.icon
                            className="size-4"
                            style={{ color: info.color }}
                          />
                        ),
                      }
                    : undefined
                }
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
