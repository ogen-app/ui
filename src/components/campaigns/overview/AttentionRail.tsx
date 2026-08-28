import { useState } from "react";
import { CheckCircleIcon, WarningIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button.tsx";
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
      <OverviewCard
        title="You're all set"
        // The card is the only one on the screen that isn't a section, so it
        // is the only one whose mark says a verdict rather than a place — and
        // the verdict has two faces. Both are drawn as lines, like the section
        // glyphs they sit in a column with: a filled mark on a header row of
        // outlines reads as the one badge on the screen, which is more weight
        // than "nothing is wrong" should carry.
        icon={
          <CheckCircleIcon className="size-5 text-positive" aria-hidden />
        }
        className="gap-2"
      >
        <p className="text-sm text-secondary-foreground">
          Nothing is failing, overdue, or waiting on you right now. If
          something comes up, it'll show up here.
        </p>
      </OverviewCard>
    );
  }

  // Items arrive sorted by severity, so capping keeps the most urgent rows and
  // drops hygiene nudges first. Collapsing has to pay for itself: the button
  // costs a row, so hiding one item saves nothing and one over the cap just
  // renders. Past that the cap holds and the button is worth its place.
  const collapsible = items.length > MAX_ATTENTION_ITEMS + 1;
  const shown =
    expanded || !collapsible ? items : items.slice(0, MAX_ATTENTION_ITEMS);
  const hidden = items.length - shown.length;

  return (
    <OverviewCard
      title="Needs attention"
      icon={<WarningIcon className="size-5 text-warning" aria-hidden />}
    >
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
        {hidden > 0 && (
          // Inside the list, not under it: the button is the next row, so it
          // takes a row's band and no more — and its label lines up with the
          // labels above it across the same reserved indicator slot.
          <li>
            <Button
              variant="ghost"
              size="excluded"
              className="-mx-2 flex h-10 w-full items-center justify-start gap-3 px-2"
              onClick={() => setExpanded(true)}
            >
              <span className="w-4 shrink-0" aria-hidden />
              <span>SHOW {hidden} MORE</span>
            </Button>
          </li>
        )}
      </ul>
    </OverviewCard>
  );
}
