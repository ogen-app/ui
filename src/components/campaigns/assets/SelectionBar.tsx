import { Button } from "@/components/ui/button";

type Props = {
  /** Attached across the whole bank, not just the rows in view. */
  selectedCount: number;
  /** Rows the current filters match. */
  matchingCount: number;
  /** How many of those are already attached — decides add vs remove. */
  matchingSelectedCount: number;
  /** True when filters are narrowing the list, for honest button copy. */
  filtered: boolean;
  onSelectMatching: () => void;
  onDeselectMatching: () => void;
  onClear: () => void;
};

/**
 * The bulk row under the pool. At a few hundred assets the only workable way
 * to build a set is to filter and take the whole result, so the primary action
 * names the number it will act on rather than saying "select all".
 */
export function SelectionBar({
  selectedCount,
  matchingCount,
  matchingSelectedCount,
  filtered,
  onSelectMatching,
  onDeselectMatching,
  onClear,
}: Props) {
  const allMatchingSelected =
    matchingCount > 0 && matchingSelectedCount === matchingCount;
  const scope = filtered ? "matching" : "in the bank";

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t-2 border-background px-3 py-3">
      <span className="text-base text-primary-foreground">
        {selectedCount === 0
          ? "Nothing attached yet"
          : `${selectedCount} attached`}
      </span>

      <div className="flex flex-wrap items-center gap-2">
        {matchingCount > 0 &&
          (allMatchingSelected ? (
            <Button variant="ghost" size="sm" onClick={onDeselectMatching}>
              DETACH ALL {matchingCount} {scope.toUpperCase()}
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={onSelectMatching}>
              ATTACH ALL {matchingCount} {scope.toUpperCase()}
            </Button>
          ))}

        {selectedCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            DETACH EVERYTHING
          </Button>
        )}
      </div>
    </div>
  );
}
