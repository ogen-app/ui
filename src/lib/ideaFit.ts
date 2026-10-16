/**
 * An idea's fit score (CON-385): how well it fits the reading it came from,
 * 10 (low potential) to 100 (high), or `null` when it was never scored — a
 * person's own idea, or one from a reading made before the score existed.
 *
 * The server owns the score and the rubric behind it; this file only orders
 * by it and places it on a track.
 */

export const FIT_MIN = 10
export const FIT_MAX = 100

type Scored = { id: string; created_at: string; fit_score?: number | null }

/**
 * Best fit first; unscored after every scored idea, because no score is not a
 * low one; then oldest first, then by id. The same order the server uses to
 * pick an asset's `next_idea`, so the card continues the row rather than
 * re-ranking it.
 */
export function byFit(a: Scored, b: Scored): number {
  const fa = a.fit_score ?? null
  const fb = b.fit_score ?? null
  if (fa !== fb) {
    if (fa === null) return 1
    if (fb === null) return -1
    return fb - fa
  }
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/**
 * Where a score sits on a track drawn strong-at-the-left: 0 at the left edge
 * (100), 1 at the right (10). Out-of-range values are clamped rather than
 * trusted to draw off the track.
 */
export function fitPlace(score: number): number {
  const clamped = Math.min(FIT_MAX, Math.max(FIT_MIN, score))
  return (FIT_MAX - clamped) / (FIT_MAX - FIT_MIN)
}

/** One criterion of an idea's fit as the model rated it (CON-385). */
export type FitCriterion = {
  /** 1 (poor) to 5 (strong); 0 means the model did not rate it. */
  level: number
  why: string
  /** The campaign phase it serves, on `phase_fit`. */
  phase?: string
  /** The active campaign it would feed, on `campaign_potential`. */
  campaign?: string
}

/**
 * Why an idea scored what it did (`fit_breakdown`, CON-385): each criterion's
 * rating and reason, the caps that pinned it low, and the reading it was
 * scored for — which is not always the reading it is shown in, since an idea
 * keeps its score when it is filed into another campaign.
 */
export type FitBreakdown = {
  lens: 'campaign' | 'workspace'
  campaign_id: string | null
  criteria: Record<string, FitCriterion>
  caps: string[]
}

/**
 * Each lens's criteria in the rubric's weight order, heaviest first — the
 * order the breakdown is read in, so the order itself says what counts most.
 * The weights are the server's (`domain/ideafit`); only the order is mirrored.
 */
export const FIT_CRITERIA = {
  campaign: [
    'message_fit',
    'audience_fit',
    'evidence',
    'gap_fill',
    'phase_fit',
    'timeliness',
    'brand_fit',
  ],
  workspace: [
    'brand_relevance',
    'audience_fit',
    'evidence',
    'gap_fill',
    'campaign_potential',
    'evergreen',
    'brand_fit',
  ],
} as const

export type FitRow = {
  key: string
  level: number
  why: string
  /** The phase or campaign the criterion names, shown before its reason. */
  hint: string | null
}

/**
 * The breakdown as rows to draw: the lens's own criteria in rubric order, then
 * any the rubric has gained since this build in alphabetical order, so a new
 * criterion is shown rather than dropped. Unrated ones (level 0) are left out,
 * as the server leaves them out of the score; levels are clamped to 1–5.
 */
export function fitRows(
  breakdown: Pick<FitBreakdown, 'lens' | 'criteria'>,
): FitRow[] {
  const order: readonly string[] = FIT_CRITERIA[breakdown.lens] ?? []
  const known = order.filter((key) => key in breakdown.criteria)
  const extra = Object.keys(breakdown.criteria)
    .filter((key) => !order.includes(key))
    .sort()
  return [...known, ...extra].flatMap((key) => {
    const c = breakdown.criteria[key]
    if (!c || !(c.level > 0)) return []
    return [
      {
        key,
        level: Math.min(5, Math.max(1, Math.round(c.level))),
        why: c.why ?? '',
        hint: c.phase?.trim() || c.campaign?.trim() || null,
      },
    ]
  })
}

/**
 * How far along the fit track a rating sits, as the share of the strong end
 * in its colour (0 at 1, 100 at 5) — so a criterion and the score it feeds are
 * drawn in one scale.
 */
export function fitLevelStrength(level: number): number {
  return ((Math.min(5, Math.max(1, level)) - 1) / 4) * 100
}
