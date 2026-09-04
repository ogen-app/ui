import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { NotePencilIcon, SparkleIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button.tsx'
import { ModalContainer } from '@/components/ui/modal.tsx'
import { StatusBadge } from '@/components/ui/status-badge.tsx'
import { formatTitle } from '@/lib'
import { BRIEF_FIELD_LABELS, briefPosture } from '@/lib/campaignReadiness.ts'
import { relativeTime } from '@/lib/relativeTime.ts'
import { formatDate } from '@/lib/intl'
import type { Campaign } from '@/types/campaigns'
import { CallToAction } from './CallToAction.tsx'
import { CollapsedCard, OverviewCard } from './OverviewCard.tsx'
import { useFeatureFlag } from '@/config/featureFlags'

export function BriefModule({ campaign }: { campaign: Campaign }) {
  // With Brand on, persona and tone are chosen rather than written, so the
  // brief is measured against what is left of it.
  const posture = briefPosture(campaign, useFeatureFlag('brand-materials'))
  const [aiModalOpen, setAiModalOpen] = useState(false)

  const aiModal = (
    <AiBriefModal
      campaignId={campaign.id}
      isOpen={aiModalOpen}
      onClose={() => setAiModalOpen(false)}
    />
  )

  if (posture.state === 'complete') {
    return (
      <CollapsedCard
        section="brief"
        target="brief"
        campaignId={campaign.id}
        status={<StatusBadge tone="positive" label="Brief is in good shape" />}
      >
        <span
          className="min-w-0 flex-1 truncate"
          title={
            formatDate(campaign.updated_at, {
              dateStyle: 'long',
              timeStyle: 'short',
            }) ?? undefined
          }
        >
          {formatTitle(campaign.name, 'Untitled campaign')}, updated{' '}
          {relativeTime(campaign.updated_at)}
        </span>
      </CollapsedCard>
    )
  }

  if (posture.state === 'partial') {
    return (
      <OverviewCard
        section="brief"
        status={<StatusBadge tone="warn" label="Brief is incomplete" />}
        link={{ target: 'brief', campaignId: campaign.id }}
      >
        <CallToAction
          headline={WHY_THE_BRIEF_MATTERS}
          support={
            <>
              Still missing:{' '}
              {posture.missing
                .map((f) => BRIEF_FIELD_LABELS[f].toLowerCase())
                .join(', ')}
              .
            </>
          }
        >
          <BriefActions
            campaignId={campaign.id}
            writeLabel="COMPLETE THE BRIEF"
            onGenerate={() => setAiModalOpen(true)}
          />
        </CallToAction>
        {aiModal}
      </OverviewCard>
    )
  }

  return (
    <OverviewCard
      section="brief"
      status={<StatusBadge tone="warn" label="Brief is empty" />}
    >
      <CallToAction
        headline={WHY_THE_BRIEF_MATTERS}
        support="Nothing is filled in yet — this is the place to start."
      >
        <BriefActions
          campaignId={campaign.id}
          writeLabel="WRITE IT YOURSELF"
          onGenerate={() => setAiModalOpen(true)}
        />
      </CallToAction>
      {aiModal}
    </OverviewCard>
  )
}

/**
 * Said the same way in both states: the brief is not paperwork, it is the
 * input every generated post is written from.
 */
const WHY_THE_BRIEF_MATTERS =
  'The brief is what Ogen writes from — who this campaign talks to, what it claims, and how it sounds. Everything generated for it is only as good as this.'

function BriefActions({
  campaignId,
  writeLabel,
  onGenerate,
}: {
  campaignId: string
  writeLabel: string
  onGenerate: () => void
}) {
  return (
    <>
      <Button variant="defaultInverted" size="xl" asChild>
        <Link to="/campaigns/$campaignId/brief" params={{ campaignId }}>
          <NotePencilIcon />
          <span>{writeLabel}</span>
        </Link>
      </Button>
      <Button variant="outline" size="xl" onClick={onGenerate}>
        <SparkleIcon />
        <span>GENERATE WITH OGEN</span>
      </Button>
    </>
  )
}

/**
 * Entry point for Ogen brief generation (CON-120 §7): the guided Q&A itself is
 * deferred to a follow-up ticket, so this teaches the intended workflow and
 * routes to the manual path meanwhile.
 */
function AiBriefModal({
  campaignId,
  isOpen,
  onClose,
}: {
  campaignId: string
  isOpen: boolean
  onClose: () => void
}) {
  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={onClose}
      title="Generate the brief with Ogen"
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-secondary-foreground">
          Soon, Ogen will interview you — a short Q&A about your product, your
          audience, and what this campaign should achieve — and draft the whole
          brief from your answers.
        </p>
        <p className="text-sm text-secondary-foreground">
          This guided session isn't available yet. In the meantime you can write
          the brief yourself; even a rough draft helps Ogen generate better
          content.
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
  )
}
