import { CaretRightIcon } from "@phosphor-icons/react";
import { cn } from "@/lib";
import type { AttentionItem } from "@/lib/campaignReadiness.ts";
import { OverviewCard, SectionLink } from "./OverviewCard.tsx";

/**
 * The overview's to-do list: what needs the user's attention right now,
 * already prioritized by `attentionItems`. Renders nothing when the campaign
 * is healthy — absence is the reward.
 */
export function AttentionRail({
  items,
  campaignId,
}: {
  items: AttentionItem[];
  campaignId: string;
}) {
  if (items.length === 0) return null;

  return (
    <OverviewCard title="Needs attention">
      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.id}>
            <SectionLink
              target={item.fix}
              campaignId={campaignId}
              className="group flex items-center gap-3 py-2 -mx-2 px-2 rounded-md hover:bg-secondary"
            >
              <span
                className={cn(
                  "size-1.5 rounded-full shrink-0",
                  item.severity === "alert" ? "bg-destructive" : "bg-chart-5",
                )}
              />
              <span className="flex-1 min-w-0 truncate text-sm">
                {item.label}
              </span>
              <span className="inline-flex items-center gap-0.5 text-xs text-tertiary-foreground group-hover:text-primary-foreground shrink-0">
                <span>{item.actionLabel}</span>
                <CaretRightIcon className="size-3.5" />
              </span>
            </SectionLink>
          </li>
        ))}
      </ul>
    </OverviewCard>
  );
}
