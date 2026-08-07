/**
 * What a campaign publishes *as*, one row per account rather than per platform.
 *
 * A campaign used to target a platform ("this campaign posts to Facebook").
 * With more than one account connected per platform (CON-150) that is not a
 * decision the workspace can make on the campaign's behalf: two Facebook pages
 * are two audiences, and "Facebook" no longer names either of them.
 *
 * So a target is an **account on a platform**, and there are two kinds:
 *
 * - a **connected account** — a real page/profile the workspace can publish to;
 * - a **placeholder** — the platform itself, targeted before anything is
 *   connected to it. `account_id === ''`. This is what every pre-existing
 *   campaign's `target_platforms` entry becomes, and it is how a campaign says
 *   "we will post to Facebook, we just haven't linked the page yet".
 *
 * The two never stack on one platform: once a real account is targeted the
 * placeholder is gone, because the placeholder *is* the unnamed version of the
 * same row. Connecting an account does not silently take the placeholder's
 * place either — the campaign keeps publishing to nothing until someone
 * accepts the swap (`supersededBy` below).
 *
 * The server has no account dimension on a campaign yet — `CampaignPlatform`
 * is still `{id, post_types}` — so `deriveTargetPlatforms` collapses this back
 * into the platform-level shape the API, the content plan and the readiness
 * rules all still read. See the `campaign-accounts` flag.
 */

import { connectedAccounts, type PlatformView } from './platformDictionary'
import type { CampaignPlatform, PublisherAccount } from '@/types/campaigns'

/** A placeholder carries no account id — there is no account to name yet. */
export const PLACEHOLDER_ACCOUNT_ID = ''

export type CampaignAccountTarget = {
  platform_id: string
  /** `''` on a placeholder. */
  account_id: string
  post_types: string[]
}

/** Identifies a row across both kinds, since a platform can hold several. */
export function targetKey(platformId: string, accountId: string): string {
  return `${platformId}:${accountId}`
}

function find(
  targets: readonly CampaignAccountTarget[],
  platformId: string,
  accountId: string,
): CampaignAccountTarget | undefined {
  return targets.find(
    (t) => t.platform_id === platformId && t.account_id === accountId,
  )
}

/**
 * The account model for a campaign that has never had one: every platform it
 * targets becomes a placeholder.
 *
 * Deliberately not "guess the account": a campaign written when Facebook had
 * one page must not silently claim that page now that it has two. It targets
 * Facebook-in-general, which is exactly what a placeholder means, and the card
 * offers the swap.
 */
export function seedAccountTargets(
  targetPlatforms: readonly CampaignPlatform[],
): CampaignAccountTarget[] {
  return targetPlatforms.map((tp) => ({
    platform_id: tp.id,
    account_id: PLACEHOLDER_ACCOUNT_ID,
    post_types: [...tp.post_types],
  }))
}

/**
 * Reads the stored blob back, or `null` when there is nothing usable there —
 * the caller seeds from the campaign instead. Malformed values are `null` too:
 * the campaign's own `target_platforms` is the better answer than an empty
 * card, and the next change overwrites the bad value anyway.
 */
export function parseAccountTargets(
  raw: string | null,
): CampaignAccountTarget[] | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    const out: CampaignAccountTarget[] = []
    for (const entry of parsed) {
      if (!entry || typeof entry !== 'object') continue
      const { platform_id, account_id, post_types } = entry as Record<string, unknown>
      if (typeof platform_id !== 'string' || platform_id === '') continue
      out.push({
        platform_id,
        account_id: typeof account_id === 'string' ? account_id : PLACEHOLDER_ACCOUNT_ID,
        post_types: Array.isArray(post_types)
          ? post_types.filter((s): s is string => typeof s === 'string')
          : [],
      })
    }
    return out
  } catch {
    return null
  }
}

/**
 * Targets a row. Adding a connected account also retires the platform's
 * placeholder and inherits its post types — the placeholder was the same
 * campaign decision without a name on it, so accepting the account is a
 * rename, not a second target.
 */
export function activateTarget(
  targets: readonly CampaignAccountTarget[],
  platformId: string,
  accountId: string,
  defaultPostTypes: readonly string[],
): CampaignAccountTarget[] {
  if (find(targets, platformId, accountId)) return [...targets]

  const placeholder =
    accountId === PLACEHOLDER_ACCOUNT_ID
      ? undefined
      : find(targets, platformId, PLACEHOLDER_ACCOUNT_ID)

  const kept = placeholder
    ? targets.filter((t) => t !== placeholder)
    : [...targets]

  return [
    ...kept,
    {
      platform_id: platformId,
      account_id: accountId,
      post_types: placeholder ? [...placeholder.post_types] : [...defaultPostTypes],
    },
  ]
}

export function deactivateTarget(
  targets: readonly CampaignAccountTarget[],
  platformId: string,
  accountId: string,
): CampaignAccountTarget[] {
  return targets.filter(
    (t) => !(t.platform_id === platformId && t.account_id === accountId),
  )
}

export function togglePostType(
  targets: readonly CampaignAccountTarget[],
  platformId: string,
  accountId: string,
  slug: string,
): CampaignAccountTarget[] {
  return targets.map((t) => {
    if (t.platform_id !== platformId || t.account_id !== accountId) return t
    const has = t.post_types.includes(slug)
    return {
      ...t,
      post_types: has ? t.post_types.filter((s) => s !== slug) : [...t.post_types, slug],
    }
  })
}

/**
 * The platform-level shape the rest of the app still runs on: one entry per
 * platform, carrying every post type any of its targeted accounts asked for.
 *
 * The union rather than a per-account list because that is all the server can
 * hold today, and everything downstream — the content plan, `campaignReadiness`,
 * the post editor's post-type choices — asks "what may this campaign publish on
 * this platform". Two Facebook pages that between them cover reels and stories
 * make both available to the campaign, which is the honest answer at platform
 * granularity.
 */
export function deriveTargetPlatforms(
  targets: readonly CampaignAccountTarget[],
): CampaignPlatform[] {
  const byPlatform = new Map<string, string[]>()
  for (const t of targets) {
    const slugs = byPlatform.get(t.platform_id)
    if (!slugs) {
      byPlatform.set(t.platform_id, [...t.post_types])
      continue
    }
    for (const slug of t.post_types) if (!slugs.includes(slug)) slugs.push(slug)
  }
  return [...byPlatform].map(([id, post_types]) => ({ id, post_types }))
}

export type CampaignAccountRow = {
  key: string
  view: PlatformView
  /** Null on a placeholder row. */
  account: PublisherAccount | null
  /** The campaign's entry for this row, or undefined when it is not targeted. */
  selection: CampaignAccountTarget | undefined
  /**
   * On an active placeholder whose platform has since been connected: the
   * accounts offered in its place. Empty everywhere else.
   *
   * This is the whole reason a placeholder stays visible after its platform is
   * connected — the campaign is targeting a platform it can now actually name,
   * and only the user gets to say which name.
   */
  supersededBy: PublisherAccount[]
}

/**
 * Every row the card offers, connected accounts first and placeholders after.
 *
 * Real accounts lead because they are the rows that can actually publish; a
 * placeholder is a note about a platform nobody has connected, and sorting it
 * among the accounts would put an intention next to a capability.
 *
 * A placeholder is only offered where there is nothing to choose instead — a
 * platform with connected accounts has real rows, and targeting "Facebook, no
 * account" *as well* is a target the publisher could never resolve. It stays
 * listed when it is already active, because that campaign has to be given a
 * way out of the state it is in.
 */
export function accountRows(
  views: readonly PlatformView[],
  targets: readonly CampaignAccountTarget[],
): CampaignAccountRow[] {
  const accountRowsOut: CampaignAccountRow[] = []
  const placeholderRows: CampaignAccountRow[] = []

  for (const view of views) {
    const platformId = view.platform.id
    const accounts = connectedAccounts(view)

    for (const account of accounts) {
      accountRowsOut.push({
        key: targetKey(platformId, account.id),
        view,
        account,
        selection: find(targets, platformId, account.id),
        supersededBy: [],
      })
    }

    const placeholder = find(targets, platformId, PLACEHOLDER_ACCOUNT_ID)
    if (accounts.length > 0 && !placeholder) continue

    placeholderRows.push({
      key: targetKey(platformId, PLACEHOLDER_ACCOUNT_ID),
      view,
      account: null,
      selection: placeholder,
      supersededBy: placeholder ? accounts : [],
    })
  }

  return [...accountRowsOut, ...placeholderRows]
}
