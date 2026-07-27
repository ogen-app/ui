import { useState } from "react";
import {
  MAX_ATTENTION_ITEMS,
  type AttentionItem,
  type AttentionSeverity,
} from "@/lib/campaignReadiness.ts";
import { LineItem, type LineItemTone } from "./LineItem.tsx";
import { OverviewCard, SectionLink } from "./OverviewCard.tsx";

/** Severity is carried by the dot alone — see docs/attention-rules.md. */
const TONE: Record<AttentionSeverity, LineItemTone> = {
  alert: "alert",
  risk: "warning",
  todo: "warning",
  info: "neutral",
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
            <LineItem
              asChild
              indicator={{ kind: "notification", tone: TONE[item.severity] }}
              label={item.label}
              trailing={
                <span className="group-hover:text-primary-foreground">
                  {item.actionLabel}
                </span>
              }
            >
              <SectionLink target={item.fix} campaignId={campaignId} />
            </LineItem>
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
