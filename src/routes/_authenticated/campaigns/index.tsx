import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button.tsx";
import { PageContainer } from "@/components/page-primitives/PageContainer.tsx";
import { PageLoader } from "@/components/page-primitives/PageLoader.tsx";
import { PageError } from "@/components/page-primitives/PageError.tsx";
import { PageHeader } from "@/components/page-primitives/PageHeader.tsx";
import { PageGridEmptyState } from "@/components/page-primitives/PageGridEmptyState.tsx";
import { PlusIcon } from "@phosphor-icons/react";
import { CampaignCard } from "@/components/campaigns/CampaignCard.tsx";
import { CreateCampaignDialog } from "@/components/campaigns/CreateCampaignDialog.tsx";
import { useCampaigns } from "@/hooks/useCampaigns.ts";

export const Route = createFileRoute("/_authenticated/campaigns/")({
  component: Campaigns,
});

function Campaigns() {
  const { data: campaigns, isLoading, isError } = useCampaigns();
  const [creating, setCreating] = useState(false);

  const hasCampaigns = !!(campaigns && campaigns.length > 0);

  if (isLoading) {
    return (
      <PageContainer>
        <PageLoader />
      </PageContainer>
    );
  }

  if (isError) {
    return (
      <PageContainer>
        <PageError header="Failed to load campaigns" />
      </PageContainer>
    );
  }

  // One scroll container owning the sticky header, the same shell as Overview
  // and Settings — cards pass under the header's gradient instead of stopping
  // at it. The header itself does not fade: this is the list you steer from,
  // so "Campaigns" and ADD CAMPAIGN stay legible however far you scroll.
  return (
    <PageContainer variant="fullFlex">
      <div className="h-0 grow overflow-y-auto flex flex-col">
        <PageHeader
          title="Campaigns"
          actions={
            <Button onClick={() => setCreating(true)} size="lg">
              <PlusIcon className="size-4" />
              <span>ADD CAMPAIGN</span>
            </Button>
          }
        />
        {hasCampaigns ? (
          <ul className="flex flex-col gap-3 px-3 lg:px-6 pt-4 pb-10">
            {campaigns!.map((campaign) => (
              <li key={campaign.id}>
                <CampaignCard campaign={campaign} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="grow grid px-3 lg:px-6 pb-6">
            <PageGridEmptyState
              title="No campaigns yet"
              subtitle="Create your first campaign to get started"
              actions={
                <Button
                  onClick={() => setCreating(true)}
                  variant="defaultInverted"
                >
                  <PlusIcon className="size-4" />
                  <span>ADD CAMPAIGN</span>
                </Button>
              }
            />
          </div>
        )}
      </div>
      <CreateCampaignDialog
        open={creating}
        onClose={() => setCreating(false)}
      />
    </PageContainer>
  );
}
