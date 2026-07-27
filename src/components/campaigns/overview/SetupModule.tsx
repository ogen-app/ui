import { CheckCircleIcon, CircleIcon } from "@phosphor-icons/react";
import { StatusBadge } from "@/components/ui/status-badge.tsx";
import { setupChecks } from "@/lib/campaignReadiness.ts";
import type { PlatformView } from "@/lib/platformDictionary";
import type { Campaign } from "@/types/campaigns";
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
      <ul className="flex flex-col gap-2.5">
        {checks.map((check) => (
          <li key={check.id} className="flex items-start gap-2.5">
            {check.ok ? (
              <CheckCircleIcon
                weight="fill"
                className="size-4 mt-0.5 shrink-0 text-positive"
              />
            ) : (
              <CircleIcon className="size-4 mt-0.5 shrink-0 text-senary-foreground" />
            )}
            <div className="flex-1 min-w-0 text-sm">
              <span>{check.label}</span>
              <span className="text-tertiary-foreground"> · {check.detail}</span>
            </div>
            {!check.ok && (
              <SectionLink
                target={check.fix}
                campaignId={campaign.id}
                className="text-xs text-tertiary-foreground hover:text-primary-foreground shrink-0 mt-0.5"
              >
                Fix
              </SectionLink>
            )}
          </li>
        ))}
      </ul>
    </OverviewCard>
  );
}
