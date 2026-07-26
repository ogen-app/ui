import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { PageError } from '@/components/page-primitives/PageError'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PostContentEditor } from '@/components/posts/PostContentEditor'
import { PostDetailsHeader } from '@/components/posts/PostDetailsHeader'
import { PostQuickSettingsBar } from '@/components/posts/PostQuickSettingsBar'
import { PostStatusHeaderActions } from '@/components/posts/PostStatusHeaderActions'
import { PostSettingsForm } from '@/components/forms/postSettingsForm/PostSettingsForm'
import { POST_SETTINGS_PORTAL_ID } from '@/components/layout/RightSidebar'
import { useSettingsStore } from '@/stores/settingsStore'
import { threadIdFor, useAssistantStore } from '@/stores/assistantStore'
import { usePost, type TransitionStatusResult } from '@/hooks/usePost'
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
  schedule,
  cancelScheduled,
  cancelling,
  saving,
  campaignId,
}: PostEditorSurfaceProps) {
  const [titleDraft, setTitleDraft] = useState(doc.title)
  const titleRef = useRef<HTMLTextAreaElement | null>(null)

  // The settings form renders in the shared right sidebar (one panel at a
  // time, alongside the AI assistant). The route owns the form because it
  // owns the post's autosave pipeline; the sidebar only hosts the layer.
  const settingsOpen = useSettingsStore((s) => s.activeRightPanel === 'postSettings')
  const toggleRightPanel = useSettingsStore((s) => s.toggleRightPanel)
  const closeRightPanel = useSettingsStore((s) => s.closeRightPanel)
  const [settingsHost, setSettingsHost] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setSettingsHost(document.getElementById(POST_SETTINGS_PORTAL_ID))
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
  useEffect(() => {
    openThread({ kind: 'post', postId: doc.id, campaignId }, doc.title)
    // Only on arrival — the title is tracked separately so that retitling the
    // post doesn't yank the panel away from a thread the user is reading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openThread, doc.id, campaignId])

  useEffect(() => {
    renameThread(threadId, doc.title)
  }, [renameThread, threadId, doc.title])

  // Leaving the editor closes its panel; an open assistant stays open.
  useEffect(
    () => () => {
      const s = useSettingsStore.getState()
      if (s.activeRightPanel === 'postSettings') {
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
            onDownloadMarkdown={handleDownloadMarkdown}
            actions={
              <PostStatusHeaderActions
                post={doc}
                transitionStatus={transitionStatus}
                schedule={schedule}
                cancelScheduled={cancelScheduled}
                cancelling={cancelling}
              />
            }
          />
          <div className="flex flex-col items-center gap-3 relative z-0 pb-8">
            <div className="w-content">
              <PostQuickSettingsBar
                doc={doc}
                changeDoc={changeDoc}
                cancelling={cancelling}
              />
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
      </div>
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
