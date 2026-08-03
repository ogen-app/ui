import {
  CardsThreeIcon,
  ListChecksIcon,
  NotepadIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { Explainer } from "@/components/page-primitives/Explainer";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { cn } from "@/lib";
import type { PoolStats, SourceMode } from "@/lib/campaignSources";

type ModeOption = {
  mode: SourceMode;
  label: string;
  icon: PhosphorIcon;
};

/**
 * The icons are the app's own nav glyphs (Brief, Content Bank), so each tile
 * points at where the campaign's knowledge would come from rather than
 * decorating the choice.
 *
 * "Campaign only" rather than "Brief only": the brief is one field of the
 * campaign, and a user reading "brief" reasonably wonders whether the type,
 * platforms, and language still apply. They do.
 */
const MODES: ModeOption[] = [
  { mode: "campaign", label: "Campaign only", icon: NotepadIcon },
  { mode: "all", label: "All assets", icon: CardsThreeIcon },
  { mode: "selected", label: "Selected assets", icon: ListChecksIcon },
];

type Props = {
  mode: SourceMode;
  onModeChange: (mode: SourceMode) => void;
  /** The whole bank, for the "everything" count. */
  bank: PoolStats;
  /** The working selection, for the "assigned" count. */
  selection: PoolStats;
  disabled?: boolean;
};

/**
 * Where this campaign's content comes from — the top of the Assets page.
 *
 * Three tiles and nothing else. What each one means is carried by its own
 * count line and by the table below it: picking "All assets" or "Selected
 * assets" opens the list, so the consequence is on screen instead of described
 * in a paragraph.
 */
export function ContentSourcesCard({
  mode,
  onModeChange,
  bank,
  selection,
  disabled = false,
}: Props) {
  return (
    <SettingsCard title="Content sources" className="max-w-none gap-4">
      {/* Teaching only, and it says nothing the tiles don't — closing it must
          not cost the user anything they need. */}
      <Explainer id="campaign-content-sources">
        Every post is written from this campaign's brief and settings. Choose
        whether it can also read your content bank.
      </Explainer>

      <div
        role="radiogroup"
        aria-label="Content sources"
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        {MODES.map((option) => (
          <ModeTile
            key={option.mode}
            option={option}
            selected={mode === option.mode}
            detail={tileDetail(option.mode, bank, selection)}
            disabled={disabled}
            onSelect={() => onModeChange(option.mode)}
          />
        ))}
      </div>
    </SettingsCard>
  );
}

function ModeTile({
  option,
  selected,
  detail,
  disabled,
  onSelect,
}: {
  option: ModeOption;
  selected: boolean;
  detail: string;
  disabled: boolean;
  onSelect: () => void;
}) {
  const Icon = option.icon;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "flex items-center gap-3 rounded-md border px-4 py-4 text-left cursor-pointer transition-colors",
        "disabled:pointer-events-none disabled:opacity-50",
        selected
          ? "border-foreground text-foreground"
          : "border-quaternary text-primary-foreground hover:border-foreground",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-md transition-colors",
          selected ? "bg-foreground text-background" : "bg-secondary",
        )}
      >
        <Icon className="size-6" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-base font-medium">{option.label}</span>
        <span className="truncate text-sm text-secondary-foreground">
          {detail}
        </span>
      </span>
    </button>
  );
}

/** The line under each tile: what picking it resolves to today. */
function tileDetail(
  mode: SourceMode,
  bank: PoolStats,
  selection: PoolStats,
): string {
  switch (mode) {
    case "campaign":
      return "General knowledge only";
    case "all":
      return `All ${bank.total} assets in content bank`;
    case "selected":
      return selection.total === 0
        ? "Nothing selected"
        : `${selection.total} selected`;
  }
}
