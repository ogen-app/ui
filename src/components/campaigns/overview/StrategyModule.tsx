import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { NotePencilIcon, SparkleIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button.tsx'
import { ModalContainer } from '@/components/ui/modal.tsx'
import { StatusBadge } from '@/components/ui/status-badge.tsx'
import { LineItem } from '@/components/ui/line-item'
import {
  BRIEF_FIELD_LABELS,
  briefPosture,
  channelReadiness,
  setupChecks,
} from '@/lib/campaignReadiness.ts'
import type { PlatformView } from '@/lib/platformDictionary'
import type { Campaign } from '@/types/campaigns'
import { CallToAction } from './CallToAction.tsx'
import { CollapsedCard, OverviewCard, SectionLink } from './OverviewCard.tsx'

/**
 * The Strategy card — is this campaign decided?
 *
 * It was two cards, Brief and Setup, for as long as the brief and the settings
 * were two pages. They asked one question between them and answered it in
 * halves: a campaign with a perfect brief and no channels is not ready, and
 * neither is one configured to the minute with nothing to say. Now that both
 * live on one page, they are one card, and the check that fails is the one the
 * user is sent to fix.
 *
 * The brief keeps its argument, though, and that is why it is not merely a
 * third row in the list: dates and channels are settings a person can guess at,
 * while an empty brief is the campaign not existing yet. When it is missing,
 * the card is about writing it and the two settings rows sit underneath.
 */
export function StrategyModule({
  campaign,
  platformViews,
}: {
  campaign: Campaign
  platformViews: PlatformView[]
}) {
  // Persona and tone are chosen in Foundation rather than written here, so the
  // brief is measured against what is left of it.
  const posture = briefPosture(campaign)
  const checks = setupChecks(campaign, platformViews)
  const [aiModalOpen, setAiModalOpen] = useState(false)

  const briefOk = posture.state === 'complete'
  const done = checks.filter((c) => c.ok).length + (briefOk ? 1 : 0)
  const total = checks.length + 1

  const aiModal = (
    <AiBriefModal
      campaignId={campaign.id}
      isOpen={aiModalOpen}
      onClose={() => setAiModalOpen(false)}
    />
  )

  if (done === total) {
    // The channels row already words the selection the way this screen means
    // it — which channels can publish, not how many are ticked.
    // Dates first, then the channels themselves — the checks above already
    // passed, so this line is a description of the campaign, not a verdict.
    const summary = [
      checks.find((c) => c.id === 'dates')!.detail,
      ...channelReadiness(campaign, platformViews).selected,
    ].join(', ')
    return (
      <CollapsedCard
        section="strategy"
        target="strategy"
        campaignId={campaign.id}
        status={<StatusBadge tone="positive" label="Strategy is set" />}
      >
        <span className="min-w-0 flex-1 truncate">{summary}</span>
      </CollapsedCard>
    )
  }

  return (
    <OverviewCard
      section="strategy"
      status={
        briefOk ? (
          <StatusBadge tone="progress" label={`${done} of ${total} done`} />
        ) : (
          <StatusBadge
            tone="warn"
            label={
              posture.state === 'empty'
                ? 'Brief is empty'
                : 'Brief is incomplete'
            }
          />
        )
      }
      link={{ target: 'strategy', campaignId: campaign.id }}
    >
      {!briefOk && (
        <CallToAction
          headline={WHY_THE_BRIEF_MATTERS}
          support={
            posture.state === 'empty' ? (
              'Nothing is filled in yet — this is the place to start.'
            ) : (
              <>
                Still missing:{' '}
                {posture.missing
                  .map((f) => BRIEF_FIELD_LABELS[f].toLowerCase())
                  .join(', ')}
                .
              </>
            )
          }
        >
          <BriefActions
            campaignId={campaign.id}
            writeLabel={
              posture.state === 'empty'
                ? 'WRITE IT YOURSELF'
                : 'COMPLETE THE BRIEF'
            }
            onGenerate={() => setAiModalOpen(true)}
          />
        </CallToAction>
      )}
      {/* The settings rows stay listed even when the brief is the headline:
          they are the rest of the answer to "is this decided", and hiding them
          behind a finished brief would make the card change shape twice. */}
      <ul className="flex flex-col">
        {checks.map((check) => (
          <li key={check.id}>
            <LineItem
              asChild
              indicator={{ kind: 'task', done: check.ok }}
              label={check.label}
              details={check.detail}
            >
              <SectionLink target={check.fix} campaignId={campaign.id} />
            </LineItem>
          </li>
        ))}
      </ul>
      {aiModal}
    </OverviewCard>
  )
}

/**
 * Said the same way in every state: the brief is not paperwork, it is the
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
        <Link to="/campaigns/$campaignId/strategy" params={{ campaignId }}>
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
            <Link to="/campaigns/$campaignId/strategy" params={{ campaignId }}>
              <NotePencilIcon />
              <span>WRITE IT MANUALLY</span>
            </Link>
          </Button>
        </div>
      </div>
    </ModalContainer>
  )
}
