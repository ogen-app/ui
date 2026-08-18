import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PAGE_ACTION_BAR_INSET } from '@/components/page-primitives/PageActionBar'
import { PageBottomFader } from '@/components/page-primitives/PageBottomFader'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { PageError } from '@/components/page-primitives/PageError'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AssetActionBar } from '@/components/campaigns/content/AssetActionBar'
import { AssetDetailsHeader } from '@/components/campaigns/content/AssetDetailsHeader'
import { AssetEditor } from '@/components/campaigns/content/AssetEditor'
import { DeleteAssetDialog } from '@/components/campaigns/content/DeleteAssetDialog'
import { useAsset, useUpdateAsset } from '@/hooks/useContent'
import { useCampaign } from '@/hooks/useCampaigns'
import { downloadMarkdown } from '@/lib/downloadMarkdown'
import { threadIdFor, useAssistantStore } from '@/stores/assistantStore'
import { cn } from '@/lib'

export const Route = createFileRoute(
  '/_authenticated/campaigns/$campaignId_/content/$assetId',
)({
  component: AssetPage,
})

/**
 * One of a campaign's documents, open for writing.
 *
 * Framed exactly like the post editor, because it is the same kind of screen:
 * a positioned column holding a scroller, the document on its own surface in
 * the middle, the header fading in at the top and its mirror at the bottom,
 * and the commit bar floating clear of both. What differs is only what those
 * slots can honestly hold — see `AssetDetailsHeader` and `AssetActionBar`.
 */
function AssetPage() {
  const { campaignId, assetId } = Route.useParams()
  const navigate = useNavigate()
  const { data: campaign } = useCampaign(campaignId)
  const { data: asset, isLoading, isError } = useAsset(assetId)
  const updateAsset = useUpdateAsset()
  const [title, setTitle] = useState<string | null>(null)
  const editVersionRef = useRef(0)
  const [editVersion, setEditVersion] = useState(0)
  const [savedVersion, setSavedVersion] = useState(0)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const isDirty = editVersion !== savedVersion

  /*
   * The assistant this page answers to is the campaign's (CON-112).
   *
   * This route escapes the campaign layout — that is what the trailing `_`
   * buys — so nothing has registered a thread by the time it renders, and the
   * rail would still be pointing at whatever subject the user came from. A
   * post opens its own thread here for the same reason; a document has none of
   * its own, and the campaign it belongs to is the subject an assistant turn
   * about it would be about anyway.
   */
  const openThread = useAssistantStore((s) => s.openThread)
  const renameThread = useAssistantStore((s) => s.renameThread)
  const threadId = threadIdFor({ kind: 'campaign', campaignId })
  const campaignName = campaign?.name
  useEffect(() => {
    openThread({ kind: 'campaign', campaignId }, '', '')
    // Only on arrival — the name is tracked separately, so renaming the
    // campaign can't yank the panel away from a thread being read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openThread, campaignId])
  useEffect(() => {
    if (campaignName !== undefined)
      renameThread(threadId, campaignName.trim(), campaignName.trim())
  }, [renameThread, threadId, campaignName])

  // No `usePanelScope` on purpose: this screen hosts no panels of its own, and
  // an undeclared scope is exactly what resolves the rail to the assistant.

  const markDirty = useCallback(() => {
    editVersionRef.current += 1
    setEditVersion(editVersionRef.current)
  }, [])

  const handleTitleChange = useCallback(
    (nextTitle: string) => {
      setTitle(nextTitle)
      if (!asset) return
      const v = editVersionRef.current
      updateAsset.mutate(
        { id: assetId, payload: { title: nextTitle, content: asset.content } },
        { onSuccess: () => setSavedVersion(v) },
      )
    },
    [asset, assetId, updateAsset],
  )

  const handleContentChange = useCallback(
    (content: string) => {
      if (!asset) return
      const v = editVersionRef.current
      updateAsset.mutate(
        { id: assetId, payload: { title: title ?? asset.title, content } },
        { onSuccess: () => setSavedVersion(v) },
      )
    },
    [asset, assetId, title, updateAsset],
  )

  const handleDownloadMarkdown = useCallback(() => {
    if (!asset) return
    downloadMarkdown(title ?? asset.title, asset.content)
  }, [asset, title])

  const handleDone = useCallback(() => {
    void navigate({ to: '/campaigns/$campaignId/content', params: { campaignId } })
  }, [navigate, campaignId])

  if (isLoading) {
    return (
      <PageContainer>
        <PageLoader />
      </PageContainer>
    )
  }

  if (isError || !asset) {
    return (
      <PageContainer>
        <PageError header="Document not found" />
      </PageContainer>
    )
  }

  return (
    <PageContainer variant="fullFlex">
      {/* `relative` so the bar and the fader anchor to the content column
          rather than the window: the right rail is a sibling of this
          container, so both recentre when a panel opens instead of drifting
          off the document they belong to. */}
      <div className="relative flex flex-1 min-h-0">
        <ScrollArea className="flex-1 min-h-0" type="scroll" scrollHideDelay={350}>
          <AssetDetailsHeader
            campaignId={campaignId}
            saving={isDirty}
            onDownloadMarkdown={handleDownloadMarkdown}
            onDelete={() => setDeleteOpen(true)}
          />
          <div
            className={cn(
              'flex flex-col items-center gap-3 relative z-0',
              PAGE_ACTION_BAR_INSET,
            )}
          >
            <div className="w-content bg-primary px-10 py-8">
              <AssetEditor
                initialTitle={asset.title}
                initialContent={asset.content}
                onTitleChange={handleTitleChange}
                onContentChange={handleContentChange}
                onDirty={markDirty}
              />
            </div>
            {/* Scroll past the end, as on a post: the inset above is only the
                clearance that keeps the bar off the document, and it leaves
                the last line pinned against the bottom edge. This is the
                travel that lets the end of what you are writing come up to the
                middle of the screen. */}
            <div className="h-40 shrink-0" aria-hidden />
          </div>
        </ScrollArea>

        {/* The header's fade, mirrored — the document dissolves on its way
            under the bar instead of being sliced off by the bottom edge. */}
        <PageBottomFader />

        {/* Outside the ScrollArea: inside it the bar would scroll away. */}
        <AssetActionBar asset={asset} onDone={handleDone} />
      </div>

      <DeleteAssetDialog
        asset={asset}
        campaignId={campaignId}
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
      />
    </PageContainer>
  )
}
