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
import type {
  GroundingChoice,
  GroundingMode,
  PoolStats,
} from "@/lib/campaignGrounding";

type ModeOption = {
  mode: GroundingMode;
  label: string;
  icon: PhosphorIcon;
};

/**
 * The icons are the app's own nav glyphs — Brief, Content Bank — so each tile
 * points at where the campaign's knowledge would come from rather than
 * decorating the choice.
 *
 * "Campaign only" rather than "Brief only": the brief is one field of the
 * campaign, and a user reading "brief" reasonably wonders whether the type,
 * platforms, and language still apply. They do.
 */
const MODES: ModeOption[] = [
  { mode: "off", label: "Campaign only", icon: NotepadIcon },
  { mode: "all", label: "Whole Content Bank", icon: CardsThreeIcon },
  { mode: "selected", label: "A selected set", icon: ListChecksIcon },
];

type Props = {
  choice: GroundingChoice;
  onChoiceChange: (mode: GroundingMode) => void;
  /** The whole bank, for the "everything" count. */
  bank: PoolStats;
  /** The working selection, for the "selected" count and the warnings. */
  selection: PoolStats;
  disabled?: boolean;
};

/**
 * Where a campaign's content comes from — the whole of the Assets page until a
 * mode is chosen.
 *
 * Three modes, each with the count it resolves to and a paragraph saying what
 * it costs, including what happens to assets uploaded later. Nothing here is
 * set in the muted greys the rest of the app uses for chrome: this text is the
 * page, not a hint about it.
 */
export function GroundingCard({
  choice,
  onChoiceChange,
  bank,
  selection,
  disabled = false,
}: Props) {
  return (
    <SettingsCard title="Grounding" className="max-w-none gap-6">
      <p className="max-w-150 text-base text-primary-foreground">
        Every post this campaign generates is written from the campaign itself —
        its brief, its type, its settings — and the model's general knowledge.
        This is where you decide what else it may draw on.
      </p>

      <div
        role="radiogroup"
        aria-label="Grounding"
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        {MODES.map((option) => (
          <ModeTile
            key={option.mode}
            option={option}
            selected={choice === option.mode}
            detail={tileDetail(option.mode, bank, selection)}
            disabled={disabled}
            onSelect={() => onChoiceChange(option.mode)}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <p className="max-w-150 text-base text-primary-foreground">
          {consequence(choice, bank, selection)}
        </p>
        <Warnings choice={choice} bank={bank} selection={selection} />
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
          selected ? "bg-foreground text-background" : "bg-transparent",
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

/** The count under each tile — what picking it resolves to today. */
function tileDetail(
  mode: GroundingMode,
  bank: PoolStats,
  selection: PoolStats,
): string {
  switch (mode) {
    case "off":
      return "Nothing from the Content Bank";
    case "all":
      return `${bank.ready} ready ${bank.ready === 1 ? "asset" : "assets"}`;
    case "selected":
      return selection.total === 0
        ? "Chosen after this"
        : `${selection.total} chosen`;
  }
}

/**
 * What each choice actually means, in full sentences. Each says what informs a
 * post *and* what happens to the next upload — the difference between the two
 * "on" modes is invisible otherwise.
 */
function consequence(
  choice: GroundingChoice,
  bank: PoolStats,
  selection: PoolStats,
): string {
  switch (choice) {
    case null:
      return "Pick one to carry on. Nothing is decided until you do, and posts generated in the meantime use the campaign alone.";
    case "off":
      return "Posts stay on the campaign and general knowledge. No article, draft, or file from the Content Bank is read, now or later.";
    case "all":
      return `Any of the ${bank.ready} ready ${bank.ready === 1 ? "asset" : "assets"} in the Content Bank can inform a post, and anything uploaded from now on joins in automatically.`;
    case "selected":
      return selection.total === 0
        ? "Only assets you choose can inform a post. Configure opens the Content Bank so you can pick them; new uploads stay out until you add them."
        : `Only these ${selection.total} assets can inform a post. New uploads stay out until you add them.`;
  }
}

/**
 * The gaps between what the user picked and what retrieval can actually reach.
 * Silence here has to mean "your selection is live", so each row is a state
 * where it isn't.
 */
function Warnings({
  choice,
  bank,
  selection,
}: {
  choice: GroundingChoice;
  bank: PoolStats;
  selection: PoolStats;
}) {
  if (choice === null || choice === "off") return null;

  const scope = choice === "all" ? bank : selection;
  const rows: { key: string; tone: "warn" | "attention"; label: string }[] = [];

  if (choice === "selected" && selection.total === 0) {
    rows.push({
      key: "empty",
      tone: "warn",
      label: "Pick at least one asset, or switch to Campaign only.",
    });
  }

  if (choice === "all" && bank.ready === 0) {
    rows.push({
      key: "bank-empty",
      tone: "warn",
      label:
        "No ready assets in the Content Bank yet — posts fall back to the campaign until there are.",
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
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div key={row.key} className="flex flex-wrap items-center gap-3">
          <StatusBadge
            tone={row.tone}
            label={row.label}
            className="text-sm text-primary-foreground"
          />
          {row.key === "inert" && (
            <Link
              to="/content-bank"
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-sm text-secondary-foreground underline hover:text-primary-foreground"
            >
              Review in the Content Bank
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
