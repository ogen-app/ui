import { StatusBadge } from '@/components/ui/status-badge.tsx'
import { seedsWholeBank } from '@/lib/campaignSources'
import type { Campaign } from '@/types/campaigns'
import { CollapsedCard } from './OverviewCard.tsx'

/**
 * The Foundation row on the campaign Overview: how much this campaign has been
 * given to write from.
 *
 * It used to report which of three source modes the campaign was in. There are
 * no modes any more (CON-210) — a campaign owns a set of documents, and the
 * only thing worth saying here is how big it is.
 *
 * Titled from the section table rather than by hand (`lib/campaignSections`),
 * so this card, the sidebar row and the link all say one word. It used to say
 * "Documents" to stay out of the way of the card above, which was headed
 * "Content" while it was about posts; that card is titled from the table too
 * now, and says Posts.
 *
 * **Still counts documents, though the page it opens now holds more than
 * documents.** The rest of that page — the guardrails, the voice and the
 * audience — is either the workspace's or already stated on the Strategy card
 * above, and a count of things this campaign did not choose is not a reading of
 * how ready it is. The one line says where the rest of it can be read.
 */
export function DocumentsModule({ campaign }: { campaign: Campaign }) {
  // Counted from the campaign alone, not against the asset list: the Overview
  // would otherwise pull every asset's full text to render one number. An id
  // whose asset has since been deleted therefore still counts here, and stops
  // counting the moment anyone opens the page below.
  const count = campaign.asset_ids.length

  // A campaign nobody has opened since the whole-bank mode was retired still
  // generates from every document in the workspace — "brief alone" would be
  // the opposite of the truth. Opening the page below pins it to a real set.
  if (seedsWholeBank(campaign)) {
    return (
      <CollapsedCard
        section="foundation"
        target="foundation"
        campaignId={campaign.id}
      >
        <span className="min-w-0 flex-1 truncate text-tertiary-foreground">
          This campaign still draws on the whole content bank — open Foundation
          to see its documents.
        </span>
      </CollapsedCard>
    )
  }

  if (count === 0) {
    return (
      <CollapsedCard
        section="foundation"
        target="foundation"
        campaignId={campaign.id}
      >
        <span className="min-w-0 flex-1 truncate text-tertiary-foreground">
          This campaign writes from its brief alone.
        </span>
      </CollapsedCard>
    )
  }

  return (
    <CollapsedCard
      section="foundation"
      target="foundation"
      campaignId={campaign.id}
      status={
        <StatusBadge
          tone="positive"
          label={`${count} ${count === 1 ? 'document' : 'documents'}`}
        />
      }
    >
      <span className="min-w-0 flex-1 truncate">
        What this campaign writes from, with the workspace’s brand material.
      </span>
    </CollapsedCard>
  )
}
