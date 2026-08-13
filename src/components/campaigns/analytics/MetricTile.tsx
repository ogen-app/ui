import { cn } from "@/lib";

/**
 * One measured number. A sibling of the Overview's `StatTile` rather than a
 * reuse of it: that tile counts things the user can act on and dims a zero as
 * "nothing to do here", while a metric of zero is a *result* — a post that
 * reached nobody is the most interesting tile on the screen, not the quietest.
 */
export function MetricTile({
  value,
  label,
  hint,
  className,
}: {
  /** Pre-formatted — the caller decides between `12,043`, `12.0K` and `3.1%`. */
  value: string;
  label: string;
  /** Where the number comes from, when that isn't obvious from the label. */
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 rounded-md bg-secondary px-3 py-2.5 min-w-0",
        className,
      )}
    >
      <span className="font-display text-2xl font-medium leading-7 truncate">
        {value}
      </span>
      <span className="text-xs text-tertiary-foreground truncate" title={hint}>
        {label}
      </span>
    </div>
  );
}
