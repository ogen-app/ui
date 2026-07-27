import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { NotePencilIcon, SparkleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button.tsx";
import { ModalContainer } from "@/components/ui/modal.tsx";
import { StatusBadge } from "@/components/ui/status-badge.tsx";
import {
  BRIEF_FIELD_LABELS,
  briefPosture,
} from "@/lib/campaignReadiness.ts";
import { relativeTime } from "@/lib/relativeTime.ts";
import type { Campaign } from "@/types/campaigns";
import { CardHeaderLink, CollapsedCard, OverviewCard } from "./OverviewCard.tsx";

export function BriefModule({ campaign }: { campaign: Campaign }) {
  const posture = briefPosture(campaign);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const aiModal = (
    <AiBriefModal
      campaignId={campaign.id}
      isOpen={aiModalOpen}
      onClose={() => setAiModalOpen(false)}
    />
  );

  if (posture.state === "complete") {
    return (
      <CollapsedCard
        title="Brief"
        target="brief"
        campaignId={campaign.id}
        label="Edit the brief"
      >
        <StatusBadge tone="positive" label="Brief is in good shape" />
        <span
          className="ml-auto text-xs text-tertiary-foreground shrink-0"
          title={new Date(campaign.updated_at).toLocaleString()}
        >
          Updated {relativeTime(campaign.updated_at)}
        </span>
      </CollapsedCard>
    );
  }

  if (posture.state === "partial") {
    return (
      <OverviewCard
        title="Brief"
        action={
          <CardHeaderLink
            target="brief"
            campaignId={campaign.id}
            label="Edit the brief"
          />
        }
      >
        <StatusBadge tone="warn" label="Brief is incomplete" />
        <p className="text-sm text-secondary-foreground">
          Still missing:{" "}
          {posture.missing
            .map((f) => BRIEF_FIELD_LABELS[f].toLowerCase())
            .join(", ")}
          .
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="defaultInverted" size="sm" asChild>
            <Link to="/campaigns/$campaignId/brief" params={{ campaignId: campaign.id }}>
              <NotePencilIcon />
              <span>COMPLETE THE BRIEF</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAiModalOpen(true)}>
            <SparkleIcon />
            <span>GENERATE WITH AI</span>
          </Button>
        </div>
        {aiModal}
      </OverviewCard>
    );
  }

  return (
    <OverviewCard title="Start with the brief">
      <p className="text-sm text-secondary-foreground">
        The brief is not filled in yet. It tells Ogen what this campaign is
        about — who it targets, what it says, how it sounds — and grounds
        everything the AI generates for it.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="defaultInverted" asChild>
          <Link to="/campaigns/$campaignId/brief" params={{ campaignId: campaign.id }}>
            <NotePencilIcon />
            <span>WRITE IT YOURSELF</span>
          </Link>
        </Button>
        <Button variant="outline" onClick={() => setAiModalOpen(true)}>
          <SparkleIcon />
          <span>GENERATE WITH AI</span>
        </Button>
      </div>
      {aiModal}
    </OverviewCard>
  );
}

/**
 * Entry point for AI brief generation (CON-120 §7): the guided Q&A itself is
 * deferred to a follow-up ticket, so this teaches the intended workflow and
 * routes to the manual path meanwhile.
 */
function AiBriefModal({
  campaignId,
  isOpen,
  onClose,
}: {
  campaignId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <ModalContainer isOpen={isOpen} onClose={onClose} title="Generate the brief with AI">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-secondary-foreground">
          Soon, Ogen will interview you — a short Q&A about your product, your
          audience, and what this campaign should achieve — and draft the whole
          brief from your answers.
        </p>
        <p className="text-sm text-secondary-foreground">
          This guided session isn't available yet. In the meantime you can
          write the brief yourself; even a rough draft helps the AI generate
          better content.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button variant="defaultInverted" asChild>
            <Link to="/campaigns/$campaignId/brief" params={{ campaignId }}>
              <NotePencilIcon />
              <span>WRITE IT MANUALLY</span>
            </Link>
          </Button>
        </div>
      </div>
    </ModalContainer>
  );
}
