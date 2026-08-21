import { useCallback, useEffect, useRef, useState } from 'react'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageBottomFader } from '@/components/page-primitives/PageBottomFader'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { PageError } from '@/components/page-primitives/PageError'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AssetDetailsHeader } from '@/components/content/AssetDetailsHeader'
import { AssetEditor } from '@/components/content/AssetEditor'
import { DeleteAssetDialog } from '@/components/content/DeleteAssetDialog'
import { ScrapeState } from '@/components/content/ScrapeState'
import { useAsset, useCreateUrlAsset, useUpdateAsset } from '@/hooks/useContent'
import { useCampaign } from '@/hooks/useCampaigns'
import { downloadMarkdown } from '@/lib/downloadMarkdown'
import { isTerminalStatus } from '@/lib/assetStatus'
import { readPageErrorMessage } from '@/lib/scrapeErrors'
import { toast } from '@/stores/toastStore'
import { threadIdFor, useAssistantStore } from '@/stores/assistantStore'

type Props = {
  assetId: string
  /**
   * The campaign this document was opened from, or null when it was opened in
   * the workspace bank. It decides three things: where the back caret goes,
   * whether deleting also detaches, and which assistant thread the rail shows.
   */
  campaignId: string | null
}

/**
 * A document, open for writing.
 *
 * Framed like the post editor, because it is the same kind of screen: a
 * positioned column holding a scroller, the document on its own surface in the
 * middle, the header fading in at the top and its mirror at the bottom.
 *
 * A document scraped from a web page (CON-222) shows its progress here instead
 * of its body until it has one — see `ScrapeState`. Everything else about the
 * screen is the same: once the text exists, a read page is a document like any
 * other, editable and autosaving.
 *
 * What it does *not* borrow is the commit bar. A post has one because it has
 * somewhere to go — draft, scheduled, published — and the bar is where that
 * happens. A document has no such move: it saves as you type, and the only
 * thing left to do is leave, which the back caret already does. A bar whose
 * one button is a second way out is furniture.
 */
export function AssetDocument({ assetId, campaignId }: Props) {
  const { data: campaign } = useCampaign(campaignId ?? '')
  const { data: asset, isLoading, isError } = useAsset(assetId)
  const updateAsset = useUpdateAsset()
  const rescrape = useCreateUrlAsset()
  const [title, setTitle] = useState<string | null>(null)
  const editVersionRef = useRef(0)
  const [editVersion, setEditVersion] = useState(0)
  const [savedVersion, setSavedVersion] = useState(0)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const isDirty = editVersion !== savedVersion

  /*
   * The assistant this page answers to is the campaign's (CON-112).
   *
   * The campaign's copy of this route escapes the campaign layout — that is
   * what the trailing `_` buys — so nothing has registered a thread by the time
   * it renders, and the rail would still be pointing at whatever subject the
   * user came from. A post opens its own thread here for the same reason; a
   * document has none of its own, and the campaign it belongs to is the subject
   * an assistant turn about it would be about anyway.
   *
   * Opened from the workspace bank there is no such subject, and none is
   * invented: `ThreadSubject` is a post or a campaign, and a document belonging
   * to no campaign is neither. The rail keeps whatever thread it had, which is
   * what every other workspace-level screen does.
   */
  const openThread = useAssistantStore((s) => s.openThread)
  const renameThread = useAssistantStore((s) => s.renameThread)
  const threadId = campaignId ? threadIdFor({ kind: 'campaign', campaignId }) : null
  const campaignName = campaign?.name
  useEffect(() => {
    if (!campaignId) return
    openThread({ kind: 'campaign', campaignId }, '', '')
    // Only on arrival — the name is tracked separately, so renaming the
    // campaign can't yank the panel away from a thread being read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openThread, campaignId])
  useEffect(() => {
    if (threadId && campaignName !== undefined)
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

  /**
   * Read the source again.
   *
   * The same endpoint that created it: submitting a URL this workspace already
   * has refreshes that asset in place rather than making a second one, so
   * there is no separate refresh route to call. The status drops back to
   * `pending`, which puts `ScrapeState` back on screen.
   */
  const sourceUrl = asset?.source_url ?? null
  const handleRefreshSource = useCallback(() => {
    if (!sourceUrl) return
    rescrape.mutate(sourceUrl, {
      onSuccess: () => {
        toast.info('Reading the page again', {
          description: "Its text will be replaced with the page's current version.",
        })
      },
      onError: (err) =>
        toast.error("Couldn't read that page again", {
          description: readPageErrorMessage(err),
        }),
    })
  }, [sourceUrl, rescrape])

  const handleDownloadMarkdown = useCallback(() => {
    if (!asset) return
    downloadMarkdown(title ?? asset.title, asset.content)
  }, [asset, title])

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

  // A page the worker hasn't finished with has no body to edit, and a failed one
  // never will — both stand in for the editor rather than sitting above it. The
  // URL doubles as the condition so the panel can be handed one that exists.
  const readingFrom =
    asset.type === 'URL' &&
    sourceUrl !== null &&
    (!isTerminalStatus(asset.status) || asset.status === 'failed')
      ? sourceUrl
      : null

  return (
    <PageContainer variant="fullFlex" className="page-content-motion">
      {/* `relative` so the fader anchors to the content column rather than
          the window: the right rail is a sibling of this container, so it
          recedes when a panel opens instead of spanning the whole app. */}
      <div className="relative flex flex-1 min-h-0">
        <ScrollArea className="flex-1 min-h-0" type="scroll" scrollHideDelay={350}>
          <AssetDetailsHeader
            campaignId={campaignId}
            saving={isDirty}
            sourceUrl={sourceUrl}
            onRefreshSource={sourceUrl ? handleRefreshSource : undefined}
            onDownloadMarkdown={handleDownloadMarkdown}
            onDelete={() => setDeleteOpen(true)}
          />
          <div className="flex flex-col items-center gap-3 relative z-0">
            {readingFrom !== null ? (
              <ScrapeState
                sourceUrl={readingFrom}
                failed={asset.status === 'failed'}
                onRetry={handleRefreshSource}
                retrying={rescrape.isPending}
              />
            ) : (
              <div className="w-content bg-primary px-10 py-8">
                <AssetEditor
                  initialTitle={asset.title}
                  initialContent={asset.content}
                  onTitleChange={handleTitleChange}
                  onContentChange={handleContentChange}
                  onDirty={markDirty}
                />
              </div>
            )}
            {/* Scroll past the end, as on a post: without it the last line
                sits pinned against the bottom edge with nowhere to go. This is
                the travel that lets the end of what you are writing come up to
                the middle of the screen — and it keeps the assistant's mark in
                the corner off the document. */}
            <div className="h-40 shrink-0" aria-hidden />
          </div>
        </ScrollArea>

        {/* The header's fade, mirrored — the document dissolves into the page
            on its way out instead of being sliced off by the bottom edge. */}
        <PageBottomFader />
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
