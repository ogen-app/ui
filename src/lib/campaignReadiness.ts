// Pure derivations behind the Campaign Overview screen (CON-120): each
// module's posture (empty → needs-attention → healthy) and the prioritized
// attention list. Everything here is a pure function of already-fetched data —
// no fetching, no stores — so the rules stay unit-testable and easy to evolve.

import type { Campaign } from "@/types/campaigns";
import type { Post, PostStatus } from "@/types/posts";
import type { PlatformView } from "@/lib/platformDictionary";

// --- Brief ------------------------------------------------------------------

export type BriefField =
  | "description"
  | "target_persona"
  | "key_messages"
  | "tone_guidelines";

export const BRIEF_FIELD_LABELS: Record<BriefField, string> = {
  description: "Description",
  target_persona: "Target persona",
  key_messages: "Key messages",
  tone_guidelines: "Tone guidelines",
};

const BRIEF_FIELDS: BriefField[] = [
  "description",
  "target_persona",
  "key_messages",
  "tone_guidelines",
];

export type BriefPosture = {
  state: "empty" | "partial" | "complete";
  missing: BriefField[];
};

export function briefPosture(campaign: Campaign): BriefPosture {
  const missing = BRIEF_FIELDS.filter((f) => campaign[f].trim() === "");
  const state =
    missing.length === BRIEF_FIELDS.length
      ? "empty"
      : missing.length > 0
        ? "partial"
        : "complete";
  return { state, missing };
}

// --- Setup ------------------------------------------------------------------

/** Where an attention item / failed setup check sends the user to fix it. */
export type FixTarget =
  | "brief"
  | "settings"
  | "workspace-settings"
  | "posts"
  | "assets";

export type SetupCheck = {
  id: "dates" | "channels" | "accounts" | "post_target";
  ok: boolean;
  label: string;
  /** Shown for both states: what is configured, or what exactly is missing. */
  detail: string;
  fix: FixTarget;
};

const dateFormat = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDateRange(start: string, end: string): string {
  return `${dateFormat.format(new Date(start))} – ${dateFormat.format(new Date(end))}`;
}

/** Names of selected channels whose platform has no connected publisher. */
export function unconnectedChannelNames(
  campaign: Campaign,
  platformViews: PlatformView[],
): string[] {
  const viewById = new Map(platformViews.map((v) => [v.platform.id, v]));
  return campaign.target_platforms.flatMap((tp) => {
    const view = viewById.get(tp.id);
    // Unknown platform id (dictionary/API mismatch) counts as unconnected —
    // it certainly can't publish.
    if (!view) return ["Unknown channel"];
    return view.connectedPublishers.length > 0 ? [] : [view.info.name];
  });
}

export function setupChecks(
  campaign: Campaign,
  platformViews: PlatformView[],
): SetupCheck[] {
  const hasDates = !!campaign.start_date && !!campaign.end_date;
  const channelCount = campaign.target_platforms.length;
  const unconnected = unconnectedChannelNames(campaign, platformViews);
  const target = campaign.estimated_post_count;

  const checks: SetupCheck[] = [
    {
      id: "dates",
      ok: hasDates,
      label: "Campaign dates",
      detail: hasDates
        ? formatDateRange(campaign.start_date!, campaign.end_date!)
        : campaign.start_date || campaign.end_date
          ? "Only one of start/end is set"
          : "Not set",
      fix: "settings",
    },
    {
      id: "channels",
      ok: channelCount > 0,
      label: "Channels",
      detail:
        channelCount > 0
          ? `${channelCount} selected`
          : "No channels selected",
      fix: "settings",
    },
  ];

  // Account connectivity is only meaningful once channels are chosen; before
  // that the channels check already covers the gap.
  if (channelCount > 0) {
    checks.push({
      id: "accounts",
      ok: unconnected.length === 0,
      label: "Connected accounts",
      detail:
        unconnected.length === 0
          ? "All channels connected"
          : `Not connected: ${unconnected.join(", ")}`,
      fix: "workspace-settings",
    });
  }

  checks.push({
    id: "post_target",
    ok: target != null && target > 0,
    label: "Post target",
    detail:
      target != null && target > 0 ? `${target} posts planned` : "Not set",
    fix: "settings",
  });

  return checks;
}

// --- Content ----------------------------------------------------------------

export const SCHEDULED_STATUSES: PostStatus[] = [
  "scheduled",
  "scheduled_for_manual_publishing",
];

export type ContentSnapshot = {
  total: number;
  byStatus: Record<PostStatus, number>;
  /** Last published first, capped at `limit`. */
  recentlyPublished: Post[];
  /** Soonest scheduled_at first, capped at `limit`. */
  upNext: Post[];
};

export function contentSnapshot(posts: Post[], limit = 5): ContentSnapshot {
  const byStatus: Record<PostStatus, number> = {
    draft: 0,
    ready_for_publish: 0,
    scheduled: 0,
    scheduled_for_manual_publishing: 0,
    failed: 0,
    published: 0,
    not_published: 0,
  };
  for (const p of posts) byStatus[p.status] += 1;

  const recentlyPublished = posts
    .filter((p) => p.status === "published")
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))
    .slice(0, limit);

  const upNext = posts
    .filter((p) => SCHEDULED_STATUSES.includes(p.status) && p.scheduled_at)
    .sort((a, b) => a.scheduled_at!.localeCompare(b.scheduled_at!))
    .slice(0, limit);

  return { total: posts.length, byStatus, recentlyPublished, upNext };
}

export type ChannelProgress = {
  platformId: string;
  total: number;
  published: number;
};

/** Per-channel published/total, largest channels first. */
export function channelProgress(posts: Post[]): ChannelProgress[] {
  const byPlatform = new Map<string, ChannelProgress>();
  for (const p of posts) {
    if (!p.platform_id) continue;
    let entry = byPlatform.get(p.platform_id);
    if (!entry) {
      entry = { platformId: p.platform_id, total: 0, published: 0 };
      byPlatform.set(p.platform_id, entry);
    }
    entry.total += 1;
    if (p.status === "published") entry.published += 1;
  }
  return [...byPlatform.values()].sort((a, b) => b.total - a.total);
}

// --- Attention list ---------------------------------------------------------

export type AttentionItem = {
  id: string;
  /** `alert` = something went wrong; `todo` = something is not done yet. */
  severity: "alert" | "todo";
  label: string;
  actionLabel: string;
  fix: FixTarget;
};

/**
 * The prioritized to-do list for the attention rail. Rule order is the
 * product decision (CON-120 §6.2): failures first, then setup gaps in the
 * order a user would naturally complete them, then content gaps.
 */
export function attentionItems(
  campaign: Campaign,
  posts: Post[],
  platformViews: PlatformView[],
): AttentionItem[] {
  const items: AttentionItem[] = [];
  const brief = briefPosture(campaign);
  const snapshot = contentSnapshot(posts);
  const unconnected = unconnectedChannelNames(campaign, platformViews);

  if (snapshot.byStatus.failed > 0) {
    items.push({
      id: "failed-posts",
      severity: "alert",
      label:
        snapshot.byStatus.failed === 1
          ? "1 post failed to publish"
          : `${snapshot.byStatus.failed} posts failed to publish`,
      actionLabel: "Review posts",
      fix: "posts",
    });
  }

  if (brief.state === "empty") {
    items.push({
      id: "brief-empty",
      severity: "todo",
      label: "The brief is not filled in",
      actionLabel: "Start the brief",
      fix: "brief",
    });
  } else if (brief.state === "partial") {
    items.push({
      id: "brief-partial",
      severity: "todo",
      label: `Brief is missing: ${brief.missing.map((f) => BRIEF_FIELD_LABELS[f].toLowerCase()).join(", ")}`,
      actionLabel: "Complete the brief",
      fix: "brief",
    });
  }

  if (!campaign.start_date || !campaign.end_date) {
    items.push({
      id: "dates",
      severity: "todo",
      label: "Campaign dates are not set",
      actionLabel: "Set dates",
      fix: "settings",
    });
  }

  if (campaign.target_platforms.length === 0) {
    items.push({
      id: "channels",
      severity: "todo",
      label: "No channels selected",
      actionLabel: "Choose channels",
      fix: "settings",
    });
  } else if (unconnected.length > 0) {
    items.push({
      id: "accounts",
      severity: "todo",
      label: `No connected account for ${unconnected.join(", ")}`,
      actionLabel: "Connect accounts",
      fix: "workspace-settings",
    });
  }

  if (snapshot.total === 0) {
    items.push({
      id: "no-posts",
      severity: "todo",
      label: "No posts yet",
      actionLabel: "Add posts",
      fix: "posts",
    });
  } else {
    const phases = campaign.campaign_type?.phases ?? [];
    if (phases.length > 0) {
      const counts = new Map(phases.map((ph) => [ph.id, 0]));
      for (const p of posts) {
        if (p.campaign_type_phase_id && counts.has(p.campaign_type_phase_id)) {
          counts.set(
            p.campaign_type_phase_id,
            counts.get(p.campaign_type_phase_id)! + 1,
          );
        }
      }
      const empty = phases
        .filter((ph) => counts.get(ph.id) === 0)
        .map((ph) => ph.name);
      if (empty.length > 0) {
        items.push({
          id: "empty-phases",
          severity: "todo",
          label: `No content in ${empty.length === 1 ? "phase" : "phases"}: ${empty.join(", ")}`,
          actionLabel: "Add posts",
          fix: "posts",
        });
      }
    }

    const scheduledOrDone =
      snapshot.byStatus.scheduled +
      snapshot.byStatus.scheduled_for_manual_publishing +
      snapshot.byStatus.published;
    if (scheduledOrDone === 0 && snapshot.byStatus.draft > 0) {
      items.push({
        id: "nothing-scheduled",
        severity: "todo",
        label:
          snapshot.byStatus.draft === 1
            ? "1 draft, nothing scheduled yet"
            : `${snapshot.byStatus.draft} drafts, nothing scheduled yet`,
        actionLabel: "Schedule posts",
        fix: "posts",
      });
    }
  }

  return items;
}
