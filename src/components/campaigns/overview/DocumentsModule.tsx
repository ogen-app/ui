import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import { StatusBadge } from '@/components/ui/status-badge.tsx'
import { AssetKindTally } from '@/components/content/AssetKindTally'
import { ASSET_LIST_KEY } from '@/hooks/useContent'
import { tallyKindFacet } from '@/lib/assetKind'
import { seedsWholeBank } from '@/lib/campaignSources'
import { queryAssets } from '@/services/api/content'
import type { Campaign } from '@/types/campaigns'
import { CollapsedCard } from './OverviewCard.tsx'

/**
 * The Assets row on the campaign Overview: what this campaign has been given
 * to write from.
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
 * **It is the level-1 twin of the workspace's Assets module**, and it says the
 * same thing the same way: the kinds of document that are in there and how many
 * of each (`AssetKindTally`). The counts are the whole body, and the one line of
 * prose that used to be here has gone — the badge says how much, the row says
 * what sort, and a sentence saying it is what the campaign writes from is the
 * card's own title read twice.
 *
 * It counted documents while the page it opened was headed Foundation and held
 * the campaign's inherited brand on top of them; the page is the documents now
 * and nothing else, so the card and its destination finally say the same word.
 */
export function DocumentsModule({ campaign }: { campaign: Campaign }) {
  // The badge is counted from the campaign alone, so it is right before the
  // breakdown arrives — and an id whose asset has since been deleted still
  // counts in it. The breakdown is the server's: the Assets query scoped to
  // this campaign, asked for its kind and status counts and one row, so the
  // card costs the same for four documents as for four hundred.
  const count = campaign.asset_ids.length
  const breakdown = useQuery({
    queryKey: [...ASSET_LIST_KEY, 'breakdown', campaign.id],
    queryFn: () =>
      queryAssets({
        scope_campaign: campaign.id,
        facets: 'kind,status',
        limit: '1',
      }),
    enabled: count > 0 && !seedsWholeBank(campaign),
  })
  const facets = breakdown.data?.facets
  const tally = facets?.kind ? tallyKindFacet(facets.kind) : []
  const status = (value: string) =>
    facets?.status?.find((f) => f.value === value)?.count ?? 0

  // A campaign nobody has opened since the whole-bank mode was retired still
  // generates from every document in the workspace — "brief alone" would be
  // the opposite of the truth. Opening the page below pins it to a real set.
  if (seedsWholeBank(campaign)) {
    return (
      <CollapsedCard section="assets" target="assets" campaignId={campaign.id}>
        <span className="min-w-0 flex-1 truncate text-tertiary-foreground">
          This campaign still draws on the whole content bank — open Assets to
          see its documents.
        </span>
      </CollapsedCard>
    )
  }

  if (count === 0) {
    return (
      <CollapsedCard section="assets" target="assets" campaignId={campaign.id}>
        <span className="min-w-0 flex-1 truncate text-tertiary-foreground">
          This campaign writes from its brief alone.
        </span>
      </CollapsedCard>
    )
  }

  return (
    <CollapsedCard
      section="assets"
      target="assets"
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
      {!breakdown.data ? (
        <Skeleton className="h-5 w-48" />
      ) : tally.length > 0 ? (
        <AssetKindTally
          tally={tally}
          waiting={status('pending')}
          unreadable={status('failed') + status('partial')}
        />
      ) : (
        <span className="min-w-0 flex-1 truncate text-tertiary-foreground">
          None of its documents still exist.
        </span>
      )}
    </CollapsedCard>
  )
}
