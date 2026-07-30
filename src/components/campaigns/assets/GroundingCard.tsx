import { Link } from "@tanstack/react-router";
import {
  CardsThreeIcon,
  ListChecksIcon,
  NotepadIcon,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib";
import type { GroundingMode, PoolStats } from "@/lib/campaignGrounding";

type ModeOption = {
  mode: GroundingMode;
  label: string;
  icon: PhosphorIcon;
};

/**
 * The icons are the app's own nav glyphs — Brief, Content Bank — so each tile
 * points at where the campaign's knowledge would come from rather than
 * decorating the choice.
 */
const MODES: ModeOption[] = [
  { mode: "off", label: "Brief only", icon: NotepadIcon },
  { mode: "all", label: "Whole Content Bank", icon: CardsThreeIcon },
  { mode: "selected", label: "A selected set", icon: ListChecksIcon },
];

type Props = {
  mode: GroundingMode;
  onModeChange: (mode: GroundingMode) => void;
  /** The whole bank, for the "everything" count. */
  bank: PoolStats;
  /** The working selection, for the "selected" count and the warnings. */
  selection: PoolStats;
  disabled?: boolean;
};

/**
 * Where a campaign's content comes from. Three modes, each with the count it
 * resolves to and one line saying what it costs — including what happens to
 * assets uploaded later, which is the part users get wrong.
 */
export function GroundingCard({
  mode,
  onModeChange,
  bank,
  selection,
  disabled = false,
}: Props) {
  return (
    <SettingsCard title="Grounding" className="max-w-none">
      <div
        role="radiogroup"
        aria-label="Grounding"
        className="grid grid-cols-1 gap-2 sm:grid-cols-3"
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

      <div className="flex flex-col gap-2">
        <p className="max-w-prose text-sm text-secondary-foreground">
          {consequence(mode, bank, selection)}
        </p>
        <Warnings mode={mode} bank={bank} selection={selection} />
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
        "flex items-center gap-3 rounded-md border px-4 py-3 text-left cursor-pointer transition-colors",
        "disabled:pointer-events-none disabled:opacity-50",
        selected
          ? "border-foreground text-foreground"
          : "border-quaternary text-secondary-foreground hover:border-foreground hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md transition-colors",
          selected ? "bg-foreground text-background" : "bg-transparent",
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[13px] font-medium">{option.label}</span>
        <span className="truncate text-xs text-tertiary-foreground">
          {detail}
        </span>
      </span>
    </button>
  );
}

/** The count under each tile — what picking it resolves to today. */
function tileDetail(
  mode: GroundingMode,
  bank: PoolStats,
  selection: PoolStats,
): string {
  switch (mode) {
    case "off":
      return "No sources";
    case "all":
      return `${bank.ready} ready`;
    case "selected":
      return selection.total === 0
        ? "Nothing chosen yet"
        : `${selection.total} chosen`;
  }
}

/**
 * One sentence of consequence per mode. Each says what informs a post *and*
 * what happens to the next upload — the difference between the two "on" modes
 * is invisible otherwise.
 */
function consequence(
  mode: GroundingMode,
  bank: PoolStats,
  selection: PoolStats,
): string {
  switch (mode) {
    case "off":
      return "Posts are written from the brief alone. Nothing in the Content Bank informs them.";
    case "all":
      return `Any of the ${bank.ready} ready assets can inform a post, and anything uploaded later joins automatically.`;
    case "selected":
      return selection.total === 0
        ? "Only the assets you pick below can inform a post. New uploads stay out until you add them."
        : `Only these ${selection.total} assets can inform a post. New uploads stay out until you add them.`;
  }
}

/**
 * The gaps between what the user picked and what retrieval can actually reach.
 * Silence here has to mean "your selection is live", so each row is a state
 * where it isn't.
 */
function Warnings({
  mode,
  bank,
  selection,
}: {
  mode: GroundingMode;
  bank: PoolStats;
  selection: PoolStats;
}) {
  if (mode === "off") return null;

  const scope = mode === "all" ? bank : selection;
  const rows: { key: string; tone: "warn" | "attention"; label: string }[] = [];

  if (mode === "selected" && selection.total === 0) {
    rows.push({
      key: "empty",
      tone: "warn",
      label: "Pick at least one asset, or switch to Brief only.",
    });
  }

  if (mode === "all" && bank.ready === 0) {
    rows.push({
      key: "bank-empty",
      tone: "warn",
      label:
        "No ready assets in the Content Bank yet — posts fall back to the brief until there are.",
    });
  }

  if (scope.waiting > 0) {
    rows.push({
      key: "waiting",
      tone: "attention",
      label: `${scope.waiting} ${scope.waiting === 1 ? "asset is" : "assets are"} still processing and can't inform posts yet.`,
    });
  }

  if (scope.inert > 0) {
    rows.push({
      key: "inert",
      tone: "warn",
      label: `${scope.inert} ${scope.inert === 1 ? "asset didn't" : "assets didn't"} process and will be skipped.`,
    });
  }

  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((row) => (
        <div key={row.key} className="flex items-center gap-3">
          <StatusBadge tone={row.tone} label={row.label} />
          {row.key === "inert" && (
            <Link
              to="/content-bank"
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-xs text-tertiary-foreground hover:text-primary-foreground"
            >
              Review in the Content Bank
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
