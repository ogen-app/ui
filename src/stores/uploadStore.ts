import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { uploadAssetFile } from "@/services/api/uploads";
import { validateUploadFile, type UploadKind } from "@/lib/assetStatus";
import { isFeatureEnabled } from "@/config/featureFlags";
import { addToCampaign } from "@/lib/campaignMembership";
import { attachToPost } from "@/lib/postSources";
import { queryClient } from "@/lib/queryClient";
import type { AssetStatus } from "@/types/content";

/**
 * What the bank accepts, read at validation time rather than at module load.
 *
 * The store outlives any one screen, and on staging the flag it reads can be
 * forced per browser — so a value captured when this module first ran would be
 * the answer from before the override, for the rest of the session.
 */
const uploadOptions = () => ({
  images: isFeatureEnabled("content-bank-images"),
});

/**
 * A tracked upload moves: uploading (HTTP transfer) → processing (async backend
 * work, watched by polling) → ready | partial | failed. Validation failures and
 * network errors land directly in `failed`.
 */
export type UploadPhase =
  | "uploading"
  | "processing"
  | "ready"
  | "partial"
  | "failed";

/**
 * Where an upload is going, beyond the content bank it always joins.
 *
 * Both attachments happen in this store rather than on the page that started
 * the upload, so that walking away mid-upload cannot leave the asset belonging
 * to nothing — or, worse, belonging to the campaign but not to the post it was
 * dropped on.
 */
export type UploadTarget = {
  /** The campaign the file joins, or null for the workspace bank. */
  campaignId: string | null;
  /** The post that should read from it, when it was added on one. */
  postId: string | null;
};

export type UploadItem = UploadTarget & {
  id: string;
  file: File;
  filename: string;
  sizeBytes: number;
  kind: UploadKind | null;
  phase: UploadPhase;
  progress: number; // 0–100, meaningful while `uploading`
  assetId?: string;
  error?: string;
};

type UploadState = {
  items: UploadItem[];
  /** Validate and begin uploading each file; invalid files appear as failed. */
  enqueue: (files: File[] | FileList, target: UploadTarget) => void;
  /** Re-run a failed upload from its original File. */
  retry: (id: string) => void;
  /** Sync a polled backend asset status into the tracked item. */
  setStatus: (id: string, status: AssetStatus) => void;
  /** Drop a single item from the tracker. */
  remove: (id: string) => void;
  /** Drop every item that has reached a terminal phase. */
  clearFinished: () => void;
};

const newId = () => crypto.randomUUID();

function statusToPhase(status: AssetStatus): UploadPhase {
  if (status === "ready" || status === "partial" || status === "failed") {
    return status;
  }
  return "processing";
}

export const useUploadStore = create<UploadState>()(
  devtools(
    (set, get) => {
      const patch = (id: string, changes: Partial<UploadItem>) =>
        set((state) => ({
          items: state.items.map((it) =>
            it.id === id ? { ...it, ...changes } : it,
          ),
        }));

      const start = (id: string, file: File, target: UploadTarget) => {
        patch(id, { phase: "uploading", progress: 0, error: undefined });
        uploadAssetFile(file, { onProgress: (p) => patch(id, { progress: p }) })
          .then((result) => {
            if (result.status === "failed") {
              patch(id, {
                phase: "failed",
                error: result.error ?? "Upload failed",
              });
              return;
            }
            patch(id, {
              assetId: result.asset_id,
              progress: 100,
              phase: result.asset
                ? statusToPhase(result.asset.status)
                : "processing",
            });
            // The asset exists now, so whatever it was dropped on gets it and
            // the list it belongs in refetches. Deliberately not conditional on
            // anyone still looking at that page. A file dropped on the
            // workspace bank has neither target — it is already where it was
            // put; one dropped on a post has both, because a post reading from
            // a document its campaign has never heard of is a disagreement
            // between the two, and the campaign writes the next post.
            if (result.asset_id) {
              if (target.campaignId)
                void addToCampaign(target.campaignId, [result.asset_id]);
              if (target.postId)
                void attachToPost(target.postId, [result.asset_id]);
              queryClient.invalidateQueries({ queryKey: ["assets"] });
            }
          })
          .catch((err: unknown) => {
            patch(id, {
              phase: "failed",
              error: err instanceof Error ? err.message : "Upload failed",
            });
          });
      };

      return {
        items: [],

        enqueue: (files, target) => {
          const items: UploadItem[] = Array.from(files).map((file) => {
            const validation = validateUploadFile(file, uploadOptions());
            const base = {
              id: newId(),
              campaignId: target.campaignId,
              postId: target.postId,
              file,
              filename: file.name,
              sizeBytes: file.size,
              progress: 0,
            };
            return validation.ok
              ? { ...base, kind: validation.kind, phase: "uploading" as const }
              : {
                  ...base,
                  kind: null,
                  phase: "failed" as const,
                  error: validation.error,
                };
          });
          if (items.length === 0) return;

          set((state) => ({ items: [...state.items, ...items] }));
          for (const item of items) {
            if (item.phase === "uploading")
              start(item.id, item.file, {
                campaignId: item.campaignId,
                postId: item.postId,
              });
          }
        },

        retry: (id) => {
          const item = get().items.find((it) => it.id === id);
          if (!item) return;
          const validation = validateUploadFile(item.file, uploadOptions());
          if (!validation.ok) {
            patch(id, { phase: "failed", error: validation.error });
            return;
          }
          start(id, item.file, {
            campaignId: item.campaignId,
            postId: item.postId,
          });
        },

        setStatus: (id, status) => patch(id, { phase: statusToPhase(status) }),

        remove: (id) =>
          set((state) => ({ items: state.items.filter((it) => it.id !== id) })),

        clearFinished: () =>
          set((state) => ({
            items: state.items.filter(
              (it) => it.phase === "uploading" || it.phase === "processing",
            ),
          })),
      };
    },
    { name: "upload-store" },
  ),
);
