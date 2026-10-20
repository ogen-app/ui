import type { LinkProps } from '@tanstack/react-router'
import type { GoKey } from './hotkeys'

/**
 * "g then a letter" (CON-394): where each letter goes, on a workspace page
 * and inside a campaign.
 *
 * Inside a campaign Ideas, Assets, Analytics and Settings go to the
 * campaign's own sections — the same letters, one level in, as the rail's two
 * levels answer to each other. Campaigns and Foundation are the workspace's
 * at both levels. Strategy, Posts and Calendar exist only in a campaign, and
 * go nowhere outside one.
 */
type Place = { to: LinkProps['to']; params?: Record<string, string> }

const WORKSPACE: Partial<Record<GoKey, Place>> = {
  i: { to: '/ideas' },
  a: { to: '/assets' },
  c: { to: '/campaigns' },
  n: { to: '/analytics' },
  f: { to: '/foundation' },
  s: { to: '/workspace-settings' },
}

const CAMPAIGN: Partial<Record<GoKey, LinkProps['to']>> = {
  i: '/campaigns/$campaignId/ideas',
  a: '/campaigns/$campaignId/assets',
  n: '/campaigns/$campaignId/analytics',
  s: '/campaigns/$campaignId/settings',
  t: '/campaigns/$campaignId/strategy',
  p: '/campaigns/$campaignId/list',
  // The bare calendar redirects to wherever this campaign's calendar was
  // last left — the date and the granularity.
  r: '/campaigns/$campaignId/calendar',
}

export function isGoKey(key: string): key is GoKey {
  return 'iacnfstpr'.includes(key) && key.length === 1
}

/** Where `g` then `key` goes, or null where it goes nowhere. */
export function goTarget(key: string, campaignId: string | null): Place | null {
  if (!isGoKey(key)) return null
  const inCampaign = campaignId ? CAMPAIGN[key] : undefined
  if (campaignId && inCampaign)
    return { to: inCampaign, params: { campaignId } }
  return WORKSPACE[key] ?? null
}

/**
 * The campaign a path is inside, or null. Every campaign route, the post
 * editor's included (`/campaigns/:id_/posts/:postId`), starts with the id;
 * the Campaigns list itself has none.
 */
export function campaignIdOf(pathname: string): string | null {
  const match = /^\/campaigns\/([^/]+)/.exec(pathname)
  return match ? decodeURIComponent(match[1]) : null
}

/** How long `g` waits for its letter. */
export const GO_TIMEOUT_MS = 1000
