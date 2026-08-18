import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  CaretDownIcon,
  FileTextIcon,
  LinkSimpleIcon,
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
import { UPLOAD_LIMITS_LABEL } from '@/lib/assetStatus'
import { addToCampaign, removeFromCampaign, seedFromWholeBank } from '@/lib/campaignMembership'
import { campaignAssets, seedsWholeBank } from '@/lib/campaignSources'
import { useUploadStore } from '@/stores/uploadStore'
import type { Campaign } from '@/types/campaigns'
import { CampaignContentList } from './CampaignContentList'

/**
 * A campaign's Content page: the Content Bank, moved inside the campaign that
 * uses it (CON-210).
 *
 * It owns its own header and drop target rather than taking the campaign
 * layout's, because both say something specific here — the header's one action
 * is *add to this campaign*, and a file dropped anywhere on the page joins
 * this campaign rather than a workspace pile.
 *
 * Deliberately absent: any path into the workspace pool. No "add existing", no
 * browse-the-bank drawer. Reaching into the pile is what made it a pile, and a
 * campaign that can browse everything has not stopped being workspace-wide.
 * Documents get in here by being written or uploaded here, which is why those
 * two are the whole ADD CONTENT menu.
 */
export function CampaignContentPage({ campaign }: { campaign: Campaign }) {
  const navigate = useNavigate()
  const { data: assets, isLoading, isError } = useAssets()
  const createAsset = useCreateAsset()
  const deleteAsset = useDeleteAsset()

  const enqueueUploads = useUploadStore((s) => s.enqueue)
  const uploadItems = useUploadStore((s) => s.items)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const dragDepth = useRef(0)

  const mine = useMemo(
    () => campaignAssets(assets ?? [], campaign),
    [assets, campaign],
  )

  // In transit, or refused on the way in. Anything the server has already
  // accepted is an asset by now, and shows in the list as a `processing` row
  // rather than twice.
  const uploads = useMemo(
    () =>
      uploadItems.filter(
        (item) =>
          item.campaignId === campaign.id &&
          (item.phase === 'uploading' || item.phase === 'failed'),
      ),
    [uploadItems, campaign.id],
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
   * condition lands after this effect could run again.
   */
  const seeded = useRef<string | null>(null)
  useEffect(() => {
    if (!assets || !seedsWholeBank(campaign) || seeded.current === campaign.id) return
    seeded.current = campaign.id
    void seedFromWholeBank(
      campaign.id,
      assets.map((asset) => asset.id),
    )
  }, [assets, campaign])

  const hasFiles = (e: React.DragEvent) => e.dataTransfer.types.includes('Files')

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
    if (files.length) enqueueUploads(files, campaign.id)
  }

  /** A new note, in this campaign, opened for writing. */
  const handleCreate = () => {
    createAsset.mutate(
      { title: ' ', content: ' ' },
      {
        onSuccess: (asset) => {
          // Attaching is not a second action the user has to remember, and it
          // is not conditional on this page surviving the navigation below.
          void addToCampaign(campaign.id, [asset.id])
          navigate({
            to: '/campaigns/$campaignId/content/$assetId',
            params: { campaignId: campaign.id, assetId: asset.id },
          })
        },
      },
    )
  }

  const handleDelete = (id: string) => {
    deleteAsset.mutate(id, {
      onSuccess: () => void removeFromCampaign(campaign.id, [id]),
    })
  }

  const displayName = campaign.name.trim() || 'Untitled campaign'

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
        // Same shape the campaign layout builds for every other section:
        // `${campaign} ${section}`. The section is Content rather than Assets —
        // "assets" is the workspace pile's word for things filed away
        // centrally, and what a campaign holds is just its content.
        title={`${displayName} Content`}
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
            <DropdownMenuContent align="end" sideOffset={4}>
              <DropdownMenuItem size="lg" onClick={handleCreate}>
                <FileTextIcon />
                <span>Write a note</span>
              </DropdownMenuItem>
              <DropdownMenuItem size="lg" onClick={() => setUploadModalOpen(true)}>
                <UploadSimpleIcon />
                <span>Upload file</span>
              </DropdownMenuItem>
              <DropdownMenuItem size="lg" disabled>
                <LinkSimpleIcon />
                <div className="flex flex-col gap-1">
                  <span>Extract from link</span>
                  <span className="text-xs text-tertiary-foreground">coming soon</span>
                </div>
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
          <PageError header="Unable to load this campaign's content" />
        ) : (
          <CampaignContentList
            campaignId={campaign.id}
            assets={mine}
            uploads={uploads}
            onDelete={handleDelete}
            onWrite={handleCreate}
            onUpload={() => setUploadModalOpen(true)}
          />
        )}
      </div>

      {isDragging && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-popover/90">
          <div className="flex flex-col items-center gap-2">
            <UploadSimpleIcon className="size-8 text-foreground" />
            {/* The destination is the entire point of the change, and this is
                the one moment the UI can name it without being asked. */}
            <p className="text-sm text-foreground">Add these to {displayName}</p>
            <p className="text-xs text-tertiary-foreground">{UPLOAD_LIMITS_LABEL}</p>
          </div>
        </div>
      )}

      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        campaignId={campaign.id}
      />
    </div>
  )
}
