import { useRef, useState } from 'react'
import { PageBottomFader } from '@/components/page-primitives/PageBottomFader'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { useAtScrollEnd } from '@/components/page-primitives/useAtScrollEnd'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { IdeaListSearch } from '@/lib/ideaFilter'
import { IdeasQuerySurface } from './query/IdeasQuerySurface'

/**
 * Ideas — capture at the top, then the list narrowed by the smart filter and
 * read by pile (CON-388).
 *
 * **Why this and not a board.** A kanban is a good picture of work in flight:
 * a handful of cards, each in a stage, moving left to right as somebody does
 * something to them. A backlog of ideas is neither of those things. It is one
 * big undifferentiated pile that has to be cheap to add to and occasionally
 * gets *answered* — and dragging a card out of a column is a fine way to move
 * the third item of nine and a miserable way to answer the forty-seventh of
 * two hundred. So the same piles are here as counts you switch between rather
 * than columns you drag across.
 *
 * **And the answering happens on the row, not in a mode of its own.** The
 * decision was never the slow part — reading the line is, and the line is
 * already legible in the list. The row carries the sentence and the three
 * answers, which is the whole of triage, so triage is just using the list.
 *
 * **The counts are the navigation and they always sum to the list.** Every
 * idea is in exactly one pile, which is why a woken postponement is counted
 * as undecided and not also as later — the server's rule now, since the list
 * is its answer to the address (`lib/ideaFilter`).
 *
 * One component for both levels. The campaign's Ideas page is this with
 * `campaignId` set: the same rows, scoped, and captures made there belong to
 * that campaign.
 *
 * **The post page's scroll frame** (CON-392), at both levels: the header
 * sticky inside one `ScrollArea`, carrying its own 80px fade; the capture
 * field, the sentence, the piles and the list scrolling under it, the list's
 * bands pinning at the header's foot (`pinnedBands`); `PageBottomFader` along
 * the bottom. The campaign layout hands this section its whole page, as it
 * does Assets, so the header is drawn here at both levels.
 */
export function IdeasSurface({
  campaignId = null,
  /** The page header's title: "Ideas", or the campaign's "… Ideas". */
  heading,
  search,
  onSearchChange,
}: {
  campaignId?: string | null
  heading: string
  /** The list's address: its filter, pile, sort and grouping. */
  search: IdeaListSearch
  onSearchChange: (next: IdeaListSearch) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const atEnd = useAtScrollEnd(scrollRef)
  /** Whether the list has a further page to load, as the list reports it. */
  const [hasMore, setHasMore] = useState(false)
  const body = (
    <IdeasQuerySurface
      campaignId={campaignId}
      search={search}
      onSearchChange={onSearchChange}
      onHasMoreChange={setHasMore}
    />
  )

  return (
    <PageContainer variant="fullFlex" className="page-content-motion">
      <div className="relative flex min-h-0 flex-1">
        <ScrollArea
          ref={scrollRef}
          className="min-h-0 flex-1"
          type="scroll"
          scrollHideDelay={350}
        >
          <PageHeader title={heading} />
          <div className="px-3 lg:px-6">{body}</div>
        </ScrollArea>
        {/* Gone once the list has nothing below it: scrolled to its end
            with no further page to load. */}
        <PageBottomFader hidden={atEnd && !hasMore} />
      </div>
    </PageContainer>
  )
}
