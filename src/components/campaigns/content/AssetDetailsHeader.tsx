import { Link } from '@tanstack/react-router'
import {
  ArrowsClockwiseIcon,
  ArrowSquareOutIcon,
  CaretLeftIcon,
  DotsThreeVerticalIcon,
  DownloadSimpleIcon,
  TrashIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { SaveStatus } from '@/components/page-primitives/SaveStatus'
import { pageUrlLabel } from '@/lib/webPageUrl'

type Props = {
  /** The campaign this document belongs to — where the back caret goes. */
  campaignId: string
  /** Autosave in flight — shows the pulsing cloud instead of nothing. */
  saving: boolean
  /** The page this was scraped from, for a URL document (CON-222). */
  sourceUrl?: string | null
  /** Re-scrape the source. Only passed for a document that has one. */
  onRefreshSource?: () => void
  onDownloadMarkdown: () => void
  onDelete: () => void
}

/**
 * A campaign document's top bar, built to the post editor's shape: back to the
 * list on the left, the save state centred, the overflow on the right. Both
 * are documents you are inside, and a reader who has just come from a post
 * should not have to re-learn where the chrome went.
 *
 * The title is deliberately absent here, as on a post: it is the first field
 * of the document below, and printing it twice makes the editable one look
 * like a caption. The back caret is what the breadcrumb used to be — this page
 * has exactly one place to return to, so a trail of one link was a label with
 * an arrow's job.
 *
 * The right corner is thinner than a post's because a document has no views to
 * switch: no preview (it is not published anywhere), no quality score, no
 * version history, no settings. What is left is the overflow, and the few
 * things you can do to a document that is not editing it.
 *
 * A scraped page adds the one fact it has that a note doesn't: where it came
 * from. It sits beside the back caret as a link out, because provenance is a
 * property of the document and belongs in the frame around it — not in the body,
 * which is the page's own text and gets overwritten on every refresh.
 */
export function AssetDetailsHeader({
  campaignId,
  saving,
  sourceUrl,
  onRefreshSource,
  onDownloadMarkdown,
  onDelete,
}: Props) {
  return (
    <PageHeader
      back={
        <Button
          variant="headerIcon"
          size="excluded"
          asChild
          aria-label="Back to this campaign's content"
        >
          <Link to="/campaigns/$campaignId/content" params={{ campaignId }}>
            <CaretLeftIcon className="size-5" />
          </Link>
        </Button>
      }
      center={<SaveStatus saving={saving} />}
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="smIcon" aria-label="More options">
              <DotsThreeVerticalIcon weight="regular" className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onRefreshSource && (
              <DropdownMenuItem onSelect={onRefreshSource}>
                <ArrowsClockwiseIcon />
                <span>Read the page again</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={onDownloadMarkdown}>
              <DownloadSimpleIcon />
              <span>Download as Markdown</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <TrashIcon />
              <span>Delete document</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer noopener"
          title={sourceUrl}
          className="flex min-w-0 items-center gap-1.5 text-xs text-tertiary-foreground hover:text-foreground"
        >
          <span className="truncate">{pageUrlLabel(sourceUrl)}</span>
          <ArrowSquareOutIcon className="size-3.5 shrink-0" />
        </a>
      )}
    </PageHeader>
  )
}
