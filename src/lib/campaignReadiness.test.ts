import { describe, expect, it } from "vitest";
import type { Campaign, CampaignTypePhase, Platform } from "@/types/campaigns";
import type { Post } from "@/types/posts";
import type { PlatformInfo, PlatformView } from "@/lib/platformDictionary";
import {
  attentionItems,
  briefPosture,
  channelProgress,
  contentSnapshot,
  setupChecks,
  unconnectedChannelNames,
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
  it("fails dates/channels/post target on a fresh campaign, and skips the accounts check", () => {
    const checks = setupChecks(makeCampaign(), []);
    expect(checks.map((c) => c.id)).toEqual(["dates", "channels", "post_target"]);
    expect(checks.every((c) => !c.ok)).toBe(true);
  });

  it("flags only one date being set", () => {
    const checks = setupChecks(
      makeCampaign({ start_date: "2026-06-01T00:00:00Z" }),
      [],
    );
    expect(checks[0].ok).toBe(false);
    expect(checks[0].detail).toBe("Only one of start/end is set");
  });

  it("passes everything on a configured campaign with connected channels", () => {
    const campaign = makeCampaign({
      start_date: "2026-06-01T00:00:00Z",
      end_date: "2026-08-31T00:00:00Z",
      target_platforms: [{ id: "p1", post_types: [] }],
      estimated_post_count: 24,
    });
    const checks = setupChecks(campaign, [makeView("p1", "LinkedIn", true)]);
    expect(checks.map((c) => c.id)).toEqual([
      "dates",
      "channels",
      "accounts",
      "post_target",
    ]);
    expect(checks.every((c) => c.ok)).toBe(true);
  });

  it("names the unconnected channels", () => {
    const campaign = makeCampaign({
      target_platforms: [
        { id: "p1", post_types: [] },
        { id: "p2", post_types: [] },
      ],
    });
    const views = [makeView("p1", "LinkedIn", true), makeView("p2", "Threads", false)];
    expect(unconnectedChannelNames(campaign, views)).toEqual(["Threads"]);
    const accounts = setupChecks(campaign, views).find((c) => c.id === "accounts")!;
    expect(accounts.ok).toBe(false);
    expect(accounts.detail).toContain("Threads");
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

describe("channelProgress", () => {
  it("aggregates per platform, largest first, skipping platform-less posts", () => {
    const posts = [
      makePost({ platform_id: "p1", status: "published" }),
      makePost({ platform_id: "p1", status: "draft" }),
      makePost({ platform_id: "p1", status: "draft" }),
      makePost({ platform_id: "p2", status: "published" }),
      makePost({ platform_id: "" }),
    ];
    expect(channelProgress(posts)).toEqual([
      { platformId: "p1", total: 3, published: 1 },
      { platformId: "p2", total: 1, published: 1 },
    ]);
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
    target_platforms: [{ id: "p1", post_types: [] }],
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

  it("flags posts scheduled outside the campaign dates", () => {
    const posts = [...healthyPosts(), makePost({ status: "scheduled", scheduled_at: "2026-09-20T10:00:00Z" })];
    expect(ids(liveCampaign(), posts)).toContain("scheduled-outside-window");
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
    expect(blocking.map((i) => i.id)).not.toContain("accounts-missing");
  });

  it("keeps a missing account a todo when nothing is scheduled against it", () => {
    const campaign = liveCampaign({
      target_platforms: [
        { id: "p1", post_types: [] },
        { id: "p2", post_types: [] },
      ],
    });
    const views = [makeView("p1", "LinkedIn", true), makeView("p2", "Threads", false)];
    const items = attentionItems(campaign, healthyPosts(), views, NOW);
    expect(items.find((i) => i.id === "accounts-missing")).toMatchObject({
      severity: "todo",
    });
    expect(items.map((i) => i.id)).not.toContain("accounts-missing-blocking");
  });

  it("flags a connected channel whose accounts are all inactive, and stays quiet when the payload is silent", () => {
    const inactive = [makeView("p1", "LinkedIn", true, [{ is_active: false }])];
    expect(ids(liveCampaign(), healthyPosts(), inactive)).toContain("account-inactive");
    // Empty `accounts` means "not stated", not "inactive".
    expect(ids(liveCampaign(), healthyPosts())).not.toContain("account-inactive");
  });

  // --- Setup ----------------------------------------------------------------

  it("flags assets enabled with none attached", () => {
    const campaign = liveCampaign({ use_assets: true });
    expect(ids(campaign, healthyPosts())).toContain("assets-expected");
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

  it("reports phases with no content once posts exist", () => {
    const campaign = liveCampaign({
      campaign_type: {
        id: "ct1",
        name: "launch",
        label: "Launch",
        description: "",
        is_system: true,
        phases: [makePhase("ph1", "Warm-up", 1), makePhase("ph2", "Push", 2)],
      },
    });
    const posts = healthyPosts().map((p) => ({ ...p, campaign_type_phase_id: "ph1" }));
    const item = attentionItems(campaign, posts, connected, NOW).find(
      (i) => i.id === "empty-phases",
    );
    expect(item!.label).toContain("Push");
    expect(item!.label).not.toContain("Warm-up");
  });

  it("flags a selected channel with no posts", () => {
    const campaign = liveCampaign({
      target_platforms: [
        { id: "p1", post_types: [] },
        { id: "p2", post_types: [] },
      ],
    });
    const views = [makeView("p1", "LinkedIn", true), makeView("p2", "Threads", true)];
    const item = attentionItems(campaign, healthyPosts(), views, NOW).find(
      (i) => i.id === "channel-uncovered",
    );
    expect(item!.label).toBe("No posts for Threads yet");
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
    expect(item!.label).toBe("Campaign is 49% through, 0% published");
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
