import { useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  BooksIcon,
  GlobeSimpleIcon,
  PlusIcon,
  UploadSimpleIcon,
  XIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { AssetGlyph } from '@/components/content/AssetGlyph'
import { AddWebPageModal } from '@/components/content/AddWebPageModal'
import { UploadModal } from '@/components/uploads/UploadModal'
import { AddSourcesModal } from '@/components/posts/sources/AddSourcesModal'
import { indexAssets, postAssets } from '@/lib/postSources'
import { addToCampaign } from '@/lib/campaignMembership'
import { retrievability } from '@/lib/campaignSources'
import { pageUrlLabel } from '@/lib/webPageUrl'
import { cn, formatTitle } from '@/lib'
import type { Asset } from '@/types/content'
import type { Post } from '@/types/posts'

/**
 * Where the control is drawn. The two differ only in how the list and its
 * entry point are arranged — `card` can afford a header row with the button
 * beside the heading; `rail` has no heading of its own (the collapse owns it)
 * and puts a full-width button under the list.
 */
export type SourcesLayout = 'card' | 'rail'

type Props = {
  post: Post
  changeDoc: (fn: (p: Post) => void) => void
  layout: SourcesLayout
}

/**
 * The whole of post-level sources: the list, the three ways to add to it, and
 * the writes. Both surfaces render this — the card in the post body and the
 * SOURCES section in the settings rail — so neither can drift from the other,
 * and a post open in both places edits one field through one path.
 *
 * That field is `used_asset_ids`, which is not a label on the post but the
 * post assistant's entire reading list: `listAssets` enumerates exactly these,
 * and chunk retrieval only reaches ids learned from that list. The quality
 * assessment reads them too. So an empty list is not an empty field — it is an
 * assistant working from the brief and the body alone.
 */
export function PostSourcesControl({ post, changeDoc, layout }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [webPageOpen, setWebPageOpen] = useState(false)
  /*
   * Radix hands focus back to the menu trigger as the menu closes, and does so
   * after the modal beneath has mounted — so the modal's field is focused and
   * then quietly un-focused, and the user types into nothing. Prevented only
   * for the item that opens a field: every other close should still return
   * focus to the button that was chosen.
   */
  const openingWebPage = useRef(false)

  /*
   * Documents the client has attached but the server has not yet echoed back.
   *
   * `used_assets` is hydrated on every read and write, so it catches up within
   * one autosave — but until it does, a row for a just-picked document would
   * have an id and no title. Kept rather than cleared, because the map below
   * lets the hydrated copy win anyway.
   */
  const [pending, setPending] = useState<Asset[]>([])
  const known = indexAssets(post.used_assets, pending)
  const rows = postAssets(post.used_asset_ids, known)

  const attach = (assets: Asset[]) => {
    const ids = assets.map((a) => a.id)
    setPending((prev) => [...prev, ...assets])
    changeDoc((d) => {
      const held = new Set(d.used_asset_ids)
      d.used_asset_ids = [
        ...d.used_asset_ids,
        ...ids.filter((id) => !held.has(id)),
      ]
    })
    // A post is inside a campaign, so anything it reads from belongs to that
    // campaign's Content too — otherwise the campaign would be missing a
    // document its own posts write from.
    void addToCampaign(post.campaign_id, ids)
  }

  const detach = (assetId: string) => {
    setPending((prev) => prev.filter((a) => a.id !== assetId))
    // Post-only: the campaign keeps the document, since its other posts may
    // still read from it. Deleting is the Content page's job.
    changeDoc((d) => {
      d.used_asset_ids = d.used_asset_ids.filter((id) => id !== assetId)
    })
  }

  const addButton = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(layout === 'rail' && 'w-full justify-center')}
        >
          <PlusIcon />
          <span>ADD SOURCE</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={layout === 'rail' ? 'start' : 'end'}
        onCloseAutoFocus={(e) => {
          if (!openingWebPage.current) return
          openingWebPage.current = false
          e.preventDefault()
        }}
      >
        <DropdownMenuItem onSelect={() => setPickerOpen(true)}>
          <BooksIcon />
          <span>Choose from content bank</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setUploadOpen(true)}>
          <UploadSimpleIcon />
          <span>Upload files</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            openingWebPage.current = true
            setWebPageOpen(true)
          }}
        >
          <GlobeSimpleIcon />
          <span>Add a web page</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const list =
    rows.length === 0 ? (
      <p className="text-sm text-tertiary-foreground">
        {layout === 'rail'
          ? 'Nothing yet — this post writes from the campaign brief alone.'
          : 'This post writes from the campaign brief alone. Add the documents it should also draw on — the assistant reads exactly what is listed here.'}
      </p>
    ) : (
      <ul className="flex flex-col">
        {rows.map(({ id, asset }) => (
          <SourceRow
            key={id}
            id={id}
            asset={asset}
            campaignId={post.campaign_id}
            layout={layout}
            onDetach={() => detach(id)}
          />
        ))}
      </ul>
    )

  const modals = (
    <>
      {/* Mounted only while open: it reads the whole content bank, and every
          document's markdown comes with it. See `AddSourcesModal`. */}
      {pickerOpen && (
        <AddSourcesModal
          onClose={() => setPickerOpen(false)}
          attachedIds={post.used_asset_ids}
          onAdd={attach}
        />
      )}
      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        campaignId={post.campaign_id}
        postId={post.id}
      />
      <AddWebPageModal
        isOpen={webPageOpen}
        onClose={() => setWebPageOpen(false)}
        destination="post"
        onSubmitted={(asset) => attach([asset])}
      />
    </>
  )

  if (layout === 'rail') {
    return (
      <div className="flex flex-col gap-3 pt-2 pb-4">
        {list}
        {addButton}
        {modals}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 min-w-0">
        <h2 className="flex items-center gap-2 min-w-0 text-xl font-display font-medium tracking-tight">
          Sources
          {rows.length > 0 && (
            <span className="font-normal text-tertiary-foreground">
              {rows.length}
            </span>
          )}
        </h2>
        {addButton}
      </div>
      {list}
      {modals}
    </div>
  )
}

/**
 * One document the post reads from.
 *
 * The right-hand note answers "is this actually reaching the assistant": a
 * `failed` or `partial` document is skipped by retrieval outright, so one
 * sitting in this list is silently inert — the single fact about a source that
 * a person cannot infer from its title. It survives into the rail, where space
 * is short, because it is the only thing here that is not already on the row.
 *
 * Removing detaches; it never deletes. The document keeps existing, in the
 * campaign and the bank, and the Content page is where it goes for good.
 */
function SourceRow({
  id,
  asset,
  campaignId,
  layout,
  onDetach,
}: {
  id: string
  asset: Asset | null
  campaignId: string
  layout: SourcesLayout
  onDetach: () => void
}) {
  const rail = layout === 'rail'
  const rowClass = cn(
    'group flex items-center border-b border-quaternary last:border-b-0',
    rail ? 'gap-2 py-2' : 'gap-3 py-2.5',
  )

  // An id whose document has not arrived yet — the post was attached to in
  // another tab and this copy has not refetched. It is a real source, so it is
  // listed rather than hidden; only its name is missing.
  if (!asset) {
    return (
      <li className={rowClass}>
        <span className="size-8 shrink-0 border border-quaternary" />
        <span className="flex-1 text-sm text-tertiary-foreground">
          Loading…
        </span>
      </li>
    )
  }

  const reach = retrievability(asset.status)
  const provisional = asset.type === 'URL' && asset.source_url === asset.title
  const label = provisional
    ? pageUrlLabel(asset.title)
    : formatTitle(asset.title)

  return (
    <li className={rowClass}>
      <AssetGlyph asset={asset} />
      <Link
        to="/campaigns/$campaignId/content/$assetId"
        params={{ campaignId, assetId: id }}
        className="flex min-w-0 flex-1 flex-col"
      >
        <span className="truncate text-sm text-foreground hover:underline">
          {label}
        </span>
        {asset.source_url && !provisional && !rail && (
          <span className="truncate text-xs text-tertiary-foreground">
            {pageUrlLabel(asset.source_url)}
          </span>
        )}
      </Link>
      {reach === 'never' ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="shrink-0 text-xs text-warning">Can't be read</span>
          </TooltipTrigger>
          <TooltipContent>
            Nothing was extracted from this document, so retrieval skips it.
          </TooltipContent>
        </Tooltip>
      ) : reach === 'waiting' ? (
        <span className="shrink-0 text-xs text-tertiary-foreground">
          Still reading
        </span>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="xsIcon"
        aria-label={`Remove ${label} from this post`}
        onClick={onDetach}
      >
        <XIcon className="size-4" />
      </Button>
    </li>
  )
}
