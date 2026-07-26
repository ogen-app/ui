import { describe, expect, it } from "vitest";
import type { Campaign, CampaignTypePhase, Platform } from "@/types/campaigns";
import type { Post, PostStatus } from "@/types/posts";
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

function makeView(id: string, name: string, connected: boolean): PlatformView {
  const platform = { id, name } as Platform;
  const info = { id, name } as PlatformInfo;
  const publisher = {
    id: `${id}-pub`,
    name: `${name} publisher`,
    state: "enabled",
    connected,
    supported_post_types: [],
    accounts: [],
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

describe("attentionItems", () => {
  it("walks a fresh campaign through brief → dates → channels → posts", () => {
    const items = attentionItems(makeCampaign(), [], []);
    expect(items.map((i) => i.id)).toEqual([
      "brief-empty",
      "dates",
      "channels",
      "no-posts",
    ]);
    expect(items.every((i) => i.severity === "todo")).toBe(true);
  });

  it("puts failed posts first, as an alert", () => {
    const items = attentionItems(makeCampaign(), [makePost({ status: "failed" })], []);
    expect(items[0]).toMatchObject({ id: "failed-posts", severity: "alert" });
  });

  it("reports phases with no content once posts exist", () => {
    const campaign = makeCampaign({
      ...filledBrief,
      start_date: "2026-06-01T00:00:00Z",
      end_date: "2026-08-31T00:00:00Z",
      estimated_post_count: 10,
      target_platforms: [{ id: "p1", post_types: [] }],
      campaign_type: {
        id: "ct1",
        name: "launch",
        label: "Launch",
        description: "",
        is_system: true,
        phases: [makePhase("ph1", "Warm-up", 1), makePhase("ph2", "Push", 2)],
      },
    });
    const posts = [
      makePost({ status: "published", campaign_type_phase_id: "ph1" }),
    ];
    const items = attentionItems(campaign, posts, [makeView("p1", "LinkedIn", true)]);
    expect(items.map((i) => i.id)).toEqual(["empty-phases"]);
    expect(items[0].label).toContain("Push");
  });

  it("nudges when there are only drafts and nothing was ever scheduled", () => {
    const items = attentionItems(
      makeCampaign(),
      [makePost({ status: "draft" }), makePost({ status: "draft" })],
      [],
    );
    expect(items.map((i) => i.id)).toContain("nothing-scheduled");
  });

  it("is empty for a healthy mid-campaign", () => {
    const campaign = makeCampaign({
      ...filledBrief,
      start_date: "2026-06-01T00:00:00Z",
      end_date: "2026-08-31T00:00:00Z",
      estimated_post_count: 10,
      target_platforms: [{ id: "p1", post_types: [] }],
    });
    const posts: Post[] = (
      ["published", "scheduled", "draft"] as PostStatus[]
    ).map((status) => makePost({ status }));
    expect(attentionItems(campaign, posts, [makeView("p1", "LinkedIn", true)])).toEqual([]);
  });
});
