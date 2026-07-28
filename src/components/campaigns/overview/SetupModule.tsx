import { StatusBadge } from "@/components/ui/status-badge.tsx";
import { channelReadiness, setupChecks } from "@/lib/campaignReadiness.ts";
import type { PlatformView } from "@/lib/platformDictionary";
import type { Campaign } from "@/types/campaigns";
import { LineItem } from "./LineItem.tsx";
import { CollapsedCard, OverviewCard, SectionLink } from "./OverviewCard.tsx";

export function SetupModule({
  campaign,
  platformViews,
}: {
  campaign: Campaign;
  platformViews: PlatformView[];
}) {
  const checks = setupChecks(campaign, platformViews);
  const allOk = checks.every((c) => c.ok);

  if (allOk) {
    // The channels row already words the selection the way this screen means
    // it — which channels can publish, not how many are ticked.
    // Dates first, then the channels themselves — the checks above already
    // passed, so this line is a description of the campaign, not a verdict.
    const summary = [
      checks.find((c) => c.id === "dates")!.detail,
      ...channelReadiness(campaign, platformViews).selected,
    ].join(", ");
    return (
      <CollapsedCard
        title="Setup"
        target="settings"
        campaignId={campaign.id}
        label="Open campaign settings"
        status={<StatusBadge tone="positive" label="Settings are good" />}
      >
        <span className="min-w-0 flex-1 truncate">{summary}</span>
      </CollapsedCard>
    );
  }

  const done = checks.filter((c) => c.ok).length;

  return (
    <OverviewCard
      title="Setup"
      status={
        <StatusBadge tone="progress" label={`${done} of ${checks.length} done`} />
      }
      link={{
        target: "settings",
        campaignId: campaign.id,
        label: "Open campaign settings",
      }}
    >
      <ul className="flex flex-col">
        {checks.map((check) => (
          <li key={check.id}>
            <LineItem
              asChild
              indicator={{ kind: "task", done: check.ok }}
              label={check.label}
              details={check.detail}
            >
              <SectionLink target={check.fix} campaignId={campaign.id} />
            </LineItem>
          </li>
        ))}
      </ul>
    </OverviewCard>
  );
}
