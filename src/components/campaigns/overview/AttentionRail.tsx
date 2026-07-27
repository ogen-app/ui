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
 * already prioritized by `attentionItems`. It keeps its place when the list is
 * empty and says so — a card that vanishes reads as "not loaded yet", and the
 * all-clear is the one thing the user came to this screen to find out.
 */
export function AttentionRail({
  items,
  campaignId,
}: {
  items: AttentionItem[];
  campaignId: string;
}) {
  const [expanded, setExpanded] = useState(false);

  // The empty state is the good news, so it reads as good news — the card is
  // titled for the verdict, not for the section.
  if (items.length === 0) {
    return (
      <OverviewCard title="You're all set" className="gap-2">
        <p className="text-sm text-secondary-foreground">
          Nothing is failing, overdue, or waiting on you right now. If
          something comes up, it'll show up here.
        </p>
      </OverviewCard>
    );
  }

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
