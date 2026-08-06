import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listCampaigns,
  listCampaignSummaries,
  getCampaign,
  getCampaignOverview,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  listCampaignTypes,
} from "@/services/api/campaigns";
import type { CreateCampaignPayload, UpdateCampaignPayload } from "@/types/campaigns";
import type { MutationErrorMeta } from "@/lib/queryClient";

const CAMPAIGNS_KEY = ["campaigns"] as const;
// Exported so the assistant store can invalidate it from outside React. The
// campaign's post list nests under this key, so invalidating it covers both.
export const campaignKey = (id: string) => ["campaigns", id] as const;
// Nests under `campaignKey`, like the post list does — anything that
// invalidates the campaign refreshes this too. Exported for the post
// mutations, which invalidate the *sibling* posts key and so don't.
export const campaignOverviewKey = (id: string) =>
  ["campaigns", id, "overview"] as const;
/**
 * The batched Campaigns-list payload (CON-152). Nests under `CAMPAIGNS_KEY`,
 * so anything invalidating the campaigns list refreshes it too; post mutations
 * invalidate it explicitly (`invalidateCampaignPosts`) because they touch a
 * sibling key.
 */
export const CAMPAIGN_SUMMARIES_KEY = ["campaigns", "summaries"] as const;
export const CAMPAIGN_TYPES_KEY = ["campaign-types"] as const;

export function useCampaigns() {
  return useQuery({
    queryKey: CAMPAIGNS_KEY,
    queryFn: listCampaigns,
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: campaignKey(id),
    queryFn: () => getCampaign(id),
    enabled: !!id,
  });
}

/**
 * The server's own roll-up of the campaign (CON-113): its phases, its post
 * total, and the distribution of those posts across statuses, channels and
 * content types. Counted server-side over every post, so it stays right on
 * campaigns too large to total in the browser.
 */
export function useCampaignOverview(id: string) {
  return useQuery({
    queryKey: campaignOverviewKey(id),
    queryFn: () => getCampaignOverview(id),
    enabled: !!id,
    // Staleness is push-driven — every post mutation and assistant turn
    // invalidates this key — so remounting the consumer (the Overview's tab
    // switches unmount it) shouldn't refire the request on its own.
    staleTime: 60_000,
  });
}

/**
 * Every campaign's posts, slim, in one request (CON-152) — keyed by campaign
 * id. The Campaigns list renders one card per campaign and each used to fetch
 * its own hydrated post list; this is that N+1 collapsed into a single query
 * the whole list shares.
 *
 * Cards read `data?.[campaign.id] ?? []` and take their load state from this
 * one query, so a campaign that is merely absent (no posts) is not mistaken
 * for one that hasn't loaded.
 */
export function useCampaignSummaries() {
  return useQuery({
    queryKey: CAMPAIGN_SUMMARIES_KEY,
    queryFn: listCampaignSummaries,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    meta: { errorTitle: "Unable to create the campaign" },
    mutationFn: (payload: CreateCampaignPayload) => createCampaign(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY });
    },
  });
}

/**
 * The campaign PUT, shared by the settings form, the brief, the assets panel
 * and the content-usage form.
 *
 * `meta` is a parameter because those call sites describe the same request in
 * different words — toggling a platform is not "updating the campaign" to the
 * person doing it — and one of them (activate/deactivate) picks its wording
 * per click, which no static `meta` can express. See `MutationErrorMeta`.
 */
export function useUpdateCampaign(meta?: MutationErrorMeta) {
  const qc = useQueryClient();
  return useMutation({
    meta,
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCampaignPayload }) =>
      updateCampaign(id, payload),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY });
      qc.invalidateQueries({ queryKey: campaignKey(id) });
    },
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCampaign(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY });
    },
  });
}

export function useCampaignTypes() {
  return useQuery({
    queryKey: CAMPAIGN_TYPES_KEY,
    queryFn: listCampaignTypes,
    staleTime: Infinity,
  });
}
