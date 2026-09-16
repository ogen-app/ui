import { Skeleton } from '@/components/ui/skeleton.tsx'
import { StatusBadge } from '@/components/ui/status-badge.tsx'
import { AssetKindTally } from '@/components/content/AssetKindTally'
import { useAssets } from '@/hooks/useContent'
import { campaignAssets, seedsWholeBank } from '@/lib/campaignSources'
import type { Campaign } from '@/types/campaigns'
import { CollapsedCard } from './OverviewCard.tsx'

/**
 * The Foundation row on the campaign Overview: what this campaign has been
 * given to write from.
 *
 * It used to report which of three source modes the campaign was in. There are
 * no modes any more (CON-210) — a campaign owns a set of documents, and the
 * only thing worth saying here is what is in it.
 *
 * Titled from the section table rather than by hand (`lib/campaignSections`),
 * so this card, the sidebar row and the link all say one word. It used to say
 * "Documents" to stay out of the way of the card above, which was headed
 * "Content" while it was about posts; that card is titled from the table too
 * now, and says Posts.
 *
 * **It is the level-1 twin of Foundation's Sources card**, and it says the same
 * thing the same way: the kinds of document that are in there and how many of
 * each (`AssetKindTally`). The counts are the whole body, and the one line of
 * prose that used to be here has gone — the badge says how much, the row says
 * what sort, and a sentence saying it is what the campaign writes from is the
 * card's own title read twice.
 *
 * **Still counts documents, though the page it opens now holds more than
 * documents.** The rest of that page — the guardrails, the voice and the
 * audience — is either the workspace's or already stated on the Strategy card
 * above, and a count of things this campaign did not choose is not a reading of
 * how ready it is.
 */
export function DocumentsModule({ campaign }: { campaign: Campaign }) {
  // The badge is counted from the campaign alone, so it is right before the
  // asset list arrives — and an id whose asset has since been deleted still
  // counts in it, until the page below is opened. The breakdown needs the
  // documents themselves, so it waits; the query is the one the Foundation
  // page and the workspace bank already share, so this is usually a cache read
  // rather than a fetch this screen paid for.
  const count = campaign.asset_ids.length
  const { data: assets } = useAssets()
  const held = assets ? campaignAssets(assets, campaign) : []

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
      {/* A bar the height of the row rather than nothing, so the card does
          not grow under the pointer as the list lands. */}
      {!assets ? (
        <Skeleton className="h-5 w-48" />
      ) : held.length > 0 ? (
        <AssetKindTally assets={held} />
      ) : (
        <span className="min-w-0 flex-1 truncate text-tertiary-foreground">
          None of its documents still exist.
        </span>
      )}
    </CollapsedCard>
  )
}
