import { useCallback, useEffect, useRef, useState } from "react";
import { campaignToPayload } from "@/components/forms/campaignBriefForm/shared";
import { PageError } from "@/components/page-primitives/PageError";
import { PageLoader } from "@/components/page-primitives/PageLoader";
import { useAssets } from "@/hooks/useContent";
import { useUpdateCampaign } from "@/hooks/useCampaigns";
import { registerPendingSave } from "@/lib/pendingSaves";
import {
  sourceModeOf,
  sourcesPayload,
  type SourceMode,
} from "@/lib/campaignSources";
import { toast } from "@/stores/toastStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { Campaign } from "@/types/campaigns";
import { CampaignAssetsView } from "./CampaignAssetsView";

/** Same debounce the campaign forms use — see `campaignBriefForm/shared.ts`. */
const SAVE_DELAY = 500;

/**
 * The Assets page's state and its saving.
 *
 * Autosaves like the rest of the campaign rather than adding a Save button:
 * ticking forty checkboxes and then losing them to a stray back-navigation is
 * the failure this page most has to avoid. The mode lands immediately, being
 * one deliberate click, while checkbox runs are debounced.
 *
 * Selecting nothing saves as campaign-only (`sourcesPayload`), so the mode the
 * page is showing and the mode the server has stored can differ for as long as
 * the selection is empty. Reloading then lands back on Campaign only, which is
 * what was saved.
 *
 * A copy of the picked set is kept on the device (`assetSelections`) because
 * switching to whole-bank has to clear `asset_ids` server-side, and that is
 * the one move the campaign row cannot remember its way out of. Coming back to
 * Selected assets restores it, so no mode switch on this page destroys work.
 */
export function CampaignAssetsPanel({ campaign }: { campaign: Campaign }) {
  const { data: assets, isLoading, isError } = useAssets();
  const { mutateAsync: updateCampaign } = useUpdateCampaign();
  const remember = useSettingsStore((s) => s.rememberAssetSelection);
  const stashed = useSettingsStore((s) => s.assetSelections[campaign.id]);

  const [mode, setMode] = useState<SourceMode>(() => sourceModeOf(campaign));
  const [selectedIds, setSelectedIds] = useState<string[]>(
    () => campaign.asset_ids,
  );

  // The debounce reads through refs so a queued save always writes the latest
  // state, not whatever it was scheduled with.
  const stateRef = useRef({ mode, selectedIds });
  stateRef.current = { mode, selectedIds };

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<Promise<unknown> | null>(null);

  const saveNow = useCallback(async () => {
    const { mode: m, selectedIds: ids } = stateRef.current;
    const run = updateCampaign({
      id: campaign.id,
      payload: campaignToPayload(campaign, sourcesPayload(m, ids)),
    }).catch((e: unknown) => {
      toast.error("Unable to save content sources", {
        description: e instanceof Error ? e.message : undefined,
      });
    });
    inFlightRef.current = run;
    try {
      await run;
    } finally {
      if (inFlightRef.current === run) inFlightRef.current = null;
    }
  }, [campaign, updateCampaign]);

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      await saveNow();
      return;
    }
    await inFlightRef.current;
  }, [saveNow]);

  const schedule = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void saveNow();
    }, SAVE_DELAY);
  }, [saveNow]);

  // Seed the stash from the campaign itself, so a set picked on another device
  // is still recoverable here after a trip through whole-bank mode.
  useEffect(() => {
    if (campaign.asset_ids.length > 0) remember(campaign.id, campaign.asset_ids);
  }, [campaign.id, campaign.asset_ids, remember]);

  // The campaign assistant writes the campaign server-side; land anything
  // queued before its turn starts, or the debounce overwrites it afterwards.
  useEffect(
    () => registerPendingSave(campaign.id, flush),
    [campaign.id, flush],
  );

  // Leaving the page must not drop a queued run of checkboxes. Held in a ref
  // so this fires on unmount only — `flush` changes identity every time the
  // campaign refetches, which is after every save.
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => () => void flushRef.current(), []);

  const changeMode = (next: SourceMode) => {
    setMode(next);

    // Coming back to Selected with nothing ticked means the server cleared the
    // list on the way out to whole-bank. Hand back what was stashed, minus
    // anything deleted from the bank since — the ids are only useful while the
    // assets behind them still exist.
    let ids = stateRef.current.selectedIds;
    if (next === "selected" && ids.length === 0 && stashed?.length) {
      const live = new Set((assets ?? []).map((a) => a.id));
      ids = stashed.filter((id) => live.has(id));
      setSelectedIds(ids);
    }

    stateRef.current = { mode: next, selectedIds: ids };
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    void saveNow();
  };

  const changeSelectedIds = (ids: string[]) => {
    setSelectedIds(ids);
    stateRef.current = { ...stateRef.current, selectedIds: ids };
    remember(campaign.id, ids);
    schedule();
  };

  if (isLoading) return <PageLoader />;
  if (isError) return <PageError header="Unable to load the Content Bank" />;

  return (
    <CampaignAssetsView
      mode={mode}
      onModeChange={changeMode}
      assets={assets ?? []}
      selectedIds={selectedIds}
      onSelectedIdsChange={changeSelectedIds}
    />
  );
}
