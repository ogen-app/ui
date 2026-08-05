import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { PageError } from '@/components/page-primitives/PageError'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PostContentEditor } from '@/components/posts/PostContentEditor'
import { PostDetailsHeader } from '@/components/posts/PostDetailsHeader'
import { PostMediaCard } from '@/components/posts/PostMediaCard'
import { PostQuickSettingsBar } from '@/components/posts/PostQuickSettingsBar'
import { PostStatusHeaderActions } from '@/components/posts/PostStatusHeaderActions'
import { PostValidationsSection } from '@/components/posts/PostValidationsSection'
import { DeletePostDialog } from '@/components/posts/DeletePostDialog'
import { PublishedUrlDialog } from '@/components/posts/PublishedUrlDialog'
import { PostSettingsForm } from '@/components/forms/postSettingsForm/PostSettingsForm'
import { PostPreviewPanel } from '@/components/posts/preview/PostPreviewPanel'
import { PostQualityPanel } from '@/components/posts/quality/PostQualityPanel'
import {
  POST_PREVIEW_PORTAL_ID,
  POST_QUALITY_PORTAL_ID,
  POST_SETTINGS_PORTAL_ID,
} from '@/components/layout/RightSidebar'
import { useSettingsStore } from '@/stores/settingsStore'
import { threadIdFor, useAssistantStore } from '@/stores/assistantStore'
import { useCampaign } from '@/hooks/useCampaigns'
import {
  usePost,
  type TransitionStatusResult,
  type VerifyExternalResult,
} from '@/hooks/usePost'
import { usePostMedia } from '@/hooks/usePostMedia'
import { usePostStatusActions } from '@/hooks/usePostStatusActions'
import { useAutoPublishAllowlist } from '@/hooks/useAutoPublishAllowlist'
import { usePublishingAccount } from '@/hooks/usePublishingAccount'
import { resolvePublishMethod } from '@/lib/autoPublish'
import type { PublishMethod } from '@/lib/postStatusMachine'
import type { CancelTarget } from '@/services/api/posts'
import type { Post, PostStatus } from '@/types/posts'

export const Route = createFileRoute(
  '/_authenticated/campaigns/$campaignId_/posts/$postId',
)({
  component: PostPage,
})

function PostPage() {
  const { campaignId, postId } = Route.useParams()
  const {
    doc,
    changeDoc,
    transitionStatus,
    verifyExternal,
    schedule,
    cancelScheduled,
    cancelling,
    saving,
    loading,
    error,
  } = usePost(postId)

  if (loading) {
    return (
      <PageContainer>
        <PageLoader />
      </PageContainer>
    )
  }

  if (error || !doc) {
    return (
      <PageContainer>
        <PageError header="Post not found" />
      </PageContainer>
    )
  }

  return (
    <PostEditorSurface
      doc={doc}
      changeDoc={changeDoc}
      transitionStatus={transitionStatus}
      verifyExternal={verifyExternal}
      schedule={schedule}
      cancelScheduled={cancelScheduled}
      cancelling={cancelling}
      saving={saving}
      campaignId={campaignId}
    />
  )
}

type PostEditorSurfaceProps = {
  doc: Post
  changeDoc: (fn: (p: Post) => void) => void
  transitionStatus: (next: PostStatus) => Promise<TransitionStatusResult>
  verifyExternal: (url: string) => Promise<VerifyExternalResult>
  schedule: () => Promise<TransitionStatusResult>
  cancelScheduled: (target: CancelTarget) => Promise<TransitionStatusResult>
  cancelling: boolean
  saving: boolean
  campaignId: string
}

function PostEditorSurface({
  doc,
  changeDoc,
  transitionStatus,
  verifyExternal,
  schedule,
  cancelScheduled,
  cancelling,
  saving,
  campaignId,
}: PostEditorSurfaceProps) {
  const [titleDraft, setTitleDraft] = useState(doc.title)
  const titleRef = useRef<HTMLTextAreaElement | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  // Opened by MARK AS PUBLISHED (the 'verify' mechanism), and by the
  // quick-settings bar for a post that published without a link.
  const [publishedUrlOpen, setPublishedUrlOpen] = useState(false)
  // Bumped when a status action is clicked while blocked; the quick-settings
  // bar flashes the fields that are missing.
  const [attention, setAttention] = useState(0)

  // Auto vs manual publishing. Page-local on purpose: the server has no
  // field for it — it's expressed by which status SCHEDULE lands on — so it
  // only has to survive until the button is pressed.
  const [publishMethod, setPublishMethod] = useState<PublishMethod>('auto')

  // Resolved against the post's *current* platform rather than stored, so
  // switching to a channel the workspace hasn't allowlisted drops the post to
  // manual on the spot. Derived instead of an effect: there is no moment where
  // the state says "auto" and the platform says otherwise.
  const { data: autoPublishAllowlist, isPending: allowlistPending } =
    useAutoPublishAllowlist()
  const effectivePublishMethod = resolvePublishMethod(
    publishMethod,
    autoPublishAllowlist,
    doc.platform_id,
  )

  // Attachments, the platform's post-type rules and the checks derived from
  // both. Called once here because the media card and the validations
  // section are two views of the same state (and share upload progress).
  const media = usePostMedia(doc)

  // Which of the platform's connected accounts this post publishes as
  // (CON-150). Resolved here because two consumers must agree: the
  // quick-settings bar offers the choice, and SCHEDULE is blocked without
  // one when the platform has more than a single account.
  const account = usePublishingAccount(
    doc.platform_id,
    doc.social_account_id,
    doc.social_account,
  )

  // Called once, here, and shared: the header button and the badge menu must
  // see the same in-flight guard, or one could fire a second transition
  // while the other's request is still open.
  const { buttons, back, pending } = usePostStatusActions({
    post: doc,
    transitionStatus,
    schedule,
    cancelScheduled,
    requestVerification: () => setPublishedUrlOpen(true),
    cancelling,
    publishMethod: effectivePublishMethod,
    context: { account },
  })
  // The allowlist decides whether SCHEDULE lands on auto or manual, so the
  // status actions wait for it too — scheduling a post the wrong way is not
  // something the user can see happening, let alone undo.
  const statusBusy = pending || cancelling || allowlistPending
  const flashBlockers = useCallback(() => setAttention((n) => n + 1), [])

  // The settings form renders in the shared right sidebar (one panel at a
  // time, alongside the AI assistant). The route owns the form because it
  // owns the post's autosave pipeline; the sidebar only hosts the layer.
  const settingsOpen = useSettingsStore((s) => s.activeRightPanel === 'postSettings')
  const previewOpen = useSettingsStore((s) => s.activeRightPanel === 'postPreview')
  const qualityOpen = useSettingsStore((s) => s.activeRightPanel === 'postQuality')
  const toggleRightPanel = useSettingsStore((s) => s.toggleRightPanel)
  const closeRightPanel = useSettingsStore((s) => s.closeRightPanel)
  const [settingsHost, setSettingsHost] = useState<HTMLElement | null>(null)
  const [previewHost, setPreviewHost] = useState<HTMLElement | null>(null)
  const [qualityHost, setQualityHost] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setSettingsHost(document.getElementById(POST_SETTINGS_PORTAL_ID))
    setPreviewHost(document.getElementById(POST_PREVIEW_PORTAL_ID))
    setQualityHost(document.getElementById(POST_QUALITY_PORTAL_ID))
  }, [])

  // Being on a post page is what makes its assistant thread available: the
  // thread is registered here and becomes the panel's active one. It outlives
  // this page — a running turn keeps going after navigation, and the thread
  // list is how the user gets back to it.
  const openThread = useAssistantStore((s) => s.openThread)
  const renameThread = useAssistantStore((s) => s.renameThread)
  const threadId = threadIdFor({ kind: 'post', postId: doc.id, campaignId })
  const assistantRunning = useAssistantStore(
    (s) => s.threads[threadId]?.status === 'running',
  )
  // The thread list leads every row with its campaign, so a post thread has to
  // carry its parent's name too. Cached from the campaign page in practice.
  const campaignName = useCampaign(campaignId).data?.name
  useEffect(() => {
    openThread({ kind: 'post', postId: doc.id, campaignId }, doc.title, '')
    // Only on arrival — the title is tracked separately so that retitling the
    // post doesn't yank the panel away from a thread the user is reading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openThread, doc.id, campaignId])

  useEffect(() => {
    renameThread(threadId, doc.title, campaignName?.trim())
  }, [renameThread, threadId, doc.title, campaignName])

  // Leaving the editor closes its panels; an open assistant stays open.
  useEffect(
    () => () => {
      const s = useSettingsStore.getState()
      if (
        s.activeRightPanel === 'postSettings' ||
        s.activeRightPanel === 'postPreview' ||
        s.activeRightPanel === 'postQuality'
      ) {
        s.closeRightPanel()
      }
    },
    [],
  )

  const autosizeTitle = useCallback(() => {
    const el = titleRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  useEffect(() => {
    autosizeTitle()
  }, [titleDraft, autosizeTitle])

  const handleTitleChange = useCallback(
    (next: string) => {
      setTitleDraft(next)
      changeDoc((d) => {
        d.title = next
      })
    },
    [changeDoc],
  )

  const handleContentChange = useCallback(
    (next: string) => {
      changeDoc((d) => {
        d.content = next
      })
    },
    [changeDoc],
  )

  const handleDownloadMarkdown = useCallback(() => {
    const title = doc.title.trim()
    const markdown = title ? `# ${title}\n\n${doc.content}` : doc.content
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slugify(title) || 'post'}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [doc.title, doc.content])

  return (
    <PageContainer variant="fullFlex">
      <div className="flex flex-1 min-h-0">
        <ScrollArea className="flex-1 min-h-0" type="scroll" scrollHideDelay={350}>
          <PostDetailsHeader
            campaignId={campaignId}
            saving={saving}
            settingsOpen={settingsOpen}
            onToggleSettings={() => toggleRightPanel('postSettings')}
            previewOpen={previewOpen}
            onTogglePreview={() => toggleRightPanel('postPreview')}
            qualityOpen={qualityOpen}
            onToggleQuality={() => toggleRightPanel('postQuality')}
            onDownloadMarkdown={handleDownloadMarkdown}
            onDeletePost={() => setDeleteOpen(true)}
            actions={
              <PostStatusHeaderActions
                buttons={buttons}
                back={back}
                pending={statusBusy}
                onBlocked={flashBlockers}
              />
            }
          />
          <div className="flex flex-col items-center gap-3 relative z-0 pb-8">
            <div className="w-content">
              <PostQuickSettingsBar
                doc={doc}
                changeDoc={changeDoc}
                cancelling={cancelling}
                attention={attention}
                publishMethod={effectivePublishMethod}
                onPublishMethodChange={setPublishMethod}
                onAddPostLink={() => setPublishedUrlOpen(true)}
              />
            </div>
            <div className="w-content">
              <PostValidationsSection checks={media.checks} />
            </div>
            <div className="w-content bg-primary px-10 py-8">
              <div className="flex flex-col">
                <textarea
                  ref={titleRef}
                  value={titleDraft}
                  onChange={(e) => {
                    const next = e.target.value.replace(/\n/g, '')
                    handleTitleChange(next)
                  }}
                  placeholder="Title"
                  rows={1}
                  className="resize-none overflow-hidden bg-transparent border-0 outline-none w-full text-4xl font-bold tracking-tight placeholder:text-tertiary-foreground mb-4"
                />
                <PostContentEditor
                  content={doc.content}
                  onContentChange={handleContentChange}
                  readOnly={assistantRunning}
                />
              </div>
            </div>
            <div className="w-content empty:hidden">
              <PostMediaCard
                post={doc}
                attachments={media.attachments}
                pending={media.pending}
                policy={media.policy}
                upload={media.upload}
                remove={media.remove}
                reorder={media.reorder}
              />
            </div>
          </div>
        </ScrollArea>

        {settingsHost &&
          createPortal(
            /* Remounting on platform/type keeps the RHF defaults in sync
               when those fields change from the quick-settings bar. */
            <PostSettingsForm
              key={`${doc.platform_id}:${doc.platform_post_type}`}
              doc={doc}
              changeDoc={changeDoc}
              onClose={closeRightPanel}
            />,
            settingsHost,
          )}

        {previewHost &&
          createPortal(
            /* Attachments come from the same `usePostMedia` the media card
               uses — their presigned URLs expire, and one owner keeps one
               refresh timer. */
            <PostPreviewPanel
              doc={doc}
              attachments={media.attachments}
              onClose={closeRightPanel}
            />,
            previewHost,
          )}

        {qualityHost &&
          createPortal(
            /* The live document, so the panel can tell a score that still
               describes this post from one taken before the last edit. */
            <PostQualityPanel doc={doc} onClose={closeRightPanel} />,
            qualityHost,
          )}
      </div>
      <DeletePostDialog
        post={doc}
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
      />
      <PublishedUrlDialog
        post={doc}
        isOpen={publishedUrlOpen}
        onClose={() => setPublishedUrlOpen(false)}
        verifyExternal={verifyExternal}
        // Publishing unverified is the way out of the dialog, not of the
        // status: an already-published post has nothing left to skip to.
        onSkip={
          doc.status === 'published'
            ? undefined
            : () => transitionStatus('published')
        }
      />
    </PageContainer>
  )
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}
