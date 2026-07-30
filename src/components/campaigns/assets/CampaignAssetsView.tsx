import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { SettingsCard } from "@/components/settings/SettingsCard";
import {
  poolStats,
  selectionStats,
  type GroundingChoice,
  type GroundingMode,
} from "@/lib/campaignGrounding";
import type { Asset } from "@/types/content";
import { GroundingCard } from "./GroundingCard";

type Props = {
  choice: GroundingChoice;
  onChoiceChange: (mode: GroundingMode) => void;
  /** The whole Content Bank, for the counts and the empty-bank case. */
  assets: Asset[];
  /** The saved shortlist, for the "12 chosen" count. */
  selectedIds: string[];
};

/**
 * The campaign Assets page: one decision, stated in full.
 *
 * The list of assets is not here. Picking a shortlist out of a few hundred
 * documents is its own piece of work with its own screen, reached by the
 * header's Configure — putting a table under the choice would make the page
 * look like a table with a widget on top, and the choice is the point.
 *
 * This scrolls like Brief and Settings do; the selection screen doesn't.
 */
export function CampaignAssetsView({
  choice,
  onChoiceChange,
  assets,
  selectedIds,
}: Props) {
  const bank = useMemo(() => poolStats(assets), [assets]);
  const selection = useMemo(
    () => selectionStats(assets, selectedIds),
    [assets, selectedIds],
  );

  return (
    <div className="flex flex-col gap-8 pb-10">
      <GroundingCard
        choice={choice}
        onChoiceChange={onChoiceChange}
        bank={bank}
        selection={selection}
      />
      {choice !== null && choice !== "off" && assets.length === 0 && (
        <EmptyBank />
      )}
    </div>
  );
}

/** Nothing to ground against yet — the only useful action is elsewhere. */
function EmptyBank() {
  return (
    <SettingsCard title="The Content Bank is empty" className="max-w-none">
      <p className="max-w-150 text-base text-primary-foreground">
        Add the articles, briefs, and PDFs this campaign should speak from, and
        they'll show up here. Until then posts are written from the campaign
        alone, whichever mode is set.
      </p>
      <div>
        <Link
          to="/content-bank"
          target="_blank"
          rel="noreferrer"
          className="text-base text-secondary-foreground underline hover:text-primary-foreground"
        >
          Open the Content Bank
        </Link>
      </div>
    </SettingsCard>
  );
}
