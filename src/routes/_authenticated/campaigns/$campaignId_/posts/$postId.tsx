import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { PageError } from '@/components/page-primitives/PageError'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PostContentEditor } from '@/components/posts/PostContentEditor'
import { PostDetailsHeader } from '@/components/posts/PostDetailsHeader'
import { PostQuickSettingsBar } from '@/components/posts/PostQuickSettingsBar'
import { PostStatusHeaderActions } from '@/components/posts/PostStatusHeaderActions'
import { PostSettingsForm } from '@/components/forms/postSettingsForm/PostSettingsForm'
import { usePost, type TransitionStatusResult } from '@/hooks/usePost'
import type { CancelTarget } from '@/services/api/posts'
import type { Post, PostStatus } from '@/types/posts'
import { cn } from '@/lib'

const SETTINGS_PANEL_WIDTH = 'w-120'

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
  const [settingsOpen, setSettingsOpen] = useState(false)
  const titleRef = useRef<HTMLTextAreaElement | null>(null)

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
        <ScrollArea className="flex-1 min-h-0 lg:px-6" type="scroll" scrollHideDelay={350}>
          <PostDetailsHeader
            campaignId={campaignId}
            saving={saving}
            settingsOpen={settingsOpen}
            onToggleSettings={() => setSettingsOpen((open) => !open)}
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
            <div className="w-[740px]">
              <PostQuickSettingsBar
                doc={doc}
                changeDoc={changeDoc}
                cancelling={cancelling}
              />
            </div>
            <div className="w-[740px] bg-primary px-16 py-8">
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
                  initialContent={doc.content}
                  onContentChange={handleContentChange}
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <div
          className={cn(
            'shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out',
            settingsOpen ? SETTINGS_PANEL_WIDTH : 'w-0',
          )}
        >
          <div className={cn(SETTINGS_PANEL_WIDTH, 'h-full bg-primary flex flex-row')}>
            <div className="w-px self-stretch bg-border shrink-0" aria-hidden />
            <div className="flex-1 min-w-0 min-h-0">
              {/* Remounting on platform/type keeps the RHF defaults in sync
                  when those fields change from the quick-settings bar. */}
              <PostSettingsForm
                key={`${doc.platform_id}:${doc.platform_post_type}`}
                doc={doc}
                changeDoc={changeDoc}
                onClose={() => setSettingsOpen(false)}
              />
            </div>
          </div>
        </div>
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
