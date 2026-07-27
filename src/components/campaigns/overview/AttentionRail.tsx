import { useState } from "react";
import { CaretRightIcon } from "@phosphor-icons/react";
import { cn } from "@/lib";
import {
  MAX_ATTENTION_ITEMS,
  type AttentionItem,
  type AttentionSeverity,
} from "@/lib/campaignReadiness.ts";
import { OverviewCard, SectionLink } from "./OverviewCard.tsx";

/** Severity is carried by the dot alone — see docs/attention-rules.md. */
const DOT: Record<AttentionSeverity, string> = {
  alert: "bg-destructive",
  risk: "bg-chart-5",
  todo: "bg-chart-5",
  info: "bg-senary-foreground",
};

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
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) return null;

  // Items arrive sorted by severity, so capping keeps the most urgent rows and
  // drops hygiene nudges first.
  const shown = expanded ? items : items.slice(0, MAX_ATTENTION_ITEMS);
  const hidden = items.length - shown.length;

  return (
    <OverviewCard title="Needs attention">
      <ul className="flex flex-col">
        {shown.map((item) => (
          <li key={item.id}>
            <SectionLink
              target={item.fix}
              campaignId={campaignId}
              className="group flex items-center gap-3 py-2 -mx-2 px-2 rounded-md hover:bg-secondary"
            >
              <span
                className={cn("size-1.5 rounded-full shrink-0", DOT[item.severity])}
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
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="self-start text-xs text-tertiary-foreground hover:text-primary-foreground"
        >
          +{hidden} more
        </button>
      )}
    </OverviewCard>
  );
}
