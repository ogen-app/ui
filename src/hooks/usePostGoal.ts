import { useCallback, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { getSetting, putSetting } from '@/services/api/settings'
import { parsePostGoal, seedPostGoal, type PostGoal } from '@/lib/postGoal'
import type { Campaign } from '@/types/campaigns'

/** Namespace of the settings key the goal is stored under. */
const NAMESPACE = 'goals'

export const postGoalKey = (campaignId: string) =>
  ['settings', NAMESPACE, campaignId] as const

function same(a: PostGoal, b: PostGoal): boolean {
  return (
    a.enabled === b.enabled &&
    a.perAccount === b.perAccount &&
    a.period === b.period &&
    a.mode === b.mode
  )
}

/**
 * A campaign's post goal, persisted server-side.
 *
 * It lives in the tenant-wide key/value store under `goals.<campaignId>`: the
 * campaign row has one column for this, `estimated_post_count`, and it holds
 * the *total* the goal works out to — the breakdown behind that total has no
 * columns yet, and adding them is the backend half of CON-156 §3. Like the
 * scheduling preferences next door it is campaign-wide rather than personal: a
 * goal is a property of the campaign, so the whole workspace sees the same one.
 *
 * Also unlike them, it does *not* autosave. It shares a card with a number that
 * is written to the campaign itself, and a card where one control persists on
 * change and the other waits for Save reads as a bug — so the edit is held here
 * and applied by the page's Save, through `useRegisterSettingsSave`.
 */
export function usePostGoal(campaign: Campaign, accounts: number) {
  const qc = useQueryClient()
  const campaignId = campaign.id
  const queryKey = postGoalKey(campaignId)
  const storageKey = `${NAMESPACE}.${campaignId}`

  // `isLoading`, not `isPending`: the latter never clears on a disabled query,
  // and without a campaign there is nothing to fetch.
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => parsePostGoal(await getSetting(storageKey)),
    enabled: !!campaignId,
    // Nothing else writes this, so the cache is authoritative once loaded.
    staleTime: Infinity,
  })

  // `undefined` while loading, `null` when the campaign has never had a goal
  // stored — both fall through to what the campaign's own total implies.
  const seed = useMemo(() => seedPostGoal(campaign, accounts), [campaign, accounts])
  const saved = data ?? seed

  const [draft, setDraft] = useState<PostGoal | null>(null)
  const goal = draft ?? saved

  const setGoal = useCallback(
    (patch: Partial<PostGoal>) => setDraft({ ...goal, ...patch }),
    [goal],
  )

  const save = useCallback(async () => {
    if (draft === null) return
    await putSetting(storageKey, JSON.stringify(draft))
    qc.setQueryData(queryKey, draft)
    setDraft(null)
  }, [draft, storageKey, qc, queryKey])

  return {
    goal,
    /** True until the stored goal has been read. */
    isPending: isLoading,
    // Landing back on the value it already had is not an edit — it must not
    // light up the header's Save.
    dirty: draft !== null && !same(draft, saved),
    setGoal,
    save,
  }
}
