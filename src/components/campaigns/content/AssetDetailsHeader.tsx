import { Link } from '@tanstack/react-router'
import {
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

type Props = {
  /** The campaign this document belongs to — where the back caret goes. */
  campaignId: string
  /** Autosave in flight — shows the pulsing cloud instead of nothing. */
  saving: boolean
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
 * version history, no settings. What is left is the overflow, and the two
 * things you can do to a document that is not editing it.
 */
export function AssetDetailsHeader({
  campaignId,
  saving,
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
    />
  )
}
