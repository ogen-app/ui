import { StatusBadge } from "@/components/ui/status-badge.tsx";
import { setupChecks } from "@/lib/campaignReadiness.ts";
import type { PlatformView } from "@/lib/platformDictionary";
import type { Campaign } from "@/types/campaigns";
import { LineItem } from "./LineItem.tsx";
import {
  CardHeaderLink,
  CollapsedCard,
  OverviewCard,
  SectionLink,
} from "./OverviewCard.tsx";

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
    const channels = campaign.target_platforms.length;
    const dates = checks.find((c) => c.id === "dates")!.detail;
    return (
      <CollapsedCard
        title="Setup"
        target="settings"
        campaignId={campaign.id}
        label="Open campaign settings"
      >
        <StatusBadge tone="positive" label="Settings are good" />
        <span className="text-sm text-secondary-foreground truncate">
          Running on {channels} {channels === 1 ? "channel" : "channels"}
          {campaign.estimated_post_count
            ? `, ${campaign.estimated_post_count} posts planned`
            : ""}
          . {dates}.
        </span>
      </CollapsedCard>
    );
  }

  return (
    <OverviewCard
      title="Setup"
      action={
        <CardHeaderLink
          target="settings"
          campaignId={campaign.id}
          label="Open campaign settings"
        />
      }
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
