import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listCampaigns,
  getCampaign,
  getCampaignOverview,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  listCampaignTypes,
} from "@/services/api/campaigns";
import type { CreateCampaignPayload, UpdateCampaignPayload } from "@/types/campaigns";

const CAMPAIGNS_KEY = ["campaigns"] as const;
// Exported so the assistant store can invalidate it from outside React. The
// campaign's post list nests under this key, so invalidating it covers both.
export const campaignKey = (id: string) => ["campaigns", id] as const;
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

export function useCampaignOverview(id: string) {
  return useQuery({
    queryKey: [...campaignKey(id), "overview"] as const,
    queryFn: () => getCampaignOverview(id),
    enabled: !!id,
    // The overview screen degrades inline when this fails (e.g. a backend
    // without CON-113 yet); fail fast instead of blanking the section
    // through the default three retries.
    retry: 1,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCampaignPayload) => createCampaign(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAMPAIGNS_KEY });
    },
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
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
