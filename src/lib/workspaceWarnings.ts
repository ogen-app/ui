import {
  ATTENTION_SEVERITY_RANK,
  attentionItems,
  type AttentionItem,
  type AttentionSeverity,
} from '@/lib/campaignReadiness'
import type { Campaign } from '@/types/campaigns'
import type { PostSummary } from '@/types/posts'
import type { PlatformView } from '@/lib/platformDictionary'

/**
 * The workspace's warnings (CON-225) — every campaign's open conditions in one
 * prioritised list.
 *
 * **A warning is not a task.** It is a *level*: a condition that is true while
 * it is true and stops existing the moment it is fixed. Nobody owns it, it has
 * no history, and there is nothing to complete. A task is a record someone —
 * or the system, watching these — created about it, and it outlives the
 * condition (`lib/tasks.ts`). The distinction is the whole design; see
 * `docs/activity.md`.
 *
 * Nothing here is new judgement. `attentionItems` already scores one campaign
 * against the rule set in `docs/attention-rules.md`, and the Overview's rail
 * and every card on the Campaigns list run it; this only runs it across the
 * whole workspace and merges the results into one prioritised list. A second
 * scoring pass would quietly disagree with the screens behind it.
 */
export type WorkspaceWarning = {
  /** Unique across the workspace — the rule's id is only unique per campaign. */
  id: string
  campaignId: string
  campaignName: string
  severity: AttentionSeverity
  item: AttentionItem
}

/**
 * Every campaign's open items, worst first.
 *
 * Ordering is severity first and the campaigns' own order second, so a
 * failure in the last campaign still outranks a hygiene nudge in the first —
 * the list is read top-down as "what to do next", not as a per-campaign
 * digest. Within one campaign and severity, `attentionItems`' own order (the
 * catalogue order of `attention-rules.md`) survives.
 */
export function workspaceWarnings(
  campaigns: Campaign[],
  summaries: Record<string, PostSummary[]>,
  platformViews: PlatformView[],
  now: Date = new Date(),
): WorkspaceWarning[] {
  const found: { warning: WorkspaceWarning; campaignIndex: number; index: number }[] = []

  campaigns.forEach((campaign, campaignIndex) => {
    // The server omits campaigns with no posts, so a missing id means "none",
    // never "not loaded" — the caller waits for the query before calling here.
    const posts = summaries[campaign.id] ?? []
    for (const item of attentionItems(campaign, posts, platformViews, now)) {
      found.push({
        warning: {
          id: `${campaign.id}:${item.id}`,
          campaignId: campaign.id,
          campaignName: campaign.name.trim(),
          severity: item.severity,
          item,
        },
        campaignIndex,
        index: found.length,
      })
    }
  })

  return found
    .sort((a, b) => {
      const bySeverity =
        ATTENTION_SEVERITY_RANK[a.warning.severity] - ATTENTION_SEVERITY_RANK[b.warning.severity]
      if (bySeverity !== 0) return bySeverity
      const byCampaign = a.campaignIndex - b.campaignIndex
      if (byCampaign !== 0) return byCampaign
      // A stable tail: equal keys keep the order `attentionItems` produced.
      return a.index - b.index
    })
    .map(({ warning }) => warning)
}

/** How many warnings are already-wrong rather than hygiene nudges. */
export function alertWarningCount(warnings: WorkspaceWarning[]): number {
  return warnings.filter((warning) => warning.severity === 'alert').length
}
