import { useCallback, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { getSetting, putSetting } from '@/services/api/settings'
import {
  deriveTargetPlatforms,
  parseAccountTargets,
  seedAccountTargets,
  type CampaignAccountTarget,
} from '@/lib/campaignAccounts'
import { toast } from '@/stores/toastStore'
import type { CampaignPlatform } from '@/types/campaigns'

/** Namespace of the settings key these are stored under. */
const NAMESPACE = 'campaign-accounts'

/** How long to coalesce clicks before writing. A run of toggles is one PUT. */
const SAVE_DEBOUNCE_MS = 500

const EMPTY: CampaignAccountTarget[] = []

export const campaignAccountsKey = (campaignId: string) =>
  ['settings', NAMESPACE, campaignId] as const

/**
 * Which accounts a campaign publishes as.
 *
 * **This lives in the tenant key/value store because the campaign has nowhere
 * to put it.** `campaigns.target_platforms` is a list of `{id, post_types}`
 * with no account dimension, and the API drops any field it doesn't know, so a
 * choice written there would vanish on the round trip. The store is the same
 * one the calendar preferences use; the value is a campaign's list of account
 * ids and post-type slugs, which is workspace configuration rather than
 * anything private — and `/api/settings` is workspace-wide, so nothing else
 * may go here. See the `campaign-accounts` flag for what the back end has to
 * add before this moves onto the campaign.
 *
 * The campaign's own `target_platforms` stays the platform-level truth and is
 * written alongside every change (`deriveTargetPlatforms`), so everything
 * downstream — the content plan, readiness, the post editor — keeps reading
 * one source it already understands. A campaign whose platforms were changed
 * from somewhere else (the assistant) is re-seeded the next time this key is
 * missing, not merged: while the column doesn't exist there is no third place
 * to reconcile against.
 */
export function useCampaignAccounts(
  campaignId: string,
  /** The campaign's `target_platforms`, read once to seed a campaign with no stored choice. */
  targetPlatforms: CampaignPlatform[],
  /**
   * Writes the platform-level view of the same change onto the campaign. Called
   * from the flush rather than from every click, so the two stores are always
   * written from one value: a run of post-type switches is one settings PUT and
   * one campaign PUT, and there is no window where a slow request lands after a
   * later one and leaves the campaign describing a choice the user has moved on
   * from.
   */
  onCommitPlatforms: (next: CampaignPlatform[]) => void,
) {
  const qc = useQueryClient()
  const queryKey = campaignAccountsKey(campaignId)
  const storageKey = `${NAMESPACE}.${campaignId}`

  // Held in a ref rather than in the query key: the seed is only consulted
  // when nothing is stored, and keying on it would refetch every time the
  // derived platforms are written back.
  const seed = useRef(targetPlatforms)
  seed.current = targetPlatforms

  // `isLoading`, not `isPending`: a disabled query stays pending forever, and
  // a campaign with no id has nothing to wait for.
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () =>
      parseAccountTargets(await getSetting(storageKey)) ??
      seedAccountTargets(seed.current),
    enabled: !!campaignId,
    // Nothing else writes this key, so the cache is authoritative once loaded.
    staleTime: Infinity,
  })

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<{
    key: string
    value: CampaignAccountTarget[]
  } | null>(null)

  // Held in a ref so `flush` can stay identity-stable: it is the unmount
  // cleanup below, and a callback that changes with the campaign would flush
  // the debounce every time the campaign is refetched.
  const commit = useRef(onCommitPlatforms)
  commit.current = onCommitPlatforms

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    const next = pending.current
    pending.current = null
    if (!next) return
    void putSetting(next.key, JSON.stringify(next.value)).catch(() => {
      toast.error("Couldn't save the campaign's accounts")
    })
    commit.current(deriveTargetPlatforms(next.value))
  }, [])

  // Leaving the page mid-debounce must not lose the change.
  useEffect(() => flush, [flush])

  const write = useCallback(
    (next: CampaignAccountTarget[]) => {
      qc.setQueryData(queryKey, next)
      if (!campaignId) return
      pending.current = { key: storageKey, value: next }
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(flush, SAVE_DEBOUNCE_MS)
    },
    [qc, queryKey, storageKey, campaignId, flush],
  )

  return {
    targets: data ?? EMPTY,
    /** True until the stored choice has been read — the list is not the answer yet. */
    isPending: isLoading,
    write,
  }
}
