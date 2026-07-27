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

// The rule set is specified in docs/attention-rules.md — that file is the
// contract. Every rule below appears there with its severity, family, and
// trigger; add the rule to the doc before adding it here.

export type AttentionSeverity = "alert" | "risk" | "todo" | "info";

export type AttentionItem = {
  id: string;
  /**
   * `alert` = already wrong · `risk` = wrong soon, on a clock ·
   * `todo` = a gap with no deadline · `info` = a hygiene nudge.
   */
  severity: AttentionSeverity;
  label: string;
  actionLabel: string;
  fix: FixTarget;
};

/** Rows the rail shows before collapsing the rest behind "+N more". */
export const MAX_ATTENTION_ITEMS = 6;

const SEVERITY_RANK: Record<AttentionSeverity, number> = {
  alert: 0,
  risk: 1,
  todo: 2,
  info: 3,
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Absorbs normal publisher-worker latency and the in-flight window of a
 * `cancel` before we call an auto-publish slot missed. Reconcile with the
 * worker's poll interval when the backend confirms it.
 */
const AUTO_PUBLISH_GRACE = 15 * MINUTE;
/** "Due today" is a rolling window, not a calendar day — no timezone to guess. */
const IMMINENT_WINDOW = 24 * HOUR;
const PIPELINE_WINDOW = 7 * DAY;
const SLOT_COLLISION_WINDOW = 15 * MINUTE;
const STALE_DRAFT_AGE = 14 * DAY;
/** Percentage points of "elapsed minus published" that count as behind pace. */
const PACE_LAG_POINTS = 25;

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function slotOf(post: Post): number | null {
  return post.scheduled_at ? Date.parse(post.scheduled_at) : null;
}

/** Still expecting to go out: anything the publisher hasn't finished with. */
function isOpen(status: PostStatus): boolean {
  return status !== "published" && status !== "not_published";
}

/**
 * The prioritized to-do list for the attention rail, sorted by severity and,
 * within a severity, by the catalogue order of docs/attention-rules.md (the
 * order a user would naturally work through). `now` is a parameter, never read
 * from the clock in here, so every time-based rule stays testable.
 */
export function attentionItems(
  campaign: Campaign,
  posts: Post[],
  platformViews: PlatformView[],
  now: Date,
): AttentionItem[] {
  const items: AttentionItem[] = [];
  const nowMs = now.getTime();
  const brief = briefPosture(campaign);
  const snapshot = contentSnapshot(posts);
  const viewById = new Map(platformViews.map((v) => [v.platform.id, v]));
  const channelName = (id: string) =>
    viewById.get(id)?.info.name ?? "Unknown channel";

  const startMs = campaign.start_date ? Date.parse(campaign.start_date) : null;
  const endMs = campaign.end_date ? Date.parse(campaign.end_date) : null;
  const isLive =
    startMs != null && endMs != null && nowMs >= startMs && nowMs <= endMs;

  // --- Delivery -------------------------------------------------------------

  if (snapshot.byStatus.failed > 0) {
    items.push({
      id: "failed-posts",
      severity: "alert",
      label: `${plural(snapshot.byStatus.failed, "post", "posts")} failed to publish`,
      actionLabel: "Review posts",
      fix: "posts",
    });
  }

  // A task: the user has to go and publish these themselves.
  const manualDue = posts.filter((p) => {
    const slot = slotOf(p);
    return (
      p.status === "scheduled_for_manual_publishing" &&
      slot != null &&
      slot <= nowMs
    );
  }).length;
  if (manualDue > 0) {
    items.push({
      id: "manual-publish-due",
      severity: "alert",
      label: `${plural(manualDue, "post", "posts")} ${manualDue === 1 ? "is" : "are"} waiting for you to publish`,
      actionLabel: "Publish now",
      fix: "posts",
    });
  }

  // A symptom: the worker should have published these and didn't. Deliberately
  // worded without blaming the user — they can't fix it from the post editor.
  const autoOverdue = posts.filter((p) => {
    const slot = slotOf(p);
    return (
      p.status === "scheduled" &&
      slot != null &&
      slot < nowMs - AUTO_PUBLISH_GRACE
    );
  }).length;
  if (autoOverdue > 0) {
    items.push({
      id: "auto-publish-overdue",
      severity: "alert",
      label: `${plural(autoOverdue, "post", "posts")} missed ${autoOverdue === 1 ? "its" : "their"} publishing slot`,
      actionLabel: "Check posts",
      fix: "posts",
    });
  }

  if (snapshot.byStatus.not_published > 0) {
    items.push({
      id: "not-published",
      severity: "alert",
      label: `${plural(snapshot.byStatus.not_published, "post", "posts")} ${snapshot.byStatus.not_published === 1 ? "was" : "were"} never published`,
      actionLabel: "Review posts",
      fix: "posts",
    });
  }

  // Planned for the next 24h but never actually scheduled — the client-side
  // half of `publish-blocked-soon`, which needs server validation.
  const plannedUnscheduled = posts.filter((p) => {
    const slot = slotOf(p);
    return (
      (p.status === "draft" || p.status === "ready_for_publish") &&
      slot != null &&
      slot >= nowMs &&
      slot <= nowMs + IMMINENT_WINDOW
    );
  }).length;
  if (plannedUnscheduled > 0) {
    items.push({
      id: "planned-today-unscheduled",
      severity: "risk",
      label: `${plural(plannedUnscheduled, "post", "posts")} planned for today ${plannedUnscheduled === 1 ? "isn't" : "aren't"} scheduled yet`,
      actionLabel: "Schedule posts",
      fix: "posts",
    });
  }

  let pipelineGap = false;
  if (isLive && snapshot.total > 0) {
    const goingOutSoon = posts.some((p) => {
      const slot = slotOf(p);
      return (
        SCHEDULED_STATUSES.includes(p.status) &&
        slot != null &&
        slot >= nowMs &&
        slot <= nowMs + PIPELINE_WINDOW
      );
    });
    if (!goingOutSoon) {
      pipelineGap = true;
      items.push({
        id: "pipeline-gap",
        severity: "risk",
        label: "Nothing scheduled for the next 7 days",
        actionLabel: "Schedule posts",
        fix: "posts",
      });
    }
  }

  const collisions = slotCollisions(posts);
  if (collisions.count > 0) {
    items.push({
      id: "slot-collision",
      severity: "info",
      label: `${plural(collisions.count, "post", "posts")} share a slot on ${collisions.platformIds.map(channelName).join(", ")}`,
      actionLabel: "Review posts",
      fix: "posts",
    });
  }

  // --- Connectivity ---------------------------------------------------------
  // A channel with no connected account is setup work on its own, but a queue
  // of guaranteed failures once posts are scheduled against it. Same gap, two
  // temperatures — only one fires per channel.

  const blocked: { name: string; scheduled: number }[] = [];
  const missing: string[] = [];
  const inactive: string[] = [];

  for (const tp of campaign.target_platforms) {
    const view = viewById.get(tp.id);
    const name = view?.info.name ?? "Unknown channel";
    // Unknown platform id (dictionary/API mismatch) counts as unconnected —
    // it certainly can't publish.
    const connected = (view?.connectedPublishers.length ?? 0) > 0;
    if (!connected) {
      const scheduled = posts.filter(
        (p) => p.platform_id === tp.id && SCHEDULED_STATUSES.includes(p.status),
      ).length;
      if (scheduled > 0) blocked.push({ name, scheduled });
      else missing.push(name);
      continue;
    }
    // An empty `accounts` array means the payload didn't say — only an
    // explicitly all-inactive publisher is a problem we can name.
    const allInactive = (view?.connectedPublishers ?? []).some(
      (pub) => pub.accounts.length > 0 && pub.accounts.every((a) => !a.is_active),
    );
    if (allInactive) inactive.push(name);
  }

  if (blocked.length > 0) {
    const total = blocked.reduce((sum, b) => sum + b.scheduled, 0);
    items.push({
      id: "accounts-missing-blocking",
      severity: "alert",
      label:
        blocked.length === 1
          ? `${blocked[0].name} has ${plural(total, "scheduled post", "scheduled posts")} but no connected account`
          : `${plural(total, "scheduled post", "scheduled posts")} on ${blocked.map((b) => b.name).join(", ")} have no connected account`,
      actionLabel: "Connect accounts",
      fix: "workspace-settings",
    });
  }

  if (inactive.length > 0) {
    items.push({
      id: "account-inactive",
      severity: "alert",
      label:
        inactive.length === 1
          ? `${inactive[0]}'s account is inactive`
          : `Accounts are inactive for ${inactive.join(", ")}`,
      actionLabel: "Reconnect",
      fix: "workspace-settings",
    });
  }

  if (missing.length > 0) {
    items.push({
      id: "accounts-missing",
      severity: "todo",
      label: `No connected account for ${missing.join(", ")}`,
      actionLabel: "Connect accounts",
      fix: "workspace-settings",
    });
  }

  // --- Drift ----------------------------------------------------------------
  // The campaign was edited after its posts were made. Nothing reconciles the
  // two, and the publisher never consults `target_platforms` — it publishes the
  // post's own `platform_id`. So de-selecting a channel changes the plan, not
  // the queue, and the queue is the part that can still surprise the user.
  // Only open posts count: a published post under old settings is history.
  //
  // Suppressed with no channels selected — then everything is adrift and
  // `channels` is the row that says so.

  if (campaign.target_platforms.length > 0) {
    const selected = new Map(
      campaign.target_platforms.map((tp) => [tp.id, tp.post_types]),
    );

    // Same gap at two temperatures, one row per channel: a queue behind it
    // makes it an alert, no queue makes it cleanup.
    const droppedQueued = new Map<string, number>();
    const droppedOpen = new Map<string, number>();
    for (const p of posts) {
      if (!p.platform_id || selected.has(p.platform_id) || !isOpen(p.status)) {
        continue;
      }
      const bucket = SCHEDULED_STATUSES.includes(p.status)
        ? droppedQueued
        : droppedOpen;
      bucket.set(p.platform_id, (bucket.get(p.platform_id) ?? 0) + 1);
    }
    for (const id of droppedQueued.keys()) droppedOpen.delete(id);

    if (droppedQueued.size > 0) {
      const names = [...droppedQueued.keys()].map(channelName);
      const total = [...droppedQueued.values()].reduce((a, b) => a + b, 0);
      items.push({
        id: "channel-dropped-scheduled",
        severity: "alert",
        label:
          names.length === 1
            ? `${plural(total, "post", "posts")} ${total === 1 ? "is" : "are"} scheduled on ${names[0]}, which is no longer a campaign channel`
            : `${plural(total, "scheduled post", "scheduled posts")} target channels the campaign no longer includes: ${names.join(", ")}`,
        actionLabel: "Review posts",
        fix: "posts",
      });
    }

    if (droppedOpen.size > 0) {
      const names = [...droppedOpen.keys()].map(channelName);
      const total = [...droppedOpen.values()].reduce((a, b) => a + b, 0);
      items.push({
        id: "channel-dropped",
        severity: "todo",
        label:
          names.length === 1
            ? `${plural(total, "post", "posts")} ${total === 1 ? "targets" : "target"} ${names[0]}, which is no longer a campaign channel`
            : `${plural(total, "post", "posts")} target channels the campaign no longer includes: ${names.join(", ")}`,
        actionLabel: "Review posts",
        fix: "posts",
      });
    }

    if (startMs != null && endMs != null) {
      const outside = posts.filter((p) => {
        const slot = slotOf(p);
        return (
          isOpen(p.status) && slot != null && (slot < startMs || slot > endMs)
        );
      }).length;
      if (outside > 0) {
        items.push({
          id: "scheduled-outside-window",
          severity: "todo",
          label: `${plural(outside, "post", "posts")} ${outside === 1 ? "is" : "are"} scheduled outside the campaign dates`,
          actionLabel: "Review posts",
          fix: "posts",
        });
      }
    }

    // An empty `post_types` selection means "no restriction", not "none".
    const wrongType = posts.filter((p) => {
      const allowed = selected.get(p.platform_id);
      return (
        isOpen(p.status) &&
        allowed != null &&
        allowed.length > 0 &&
        !!p.platform_post_type &&
        !allowed.includes(p.platform_post_type)
      );
    }).length;
    if (wrongType > 0) {
      items.push({
        id: "post-type-dropped",
        severity: "todo",
        label: `${plural(wrongType, "post", "posts")} ${wrongType === 1 ? "uses" : "use"} a post type the campaign no longer includes`,
        actionLabel: "Review posts",
        fix: "posts",
      });
    }
  }

  // Switching the campaign type leaves posts pointing at phases that no longer
  // exist — they silently fall out of the plan (and out of the phase chart).
  const phases = campaign.campaign_type?.phases ?? [];
  if (phases.length > 0) {
    const phaseIds = new Set(phases.map((ph) => ph.id));
    const orphaned = posts.filter(
      (p) =>
        isOpen(p.status) &&
        p.campaign_type_phase_id &&
        !phaseIds.has(p.campaign_type_phase_id),
    ).length;
    if (orphaned > 0) {
      items.push({
        id: "phase-orphaned",
        severity: "todo",
        label: `${plural(orphaned, "post", "posts")} ${orphaned === 1 ? "is" : "are"} assigned to a phase that is no longer in the plan`,
        actionLabel: "Reassign posts",
        fix: "posts",
      });
    }
  }

  // --- Setup ----------------------------------------------------------------

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

  // No channels at all is the parent gap — it suppresses the connectivity
  // rules above, which have nothing to report without a selection.
  if (campaign.target_platforms.length === 0) {
    items.push({
      id: "channels",
      severity: "todo",
      label: "No channels selected",
      actionLabel: "Choose channels",
      fix: "settings",
    });
  }

  if (campaign.use_assets && campaign.asset_ids.length === 0) {
    items.push({
      id: "assets-expected",
      severity: "todo",
      label: "Assets are enabled but none are attached",
      actionLabel: "Attach assets",
      fix: "assets",
    });
  }

  if (snapshot.total > 0 && !campaign.estimated_post_count) {
    items.push({
      id: "post-target",
      severity: "info",
      label: "No post target set",
      actionLabel: "Set a target",
      fix: "settings",
    });
  }

  // --- Content --------------------------------------------------------------
  // An empty campaign gets one row, not six: `no-posts` suppresses every other
  // content rule (and `pipeline-gap` above).

  if (snapshot.total === 0) {
    items.push({
      id: "no-posts",
      severity: "todo",
      label: "No posts yet",
      actionLabel: "Add posts",
      fix: "posts",
    });
  } else {
    if (snapshot.byStatus.ready_for_publish > 0) {
      items.push({
        id: "ready-not-scheduled",
        severity: "todo",
        label: `${plural(snapshot.byStatus.ready_for_publish, "post", "posts")} ${snapshot.byStatus.ready_for_publish === 1 ? "is" : "are"} ready but not scheduled`,
        actionLabel: "Schedule posts",
        fix: "posts",
      });
    }

    // `pipeline-gap` already said nothing is going out, and said it with a
    // deadline attached — don't say it twice in different words.
    const scheduledOrDone =
      snapshot.byStatus.scheduled +
      snapshot.byStatus.scheduled_for_manual_publishing +
      snapshot.byStatus.published;
    if (!pipelineGap && scheduledOrDone === 0 && snapshot.byStatus.draft > 0) {
      items.push({
        id: "nothing-scheduled",
        severity: "todo",
        label: `${plural(snapshot.byStatus.draft, "draft", "drafts")}, nothing scheduled yet`,
        actionLabel: "Schedule posts",
        fix: "posts",
      });
    }

    const emptyPhases = emptyPhaseNames(campaign, posts);
    if (emptyPhases.length > 0) {
      items.push({
        id: "empty-phases",
        severity: "todo",
        label: `No content in ${emptyPhases.length === 1 ? "phase" : "phases"}: ${emptyPhases.join(", ")}`,
        actionLabel: "Add posts",
        fix: "posts",
      });
    }

    const uncovered = campaign.target_platforms
      .filter((tp) => !posts.some((p) => p.platform_id === tp.id))
      .map((tp) => channelName(tp.id));
    if (uncovered.length > 0) {
      items.push({
        id: "channel-uncovered",
        severity: "todo",
        label: `No posts for ${uncovered.join(", ")} yet`,
        actionLabel: "Add posts",
        fix: "posts",
      });
    }

    // Pace is measured against the plan when there is one, otherwise against
    // the posts that exist — so it still means something before a target is set.
    if (isLive && endMs! > startMs!) {
      const planned = campaign.estimated_post_count || snapshot.total;
      const elapsed = ((nowMs - startMs!) / (endMs! - startMs!)) * 100;
      const done = (snapshot.byStatus.published / planned) * 100;
      if (elapsed - done > PACE_LAG_POINTS) {
        items.push({
          id: "behind-pace",
          severity: "risk",
          label: `Campaign is ${Math.round(elapsed)}% through, ${Math.round(done)}% published`,
          actionLabel: "Review posts",
          fix: "posts",
        });
      }
    }
  }

  // --- Hygiene --------------------------------------------------------------

  if (endMs != null && nowMs > endMs) {
    const open = posts.filter((p) => isOpen(p.status)).length;
    if (open > 0) {
      items.push({
        id: "campaign-ended-open-items",
        severity: "todo",
        label: `Campaign ended with ${plural(open, "unpublished post", "unpublished posts")}`,
        actionLabel: "Review posts",
        fix: "posts",
      });
    }
  }

  const staleDrafts = posts.filter(
    (p) =>
      p.status === "draft" &&
      Date.parse(p.updated_at) < nowMs - STALE_DRAFT_AGE,
  ).length;
  if (staleDrafts > 0) {
    items.push({
      id: "stale-drafts",
      severity: "info",
      label: `${plural(staleDrafts, "draft", "drafts")} untouched for two weeks`,
      actionLabel: "Review drafts",
      fix: "posts",
    });
  }

  // Stable sort: severity decides, catalogue order breaks ties.
  return items.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

/** Names of campaign-type phases that no post is assigned to. */
function emptyPhaseNames(campaign: Campaign, posts: Post[]): string[] {
  const phases = campaign.campaign_type?.phases ?? [];
  if (phases.length === 0) return [];
  const used = new Set(
    posts.map((p) => p.campaign_type_phase_id).filter(Boolean),
  );
  return phases.filter((ph) => !used.has(ph.id)).map((ph) => ph.name);
}

/**
 * Posts crowding the same channel: two or more open posts scheduled within
 * `SLOT_COLLISION_WINDOW` of each other. Returns how many posts are involved
 * and on which channels.
 */
function slotCollisions(posts: Post[]): {
  count: number;
  platformIds: string[];
} {
  const byPlatform = new Map<string, number[]>();
  for (const p of posts) {
    const slot = slotOf(p);
    if (!isOpen(p.status) || slot == null || Number.isNaN(slot)) continue;
    const slots = byPlatform.get(p.platform_id) ?? [];
    slots.push(slot);
    byPlatform.set(p.platform_id, slots);
  }

  let count = 0;
  const platformIds: string[] = [];
  for (const [platformId, slots] of byPlatform) {
    slots.sort((a, b) => a - b);
    const colliding = new Set<number>();
    for (let i = 1; i < slots.length; i++) {
      if (slots[i] - slots[i - 1] <= SLOT_COLLISION_WINDOW) {
        colliding.add(i - 1);
        colliding.add(i);
      }
    }
    if (colliding.size > 0) {
      count += colliding.size;
      platformIds.push(platformId);
    }
  }
  return { count, platformIds };
}
