import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  CaretDownIcon,
  FileTextIcon,
  GlobeSimpleIcon,
  UploadSimpleIcon,
} from '@phosphor-icons/react'
import { PageError } from '@/components/page-primitives/PageError'
import { PageHeader } from '@/components/page-primitives/PageHeader'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UploadModal } from '@/components/uploads/UploadModal'
import { useAssets, useCreateAsset, useDeleteAsset } from '@/hooks/useContent'
import { uploadLimitsLabel } from '@/lib/assetStatus'
import { useUploadOptions } from '@/hooks/useUploadOptions'
import {
  addToCampaign,
  removeFromCampaign,
  seedFromWholeBank,
} from '@/lib/campaignMembership'
import { campaignAssets, seedsWholeBank } from '@/lib/campaignSources'
import { useUploadStore } from '@/stores/uploadStore'
import { toast } from '@/stores/toastStore'
import type { Campaign } from '@/types/campaigns'
import type { Asset } from '@/types/content'
import { AddWebPageModal } from './AddWebPageModal'
import { ContentList } from './ContentList'

/**
 * Documents, in the scope that holds them.
 *
 * Two screens, one component: a campaign's Content page (CON-210), and the
 * workspace-wide Content Bank behind it. They are the same page because they
 * are the same job — see what is here, put something in, open it, delete it —
 * and the only honest difference is what "here" means. `campaign === null` is
 * the workspace, and every place that matters says so out loud rather than
 * quietly reusing the campaign's words.
 *
 * The page owns its header and its drop target rather than taking the layout's,
 * because both name a destination: a file dropped anywhere on it joins *this*
 * scope.
 *
 * Deliberately absent from the campaign: any path into the workspace pool. No
 * "add existing", no browse-the-bank drawer. Reaching into the pile is what
 * made it a pile, and a campaign that can browse everything has not stopped
 * being workspace-wide. Documents get in there by being written, uploaded or
 * read off the web *there*, which is the whole ADD CONTENT menu — three ways to
 * put something in, none of them a way to go looking through what exists.
 *
 * The consequence, stated so it isn't discovered: a document added in the
 * workspace bank belongs to no campaign and cannot be moved into one. The bank
 * is where such documents are visible — which is the reason it is switched back
 * on — not a staging area they travel out of.
 */
export function ContentPage({ campaign }: { campaign: Campaign | null }) {
  const navigate = useNavigate()
  const { data: assets, isLoading, isError } = useAssets()
  const createAsset = useCreateAsset()
  const deleteAsset = useDeleteAsset()

  const enqueueUploads = useUploadStore((s) => s.enqueue)
  const uploadItems = useUploadStore((s) => s.items)
  const uploadOptions = useUploadOptions()
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [webPageModalOpen, setWebPageModalOpen] = useState(false)
  /*
   * Radix hands focus back to the menu trigger as the menu closes, and it does
   * so after the modal beneath has mounted — so the modal's field is focused and
   * then quietly un-focused, and the user types into nothing. Prevented only for
   * the item that opens a field: every other close should still return focus to
   * the button that was chosen, which is what keyboard users expect from Escape.
   */
  const openingWebPage = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const dragDepth = useRef(0)

  /** The campaign's documents, or — in the bank — every document there is. */
  const shown = useMemo(
    () => (campaign ? campaignAssets(assets ?? [], campaign) : (assets ?? [])),
    [assets, campaign],
  )

  // In transit, or refused on the way in. Anything the server has already
  // accepted is an asset by now, and shows in the list as a `processing` row
  // rather than twice.
  const campaignId = campaign?.id ?? null
  const uploads = useMemo(
    () =>
      uploadItems.filter(
        (item) =>
          item.campaignId === campaignId &&
          (item.phase === 'uploading' || item.phase === 'failed'),
      ),
    [uploadItems, campaignId],
  )

  /*
   * The migration hazard, handled on sight.
   *
   * A campaign saved under the old whole-bank mode is `use_assets: true` with
   * an empty `asset_ids`, which meant *every* asset in the workspace. Read as
   * a set — which is all this page knows — that is an empty campaign, so it
   * would silently stop writing from everything it had, and nothing on screen
   * would differ. Pinning it to the bank as it stands right now preserves what
   * generation sees; the ref is because the campaign refetch that clears the
   * condition lands after this effect could run again. The membership write
   * path expands the legacy state itself (see `lib/campaignMembership`), so
   * this effect is the eager pin, not the only defence — and it needn't wait
   * for the asset list, which the write reads server-side.
   */
  const seeded = useRef<string | null>(null)
  useEffect(() => {
    if (
      !campaign ||
      !seedsWholeBank(campaign) ||
      seeded.current === campaign.id
    )
      return
    seeded.current = campaign.id
    void seedFromWholeBank(campaign.id)
  }, [campaign])

  const hasFiles = (e: React.DragEvent) =>
    e.dataTransfer.types.includes('Files')

  const handleDragEnter = (e: React.DragEvent) => {
    if (!hasFiles(e)) return
    e.preventDefault()
    // Drag events fire on every child as the pointer crosses it; counting
    // enter against leave is the only way to know it has left the page.
    dragDepth.current += 1
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    dragDepth.current = 0
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) enqueueUploads(files, { campaignId, postId: null })
  }

  /** A new note, in this scope, opened for writing. */
  const handleCreate = () => {
    createAsset.mutate(
      { title: ' ', content: ' ' },
      {
        onSuccess: async (asset) => {
          if (campaign) {
            // Attaching is not a second action the user has to remember — and
            // the navigation waits for it, because opening the campaign's copy
            // of a document the campaign refused would present a membership
            // that isn't there. On failure the note exists in the bank, the
            // membership toast has said so, and this page stays put.
            const attached = await addToCampaign(campaign.id, [asset.id])
            if (!attached) return
            navigate({
              to: '/campaigns/$campaignId/content/$assetId',
              params: { campaignId: campaign.id, assetId: asset.id },
            })
            return
          }
          navigate({
            to: '/content-bank/$assetId',
            params: { assetId: asset.id },
          })
        },
      },
    )
  }

  /**
   * A page the backend has accepted for scraping, joining this scope.
   *
   * In a campaign, attaching is the same gesture as for a note or an upload —
   * but the asset it attaches may not be new: the backend dedupes URLs per
   * *workspace*, so a page another campaign already saved comes back as that
   * campaign's document, now shared with this one and re-read for both. That is
   * the honest reading of one workspace-wide row referenced by many campaigns
   * (CON-210 phase 1), and a second copy of the same page would be worse.
   */
  const handleWebPage = (asset: Asset) => {
    const alreadyHere = shown.some((a) => a.id === asset.id)
    const announce = () => {
      if (alreadyHere) {
        toast.info('Re-reading that page', {
          description:
            "Its content will be replaced with the page's current version.",
        })
      } else {
        toast.info('Reading that page', {
          description:
            'It appears in the list below and fills in when the read finishes.',
        })
      }
    }
    if (!campaign) {
      announce()
      return
    }
    // "It appears in the list below" is only true once the campaign holds it,
    // so the toast waits for the membership write; a refusal raises its own
    // toast inside `addToCampaign` instead.
    void addToCampaign(campaign.id, [asset.id]).then((attached) => {
      if (attached) announce()
    })
  }

  /*
   * Deleting the row deletes the document, everywhere.
   *
   * The detach only names the campaign whose page this is, because that is the
   * only membership list this page can see. Other campaigns keep the id, which
   * is harmless — `campaignAssets` matches ids against documents that exist, so
   * an id with nothing behind it simply doesn't appear — and it stops being a
   * question at all once the backend scopes assets properly (CON-210 phase 2).
   */
  const handleDelete = (id: string) => {
    deleteAsset.mutate(id, {
      onSuccess: () => {
        if (campaign) void removeFromCampaign(campaign.id, [id])
      },
    })
  }

  /**
   * The same delete, over a selection.
   *
   * The requests fan out and any of them can fail, so the detach and the toast
   * are built from what actually succeeded: `allSettled`, then one membership
   * write for the ids that are really gone. One write rather than one per
   * document because membership is a single field on a whole-campaign PUT —
   * five parallel saves would each store the set they read.
   *
   * Failures raise their own toasts through the mutation cache, so nothing is
   * said about them here beyond leaving them out of the count.
   */
  const handleDeleteMany = async (ids: string[]) => {
    const results = await Promise.allSettled(
      ids.map((id) => deleteAsset.mutateAsync(id)),
    )
    const gone = ids.filter((_, i) => results[i].status === 'fulfilled')
    if (gone.length === 0) return
    if (campaign) void removeFromCampaign(campaign.id, gone)
    toast.success(
      `${gone.length} ${gone.length === 1 ? 'document' : 'documents'} deleted`,
    )
  }

  const scopeName = campaign
    ? campaign.name.trim() || 'Untitled campaign'
    : 'the content bank'

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      onDragEnter={handleDragEnter}
      onDragOver={(e) => {
        if (hasFiles(e)) e.preventDefault()
      }}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <PageHeader
        // In a campaign, the shape the layout builds for every other section:
        // `${campaign} ${section}`. The section is Content rather than Assets —
        // "assets" is the workspace pile's word for things filed away
        // centrally, and what a campaign holds is just its content. The pile
        // keeps its own name, because that is what it is.
        title={campaign ? `${scopeName} Content` : 'Content Bank'}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="lg"
                loading={createAsset.isPending}
                className="data-[state=open]:bg-primary-foreground data-[state=open]:text-primary"
              >
                <span>ADD CONTENT</span>
                <CaretDownIcon weight="bold" className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={4}
              onCloseAutoFocus={(e) => {
                if (!openingWebPage.current) return
                openingWebPage.current = false
                e.preventDefault()
              }}
            >
              <DropdownMenuItem size="lg" onClick={handleCreate}>
                <FileTextIcon />
                <span>Write a note</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                size="lg"
                onClick={() => setUploadModalOpen(true)}
              >
                <UploadSimpleIcon />
                <span>Upload file</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                size="lg"
                onClick={() => {
                  openingWebPage.current = true
                  setWebPageModalOpen(true)
                }}
              >
                <GlobeSimpleIcon />
                <span>Add a web page</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {/* The campaign layout's body box: fixed height, no page scroll — the
          table virtualises against this and scrolls itself. */}
      <div className="grid h-full overflow-hidden px-3 lg:px-6">
        {isLoading ? (
          <PageLoader />
        ) : isError ? (
          <PageError
            header={
              campaign
                ? "Unable to load this campaign's content"
                : 'Unable to load the content bank'
            }
          />
        ) : (
          <ContentList
            campaignId={campaignId}
            assets={shown}
            uploads={uploads}
            onDelete={handleDelete}
            onDeleteMany={handleDeleteMany}
            onWrite={handleCreate}
            onUpload={() => setUploadModalOpen(true)}
            onAddWebPage={() => setWebPageModalOpen(true)}
          />
        )}
      </div>

      {isDragging && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-popover/90">
          <div className="flex flex-col items-center gap-2">
            <UploadSimpleIcon className="size-8 text-foreground" />
            {/* The destination is the entire point of the change, and this is
                the one moment the UI can name it without being asked. */}
            <p className="text-sm text-foreground">Add these to {scopeName}</p>
            <p className="text-xs text-tertiary-foreground">
              {uploadLimitsLabel(uploadOptions)}
            </p>
          </div>
        </div>
      )}

      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        campaignId={campaignId}
      />

      <AddWebPageModal
        isOpen={webPageModalOpen}
        onClose={() => setWebPageModalOpen(false)}
        destination={campaign ? 'campaign' : 'bank'}
        onSubmitted={handleWebPage}
      />
    </div>
  )
}
