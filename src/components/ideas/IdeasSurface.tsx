import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageHeader } from '@/components/page-primitives/PageHeader'
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
 */
export function IdeasSurface({
  campaignId = null,
  /** Given at workspace level, where this owns the page header. */
  heading,
  search,
  onSearchChange,
}: {
  campaignId?: string | null
  heading?: string
  /** The list's address: its filter, pile, sort and grouping. */
  search: IdeaListSearch
  onSearchChange: (next: IdeaListSearch) => void
}) {
  const body = (
    <IdeasQuerySurface
      campaignId={campaignId}
      search={search}
      onSearchChange={onSearchChange}
    />
  )

  // The campaign layout owns the header for its sections, so at that level
  // this renders bare, in the frame the layout gives it.
  if (!heading) return body

  // The Assets page's frame: the header, then a body that does not scroll —
  // the list scrolls itself, so its group bands can stay pinned.
  return (
    <PageContainer variant="fullFlex">
      <div className="flex min-h-0 flex-1 flex-col">
        <PageHeader title={heading} />
        <div className="grid min-h-0 flex-1 overflow-hidden px-3 lg:px-6">
          {body}
        </div>
      </div>
    </PageContainer>
  )
}
