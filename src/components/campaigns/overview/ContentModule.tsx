import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CircleDashedIcon, PlusIcon, SparkleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button.tsx";
import { StatusBadge } from "@/components/ui/status-badge.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { PostStatusBadge } from "@/components/posts/PostStatusBadge.tsx";
import { useAddPost } from "@/hooks/usePosts.ts";
import { cn, formatTitle } from "@/lib";
import { contentSnapshot } from "@/lib/campaignReadiness.ts";
import { getPlatformInfo } from "@/lib/platformDictionary.ts";
import { relativeTime } from "@/lib/relativeTime.ts";
import { formatDate } from "@/lib/intl";
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
        section="posts"
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
      section="posts"
      // The calendar, not the list: this card is about work in flight, and
      // where that work sits in the week is the thing it can't show.
      link={{ target: "calendar", campaignId }}
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

      {/* Posts-per-phase and posts-per-channel used to sit here. They were the
          only thing on this card that measured rather than listed, and the
          card is about work in flight — so they moved out with the rest of the
          reporting when Analytics became its own section (CON-175). */}

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
 * The platform's mark in a LineItem's 16px slot — shared by every list here.
 *
 * Drawn exactly as the calendar draws it: filled, in the platform's own brand
 * colour, and falling back to a neutral dashed circle where no platform is
 * assigned. Same post, same mark, whichever screen it is seen on. The one
 * difference is the size, which is fixed here rather than sized to the card —
 * these rows are a list, not a column of cards that get narrower.
 */
function platformIndicator(platformId: string): LineItemIndicator {
  const info = getPlatformInfo(platformId);
  const Mark = info?.icon ?? CircleDashedIcon;
  return {
    kind: "custom",
    node: (
      <Mark
        weight="fill"
        className={cn("size-4", !info && "text-tertiary-foreground")}
        style={info ? { color: info.color } : undefined}
      />
    ),
  };
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
  const { t, i18n } = useTranslation();
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
                    {/* The slot is always filled, because an empty one is
                        read as a rendering fault rather than as a fact. A
                        post can genuinely be published with no date on it:
                        marking a manual publish without verifying the link
                        flips the status and writes no timestamp, so the
                        record has none to show. Saying so is the honest
                        answer — and it is the only way the user finds out
                        the date is missing rather than merely late. */}
                    <span
                      className="w-24 text-right"
                      title={
                        formatDate(
                          time,
                          { dateStyle: "long", timeStyle: "short" },
                          i18n.language,
                        ) ?? undefined
                      }
                    >
                      {time ? relativeTime(time) : t("campaignOverview.noDate")}
                    </span>
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
