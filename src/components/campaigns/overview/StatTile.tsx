import { cn } from "@/lib";

/**
 * One count in a widget row. Tiles share their row equally so the shape of a
 * campaign is readable as a bar chart of numbers, not just as text — used by
 * the Overview's Content module and by the campaign cards on the Campaigns
 * list, which have to be comparable at a glance.
 */
export function StatTile({
  value,
  label,
  tone = "default",
}: {
  value: number;
  label: string;
  tone?: "default" | "alert";
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md bg-secondary px-3 py-2.5 min-w-0">
      <span
        className={cn(
          "font-display text-2xl font-medium leading-7",
          tone === "alert" && "text-destructive",
          // A zero that isn't a problem is background information, not a
          // number to read — it recedes rather than competing with the counts
          // that matter.
          value === 0 && tone === "default" && "text-tertiary-foreground",
        )}
      >
        {value}
      </span>
      <span className="text-xs text-tertiary-foreground truncate">{label}</span>
    </div>
  );
}
