import { describe, expect, it } from "vitest";
import type { Campaign, CampaignTypePhase, Platform } from "@/types/campaigns";
import type { Post, PostSummary } from "@/types/posts";
import type { PlatformInfo, PlatformView } from "@/lib/platformDictionary";
import {
  attentionItems,
  briefPosture,
  channelReadiness,
  contentSnapshot,
  setupChecks,
} from "./campaignReadiness.ts";

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: "c1",
    name: "Launch",
    description: "",
    target_persona: "",
    key_messages: "",
    tone_guidelines: "",
    use_assets: false,
    asset_ids: [],
    target_platforms: [],
    campaign_type_id: "ct1",
    status: "draft",
    start_date: null,
    end_date: null,
    estimated_post_count: null,
    language: "en",
    budget: null,
    currency: "USD",
    tag_ids: [],
    tags: [],
    platforms: [],
    campaign_type: null,
    created_by: "u1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: Math.random().toString(36).slice(2),
    campaign_id: "c1",
    platform_id: "p1",
    platform_post_type: "text-post",
    social_account_id: "",
    title: "",
    content: "",
    media_urls: [],
    scheduled_at: null,
    published_at: null,
    status: "draft",
    cta_type: "none",
    cta_url: "",
    target_audience_notes: "",
    used_asset_ids: [],
    campaign_type_phase_id: null,
    created_by: "u1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    campaign: null,
    platform: null,
    used_assets: [],
    campaign_type_phase: null,
    ...overrides,
  };
}

function makeView(
  id: string,
  name: string,
  connected: boolean,
  accounts: { is_active: boolean }[] = [],
): PlatformView {
  const platform = { id, name } as Platform;
  const info = { id, name } as PlatformInfo;
  const publisher = {
    id: `${id}-pub`,
    name: `${name} publisher`,
    state: "enabled",
    connected,
    supported_post_types: [],
    accounts: accounts.map((a, i) => ({
      id: `${id}-acc-${i}`,
      username: "u",
      display_name: "U",
      avatar_url: "",
      is_active: a.is_active,
      connected_at: "2026-01-01T00:00:00Z",
    })),
  };
  return {
    platform,
    info,
    allowed: [],
    available: [],
    unavailable: [],
    publishers: [publisher],
    connectedPublishers: connected ? [publisher] : [],
    connectedPublisherName: connected ? publisher.name : null,
  };
}

function makePhase(id: string, name: string, sequence: number): CampaignTypePhase {
  return { id, campaign_type_id: "ct1", name, purpose: "", sequence };
}

const filledBrief = {
  description: "What it is",
  target_persona: "Who it's for",
  key_messages: "Why it matters",
  tone_guidelines: "How it sounds",
};

describe("briefPosture", () => {
  it("is empty when every field is blank (incl. whitespace-only)", () => {
    const posture = briefPosture(makeCampaign({ description: "   " }));
    expect(posture.state).toBe("empty");
    expect(posture.missing).toHaveLength(4);
  });

  it("is partial when some fields are filled", () => {
    const posture = briefPosture(
      makeCampaign({ description: "x", key_messages: "y" }),
    );
    expect(posture.state).toBe("partial");
    expect(posture.missing).toEqual(["target_persona", "tone_guidelines"]);
  });

  it("is complete when all fields are filled", () => {
    expect(briefPosture(makeCampaign(filledBrief)).state).toBe("complete");
  });
});

describe("setupChecks", () => {
  /** The channels row, which carries the composite channel logic. */
  function channelsCheck(campaign: Campaign, views: PlatformView[]) {
    return setupChecks(campaign, views).find((c) => c.id === "channels")!;
  }

  it("fails dates/channels/post target on a fresh campaign", () => {
    const checks = setupChecks(makeCampaign(), []);
    expect(checks.map((c) => c.id)).toEqual(["dates", "channels", "post_target"]);
    expect(checks.every((c) => !c.ok)).toBe(true);
    // A gap names itself in the label; the detail says what the setting is for.
    expect(checks.map((c) => c.label)).toEqual([
      "Campaign dates not set",
      "No channels selected",
      "Post target not set",
    ]);
    expect(checks.every((c) => c.detail.length > 0)).toBe(true);
  });

  it("flags only one date being set", () => {
    const checks = setupChecks(
      makeCampaign({ start_date: "2026-06-01T00:00:00Z" }),
      [],
    );
    expect(checks[0].ok).toBe(false);
    expect(checks[0].label).toBe("Campaign dates are incomplete");
  });

  it("passes everything on a configured campaign with connected channels", () => {
    const campaign = makeCampaign({
      start_date: "2026-06-01T00:00:00Z",
      end_date: "2026-08-31T00:00:00Z",
      target_platforms: [{ id: "p1", post_types: ["text-post"] }],
      estimated_post_count: 24,
    });
    const checks = setupChecks(campaign, [makeView("p1", "LinkedIn", true)]);
    expect(checks.map((c) => c.id)).toEqual(["dates", "channels", "post_target"]);
    expect(checks.every((c) => c.ok)).toBe(true);
    expect(checks[1].detail).toBe("Publishing to LinkedIn");
  });

  it("passes with an unconnected channel as long as one channel can publish", () => {
    const campaign = makeCampaign({
      target_platforms: [
        { id: "p1", post_types: ["text-post"] },
        { id: "p2", post_types: ["text-post"] },
      ],
    });
    const views = [makeView("p1", "LinkedIn", true), makeView("p2", "Threads", false)];
    expect(channelReadiness(campaign, views)).toMatchObject({
      connected: ["LinkedIn"],
      ready: ["LinkedIn"],
    });
    const check = channelsCheck(campaign, views);
    // Connecting Threads is the user's call, not a gap the campaign has.
    expect(check.ok).toBe(true);
    expect(check.detail).toBe("Publishing to LinkedIn (1 of 2 not ready)");
  });

  it("fails when no selected channel has a connected account", () => {
    const campaign = makeCampaign({
      target_platforms: [
        { id: "p1", post_types: ["text-post"] },
        { id: "p2", post_types: ["text-post"] },
      ],
    });
    const views = [makeView("p1", "LinkedIn", false), makeView("p2", "Threads", false)];
    const check = channelsCheck(campaign, views);
    expect(check.ok).toBe(false);
    expect(check.label).toBe("No connected account for LinkedIn, Threads");
    // Connecting an account happens outside the campaign.
    expect(check.fix).toBe("workspace-settings");
  });

  it("fails when the connected channels have no post type selected", () => {
    const campaign = makeCampaign({
      target_platforms: [
        { id: "p1", post_types: [] },
        { id: "p2", post_types: [] }, // not connected — post types are moot
      ],
    });
    const views = [makeView("p1", "LinkedIn", true), makeView("p2", "Threads", false)];
    expect(channelReadiness(campaign, views).missingPostTypes).toEqual(["LinkedIn"]);
    const check = channelsCheck(campaign, views);
    expect(check.ok).toBe(false);
    expect(check.label).toBe("No post type selected for LinkedIn");
    expect(check.fix).toBe("settings");
  });

  it("does not review connected channels the campaign did not select", () => {
    const campaign = makeCampaign({
      target_platforms: [{ id: "p1", post_types: ["text-post"] }],
    });
    // Four channels connected, one in use — a normal setup, not a gap.
    const views = [
      makeView("p1", "LinkedIn", true),
      makeView("p2", "Threads", true),
      makeView("p3", "Facebook", true),
      makeView("p4", "Instagram", true),
    ];
    expect(channelsCheck(campaign, views).ok).toBe(true);
    expect(channelsCheck(campaign, views).detail).toBe("Publishing to LinkedIn");
  });
});

describe("contentSnapshot", () => {
  it("counts statuses and caps + orders the lists", () => {
    const posts = [
      makePost({ status: "published", published_at: "2026-07-01T10:00:00Z", title: "old" }),
      makePost({ status: "published", published_at: "2026-07-20T10:00:00Z", title: "new" }),
      makePost({ status: "scheduled", scheduled_at: "2026-08-02T10:00:00Z", title: "later" }),
      makePost({ status: "scheduled_for_manual_publishing", scheduled_at: "2026-08-01T10:00:00Z", title: "sooner" }),
      makePost({ status: "draft" }),
      makePost({ status: "failed" }),
    ];
    const snapshot = contentSnapshot(posts, 1);
    expect(snapshot.total).toBe(6);
    expect(snapshot.byStatus.published).toBe(2);
    expect(snapshot.byStatus.failed).toBe(1);
    expect(snapshot.recentlyPublished.map((p) => p.title)).toEqual(["new"]);
    expect(snapshot.upNext.map((p) => p.title)).toEqual(["sooner"]);
  });
});

// --- Attention rules (docs/attention-rules.md) -------------------------------

const NOW = new Date("2026-07-15T12:00:00Z");
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** ISO timestamp `offset` ms away from the fixed `NOW`. */
function iso(offset: number): string {
  return new Date(NOW.getTime() + offset).toISOString();
}

/** A campaign that is live at `NOW` (Jun 1 – Aug 31, ~48% elapsed). */
function liveCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return makeCampaign({
    ...filledBrief,
    start_date: "2026-06-01T00:00:00Z",
    end_date: "2026-08-31T00:00:00Z",
    estimated_post_count: 10,
    target_platforms: [{ id: "p1", post_types: ["text-post"] }],
    ...overrides,
  });
}

const connected = [makeView("p1", "LinkedIn", true)];

/** The healthy baseline: on pace, one post going out inside the week. */
function healthyPosts(): Post[] {
  return [
    ...Array.from({ length: 5 }, () =>
      makePost({ status: "published", published_at: iso(-7 * DAY) }),
    ),
    makePost({ status: "scheduled", scheduled_at: iso(2 * DAY) }),
  ];
}

function ids(
  campaign: Campaign,
  posts: Post[],
  views = connected,
): string[] {
  return attentionItems(campaign, posts, views, NOW).map((i) => i.id);
}

describe("attentionItems", () => {
  it("walks a fresh campaign through brief → dates → channels → posts", () => {
    const items = attentionItems(makeCampaign(), [], [], NOW);
    expect(items.map((i) => i.id)).toEqual([
      "brief-empty",
      "dates",
      "channels",
      "no-posts",
    ]);
    expect(items.every((i) => i.severity === "todo")).toBe(true);
  });

  it("is empty for a healthy mid-campaign", () => {
    expect(attentionItems(liveCampaign(), healthyPosts(), connected, NOW)).toEqual([]);
  });

  it("sorts alerts before risks before todos before infos", () => {
    const campaign = liveCampaign({ estimated_post_count: null, use_assets: true });
    const posts = [
      makePost({ status: "failed" }),
      makePost({ status: "draft", scheduled_at: iso(3 * HOUR) }),
      makePost({ status: "draft", updated_at: iso(-30 * DAY) }),
    ];
    const items = attentionItems(campaign, posts, connected, NOW);
    const ranks = items.map((i) =>
      ["alert", "risk", "todo", "info"].indexOf(i.severity),
    );
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(items[0].id).toBe("failed-posts");
  });

  // --- Delivery -------------------------------------------------------------

  it("puts failed posts first, as an alert", () => {
    const items = attentionItems(makeCampaign(), [makePost({ status: "failed" })], [], NOW);
    expect(items[0]).toMatchObject({ id: "failed-posts", severity: "alert" });
  });

  it("separates a manual publish that is due from an auto slot that was missed", () => {
    const manual = attentionItems(
      liveCampaign(),
      [
        ...healthyPosts(),
        makePost({
          status: "scheduled_for_manual_publishing",
          scheduled_at: iso(-1 * HOUR),
        }),
      ],
      connected,
      NOW,
    ).find((i) => i.id === "manual-publish-due");
    expect(manual).toMatchObject({ severity: "alert" });
    expect(manual!.label).toContain("waiting for you");

    const auto = attentionItems(
      liveCampaign(),
      [...healthyPosts(), makePost({ status: "scheduled", scheduled_at: iso(-1 * HOUR) })],
      connected,
      NOW,
    ).find((i) => i.id === "auto-publish-overdue");
    expect(auto).toMatchObject({ severity: "alert" });
    expect(auto!.label).toContain("missed");
  });

  it("gives the publisher a grace period before calling a slot missed", () => {
    const posts = [
      ...healthyPosts(),
      makePost({ status: "scheduled", scheduled_at: iso(-5 * MINUTE) }),
    ];
    expect(ids(liveCampaign(), posts)).not.toContain("auto-publish-overdue");
  });

  it("flags posts that were never published", () => {
    const posts = [...healthyPosts(), makePost({ status: "not_published" })];
    expect(ids(liveCampaign(), posts)).toContain("not-published");
  });

  it("flags a post planned inside 24h that is still a draft, but not one planned later", () => {
    const soon = [...healthyPosts(), makePost({ status: "draft", scheduled_at: iso(3 * HOUR) })];
    expect(ids(liveCampaign(), soon)).toContain("planned-today-unscheduled");

    const later = [...healthyPosts(), makePost({ status: "draft", scheduled_at: iso(3 * DAY) })];
    expect(ids(liveCampaign(), later)).not.toContain("planned-today-unscheduled");
  });

  it("flags an empty pipeline while the campaign is live", () => {
    const noneSoon = healthyPosts().filter((p) => p.status === "published");
    expect(ids(liveCampaign(), noneSoon)).toContain("pipeline-gap");
    expect(ids(liveCampaign(), healthyPosts())).not.toContain("pipeline-gap");
  });

  it("does not add a pipeline gap on top of an empty campaign", () => {
    expect(ids(liveCampaign(), [])).not.toContain("pipeline-gap");
  });

  it("flags two posts crowding the same slot on one channel", () => {
    const posts = [
      ...healthyPosts(),
      makePost({ status: "scheduled", scheduled_at: iso(3 * DAY) }),
      makePost({ status: "scheduled", scheduled_at: iso(3 * DAY + 5 * MINUTE) }),
    ];
    const item = attentionItems(liveCampaign(), posts, connected, NOW).find(
      (i) => i.id === "slot-collision",
    );
    expect(item).toMatchObject({ severity: "info" });
    expect(item!.label).toBe("2 posts share a slot on LinkedIn");
  });

  // --- Connectivity ---------------------------------------------------------

  it("escalates a missing account to an alert once posts are scheduled against it", () => {
    const unconnected = [makeView("p1", "LinkedIn", false)];
    const blocking = attentionItems(
      liveCampaign(),
      healthyPosts(),
      unconnected,
      NOW,
    );
    expect(blocking.find((i) => i.id === "accounts-missing-blocking")).toMatchObject({
      severity: "alert",
    });
  });

  it("says nothing about an unconnected channel while another one can publish", () => {
    const campaign = liveCampaign({
      target_platforms: [
        { id: "p1", post_types: ["text-post"] },
        { id: "p2", post_types: ["text-post"] },
      ],
    });
    const views = [makeView("p1", "LinkedIn", true), makeView("p2", "Threads", false)];
    // Whether to connect Threads is the user's business.
    expect(ids(campaign, healthyPosts(), views)).not.toContain("no-connected-channel");
  });

  it("flags that nothing at all is connected", () => {
    const views = [makeView("p1", "LinkedIn", false)];
    const item = attentionItems(liveCampaign(), [], views, NOW).find(
      (i) => i.id === "no-connected-channel",
    );
    expect(item).toMatchObject({ severity: "todo", fix: "workspace-settings" });
  });

  it("flags a connected channel with no post type selected", () => {
    const campaign = liveCampaign({
      target_platforms: [{ id: "p1", post_types: [] }],
    });
    const item = attentionItems(campaign, healthyPosts(), connected, NOW).find(
      (i) => i.id === "no-post-types",
    );
    expect(item).toMatchObject({ severity: "todo", fix: "settings" });
    expect(item!.label).toBe("No post type selected for LinkedIn");
  });

  it("flags a connected channel whose accounts are all inactive, and stays quiet when the payload is silent", () => {
    const inactive = [makeView("p1", "LinkedIn", true, [{ is_active: false }])];
    expect(ids(liveCampaign(), healthyPosts(), inactive)).toContain("account-inactive");
    // Empty `accounts` means "not stated", not "inactive".
    expect(ids(liveCampaign(), healthyPosts())).not.toContain("account-inactive");
  });

  // --- Drift ----------------------------------------------------------------

  const twoChannels = [
    makeView("p1", "LinkedIn", true),
    makeView("p2", "Threads", true),
  ];
  /** LinkedIn (p1) content, but only Threads (p2) is still selected. */
  function droppedLinkedIn(): Campaign {
    return liveCampaign({ target_platforms: [{ id: "p2", post_types: ["text-post"] }] });
  }

  it("escalates a de-selected channel to an alert while posts are still queued on it", () => {
    const item = attentionItems(
      droppedLinkedIn(),
      healthyPosts(),
      twoChannels,
      NOW,
    ).find((i) => i.id === "channel-dropped-scheduled");
    expect(item).toMatchObject({ severity: "alert" });
    expect(item!.label).toBe(
      "1 post is scheduled on LinkedIn, which is no longer a campaign channel",
    );
  });

  it("keeps a de-selected channel a todo when nothing is queued on it", () => {
    const posts = [
      ...healthyPosts().filter((p) => p.status === "published"),
      makePost({ status: "draft", updated_at: iso(-1 * DAY) }),
    ];
    const items = attentionItems(droppedLinkedIn(), posts, twoChannels, NOW);
    expect(items.find((i) => i.id === "channel-dropped")).toMatchObject({
      severity: "todo",
      label: "1 post targets LinkedIn, which is no longer a campaign channel",
    });
    expect(items.map((i) => i.id)).not.toContain("channel-dropped-scheduled");
  });

  it("ignores posts already published on a de-selected channel", () => {
    const published = healthyPosts().filter((p) => p.status === "published");
    const items = ids(droppedLinkedIn(), published, twoChannels);
    expect(items).not.toContain("channel-dropped");
    expect(items).not.toContain("channel-dropped-scheduled");
  });

  it("says nothing about drift while no channels are selected", () => {
    const campaign = liveCampaign({ target_platforms: [] });
    const items = ids(campaign, healthyPosts(), twoChannels);
    expect(items).toContain("channels");
    expect(items).not.toContain("channel-dropped-scheduled");
    expect(items).not.toContain("channel-dropped");
  });

  it("flags posts scheduled outside the campaign dates", () => {
    const posts = [...healthyPosts(), makePost({ status: "scheduled", scheduled_at: "2026-09-20T10:00:00Z" })];
    expect(ids(liveCampaign(), posts)).toContain("scheduled-outside-window");
  });

  it("treats the end date as inclusive — the final day is still in-window", () => {
    // end_date is stored as the day's first instant (T00:00:00), but a post
    // scheduled later that same day is inside the campaign, not after it.
    const posts = [...healthyPosts(), makePost({ status: "scheduled", scheduled_at: "2026-08-31T18:00:00Z" })];
    expect(ids(liveCampaign(), posts)).not.toContain("scheduled-outside-window");
  });

  it("flags a post type the campaign no longer includes, and treats an empty selection as no restriction", () => {
    const restricted = liveCampaign({
      target_platforms: [{ id: "p1", post_types: ["image-post"] }],
    });
    const item = attentionItems(restricted, healthyPosts(), connected, NOW).find(
      (i) => i.id === "post-type-dropped",
    );
    expect(item).toMatchObject({ severity: "todo" });
    expect(item!.label).toBe(
      "1 post uses a post type the campaign no longer includes",
    );
    expect(ids(liveCampaign(), healthyPosts())).not.toContain("post-type-dropped");
  });

  it("flags posts left on a phase the campaign type no longer has", () => {
    const campaign = liveCampaign({
      campaign_type: {
        // Not a type the dictionary knows — the label below comes from
        // campaignTypeInfo's capitalize-the-slug fallback.
        id: "ct1",
        name: "launch",
        is_system: true,
        phases: [makePhase("ph1", "Warm-up", 1)],
      },
    });
    const posts = [
      ...healthyPosts(),
      makePost({ status: "draft", campaign_type_phase_id: "gone", updated_at: iso(-1 * DAY) }),
    ];
    const items = attentionItems(campaign, posts, connected, NOW);
    expect(items.find((i) => i.id === "phase-orphaned")).toMatchObject({
      severity: "todo",
      label: "1 post sits in a phase the Launch plan doesn't have",
    });
    expect(ids(campaign, healthyPosts())).not.toContain("phase-orphaned");
  });

  it("says nothing about phases for a campaign type that has none", () => {
    const campaign = liveCampaign({
      campaign_type: {
        id: "ct2",
        name: "evergreen",
        is_system: true,
        phases: [],
      },
    });
    const posts = healthyPosts().map((p) => ({ ...p, campaign_type_phase_id: "gone" }));
    expect(ids(campaign, posts)).not.toContain("phase-orphaned");
  });

  // --- Setup ----------------------------------------------------------------

  it("says nothing about an empty asset list — that is the All assets mode", () => {
    const campaign = liveCampaign({ use_assets: true });
    expect(ids(campaign, healthyPosts())).not.toContain("assets-expected");
  });

  it("mentions a missing post target only as info, once content exists", () => {
    const campaign = liveCampaign({ estimated_post_count: null });
    const item = attentionItems(campaign, healthyPosts(), connected, NOW).find(
      (i) => i.id === "post-target",
    );
    expect(item).toMatchObject({ severity: "info" });
    expect(ids(liveCampaign({ estimated_post_count: null }), [])).not.toContain("post-target");
  });

  // --- Content --------------------------------------------------------------

  it("flags posts that are ready but not scheduled", () => {
    const posts = [...healthyPosts(), makePost({ status: "ready_for_publish" })];
    expect(ids(liveCampaign(), posts)).toContain("ready-not-scheduled");
  });

  it("nudges when there are only drafts and nothing was ever scheduled", () => {
    const items = ids(makeCampaign(), [
      makePost({ status: "draft" }),
      makePost({ status: "draft" }),
    ], []);
    expect(items).toContain("nothing-scheduled");
  });

  it("does not repeat the empty pipeline as a drafts nudge on a live campaign", () => {
    const items = ids(liveCampaign(), [
      makePost({ status: "draft", updated_at: iso(-1 * DAY) }),
    ]);
    expect(items).toContain("pipeline-gap");
    expect(items).not.toContain("nothing-scheduled");
  });

  it("flags a connected channel with no posts, and stays quiet about an unconnected one", () => {
    const campaign = liveCampaign({
      target_platforms: [
        { id: "p1", post_types: ["text-post"] },
        { id: "p2", post_types: ["text-post"] },
      ],
    });
    const views = [makeView("p1", "LinkedIn", true), makeView("p2", "Threads", true)];
    const item = attentionItems(campaign, healthyPosts(), views, NOW).find(
      (i) => i.id === "channel-uncovered",
    );
    expect(item!.label).toBe("No posts for Threads yet");

    // Nowhere to publish it — asking for content there is premature.
    const offline = [makeView("p1", "LinkedIn", true), makeView("p2", "Threads", false)];
    expect(ids(campaign, healthyPosts(), offline)).not.toContain("channel-uncovered");
  });

  it("flags a campaign that is publishing behind its own pace", () => {
    const posts = [
      makePost({ status: "scheduled", scheduled_at: iso(2 * DAY) }),
      makePost({ status: "draft", updated_at: iso(-1 * DAY) }),
    ];
    const item = attentionItems(liveCampaign(), posts, connected, NOW).find(
      (i) => i.id === "behind-pace",
    );
    expect(item).toMatchObject({ severity: "risk" });
    // 48, not 49: the end day itself counts, so the window is a day longer
    // than the raw timestamp difference.
    expect(item!.label).toBe("Campaign is 48% through, 0% published");
    expect(ids(liveCampaign(), healthyPosts())).not.toContain("behind-pace");
  });

  it("suppresses every content rule on an empty campaign", () => {
    expect(ids(liveCampaign(), [])).toEqual(["no-posts"]);
  });

  // --- Hygiene --------------------------------------------------------------

  it("flags unpublished posts left over after the campaign ended", () => {
    const campaign = liveCampaign({
      start_date: "2026-01-01T00:00:00Z",
      end_date: "2026-06-30T00:00:00Z",
    });
    const posts = [makePost({ status: "draft", updated_at: iso(-1 * DAY) })];
    expect(ids(campaign, posts)).toContain("campaign-ended-open-items");
  });

  it("flags drafts nobody has touched in two weeks", () => {
    const posts = [...healthyPosts(), makePost({ status: "draft", updated_at: iso(-30 * DAY) })];
    const item = attentionItems(liveCampaign(), posts, connected, NOW).find(
      (i) => i.id === "stale-drafts",
    );
    expect(item).toMatchObject({ severity: "info" });
    expect(ids(liveCampaign(), [...healthyPosts(), makePost({ status: "draft", updated_at: iso(-1 * DAY) })])).not.toContain("stale-drafts");
  });
});

/**
 * The Campaigns list feeds these rules the server's slim projection while the
 * Overview feeds them full posts (CON-152). AC-2 is that both read the same —
 * "a list that scored campaigns its own way would quietly disagree with the
 * screen behind it" — so the projection is the thing under test here.
 */
describe("PostSummary parity", () => {
  /** Mirrors the server's `projectPost` (campaign_actions/summaries). */
  function toSummary(p: Post): PostSummary {
    return {
      id: p.id,
      campaign_id: p.campaign_id,
      status: p.status,
      scheduled_at: p.scheduled_at,
      published_at: p.published_at,
      platform_id: p.platform_id,
      platform_post_type: p.platform_post_type,
      campaign_type_phase_id: p.campaign_type_phase_id,
      media_urls: p.media_urls,
      created_at: p.created_at,
      updated_at: p.updated_at,
    };
  }

  /** A campaign with something wrong in several rule families at once. */
  const messy = () => [
    ...healthyPosts(),
    makePost({ status: "failed" }),
    makePost({ status: "draft", scheduled_at: iso(3 * HOUR) }),
    makePost({ status: "draft", updated_at: iso(-30 * DAY) }),
    makePost({ status: "scheduled", scheduled_at: iso(2 * DAY + MINUTE) }),
  ];

  it("scores a projection exactly as it scores full posts", () => {
    const campaign = liveCampaign();
    const posts = messy();

    const fromFull = attentionItems(campaign, posts, connected, NOW);
    const fromSlim = attentionItems(campaign, posts.map(toSummary), connected, NOW);

    expect(fromSlim).toEqual(fromFull);
    // Guard against the test passing because both sides found nothing.
    expect(fromFull.length).toBeGreaterThan(0);
  });

  it("counts a projection exactly as it counts full posts", () => {
    const posts = messy();
    const full = contentSnapshot(posts);
    const slim = contentSnapshot(posts.map(toSummary));

    expect(slim.total).toBe(full.total);
    expect(slim.readyToGo).toBe(full.readyToGo);
    expect(slim.notReady).toBe(full.notReady);
    expect(slim.byStatus).toEqual(full.byStatus);
    expect(slim.upNext.map((p) => p.id)).toEqual(full.upNext.map((p) => p.id));
    expect(slim.recentlyPublished.map((p) => p.id)).toEqual(
      full.recentlyPublished.map((p) => p.id),
    );
  });

  it("runs on rows that carry nothing but the projected fields", () => {
    // Not a full Post with extras stripped by the type — an object that
    // genuinely has no title, content or relations at runtime. If a rule ever
    // reaches for one, this throws rather than reading undefined.
    const bare: PostSummary = {
      id: "po1",
      campaign_id: "c1",
      status: "failed",
      scheduled_at: null,
      published_at: null,
      platform_id: "p1",
      platform_post_type: "text-post",
      campaign_type_phase_id: null,
      media_urls: [],
      created_at: "2026-07-01T00:00:00Z",
      updated_at: "2026-07-01T00:00:00Z",
    };
    expect(Object.keys(bare)).toHaveLength(11);

    const items = attentionItems(liveCampaign(), [bare], connected, NOW);
    expect(items.map((i) => i.id)).toContain("failed-posts");
    expect(contentSnapshot([bare]).byStatus.failed).toBe(1);
  });
});
