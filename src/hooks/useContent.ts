import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listAssets,
  getAsset,
  createAsset,
  updateAsset,
  deleteAsset,
} from "@/services/api/content";
import { retrievability } from "@/lib/campaignSources";
import type { CreateAssetPayload, UpdateAssetPayload } from "@/types/content";

const ASSETS_KEY = ["assets"] as const;
const assetKey = (id: string) => ["assets", id] as const;

/** How often to look again while something in the list is still extracting. */
const PROCESSING_POLL_MS = 3000;

/**
 * The asset list, which watches itself while anything in it is processing.
 *
 * Extraction happens after the upload returns, so a freshly added document
 * lands as `processing` and becomes readable some seconds later with nothing
 * on the client to notice. The tracker used to poll each upload it knew about;
 * this covers the same ground from the list itself, and also covers assets
 * that started processing somewhere else — another tab, another campaign, or
 * before this page was open.
 */
export function useAssets() {
  return useQuery({
    queryKey: ASSETS_KEY,
    queryFn: listAssets,
    refetchInterval: (query) =>
      query.state.data?.some(
        (asset) => retrievability(asset.status) === "waiting",
      )
        ? PROCESSING_POLL_MS
        : false,
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: assetKey(id),
    queryFn: () => getAsset(id),
    enabled: !!id,
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAssetPayload) => createAsset(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ASSETS_KEY });
    },
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAssetPayload }) =>
      updateAsset(id, payload),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ASSETS_KEY });
      qc.invalidateQueries({ queryKey: assetKey(id) });
    },
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAsset(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ASSETS_KEY });
    },
  });
}
