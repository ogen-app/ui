import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { PageError } from '@/components/page-primitives/PageError'
import { EditPageHeader } from '@/components/page-primitives/EditPageHeader'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCampaign } from '@/hooks/useCampaigns'
import { useRightRailSection } from '@/hooks/useRightRailSection'
import { useRightRailPage } from '@/hooks/useRightRailPage'
import { useRightRailStore, type RightRailButton } from '@/stores/rightRailStore'
import {
  GearSixIcon,
  LayoutIcon,
  ListChecksIcon,
  SparkleIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { threadKey } from '@/assistant/agents'
import { useAssistantStore, useThreadContentRevision } from '@/stores/assistantStore'
import { PostSettingsForm } from '@/components/forms/postSettingsForm'
import { PostContentUsageForm } from '@/components/forms/postContentUsageForm'
import { PostValidationsPanel } from '@/components/forms/postValidations'
import { PostContentEditor } from '@/components/posts/PostContentEditor'
import { PostStatusHeaderActions } from '@/components/posts/PostStatusHeaderActions'
import { PostPreviewToggle, type PostView } from '@/components/posts/PostPreviewToggle'
import { PostPreview } from '@/components/posts/preview'
import { usePost, type TransitionStatusResult } from '@/hooks/usePost'
import { usePostValidation } from '@/hooks/usePostValidation'
import type { CancelTarget } from '@/services/api/posts'
import type { Post, PostStatus } from '@/types/posts'
import { getPlatformInfo, getPostTypeLabel } from '@/lib/platformDictionary'

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
    cancelScheduled,
    cancelling,
    loading,
    error,
  } = usePost(postId)
  const { data: campaign } = useCampaign(campaignId)
  const validation = usePostValidation(doc)

  const railButtons = useMemo<RightRailButton[]>(
    () =>
      doc
        ? [
            {
              id: 'settings',
              icon: GearSixIcon,
              ariaLabel: 'Post settings',
              panel: ({ close }) => (
                <PostSettingsForm doc={doc} changeDoc={changeDoc} onClose={close} />
              ),
            },
            {
              id: 'content-usage',
              icon: LayoutIcon,
              ariaLabel: 'Content pieces',
              panel: ({ close }) => (
                <PostContentUsageForm doc={doc} changeDoc={changeDoc} onClose={close} />
              ),
            },
            {
              id: 'validations',
              icon: ListChecksIcon,
              ariaLabel: 'Validations',
              indicator:
                validation.overall === 'pass'
                  ? null
                  : { severity: validation.overall },
              panel: ({ close }) => (
                <PostValidationsPanel report={validation} onClose={close} />
              ),
            },
          ]
        : [],
    [doc, changeDoc, validation],
  )
  useRightRailSection('post-detail', railButtons)
  useRightRailPage('post-detail', 'settings')

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
      cancelScheduled={cancelScheduled}
      cancelling={cancelling}
      campaignId={campaignId}
      campaignName={campaign?.name?.trim() || 'Campaign'}
    />
  )
}

type PostEditorSurfaceProps = {
  doc: Post
  changeDoc: (fn: (p: Post) => void) => void
  transitionStatus: (next: PostStatus) => Promise<TransitionStatusResult>
  cancelScheduled: (target: CancelTarget) => Promise<TransitionStatusResult>
  cancelling: boolean
  campaignId: string
  campaignName: string
}

function PostEditorSurface({
  doc,
  changeDoc,
  transitionStatus,
  cancelScheduled,
  cancelling,
  campaignId,
  campaignName,
}: PostEditorSurfaceProps) {
  const [titleDraft, setTitleDraft] = useState(doc.title)
  const [view, setView] = useState<PostView>('edit')
  const titleRef = useRef<HTMLTextAreaElement | null>(null)

  // The assistant thread for this post lives in the global assistant panel.
  // We watch its content revision to remount the editor after an applied edit
  // (the editor only reads `initialContent` on mount), and its status to lock
  // the editor read-only while a turn is streaming.
  const tkey = threadKey({ kind: 'post', targetId: doc.id, title: doc.title })
  const contentRevision = useThreadContentRevision(tkey)
  const assistantStreaming = useAssistantStore(
    (s) => s.threads[tkey]?.status === 'streaming',
  )
  const openThread = useAssistantStore((s) => s.openThread)
  const setRailActive = useRightRailStore((s) => s.setActiveId)
  const railActive = useRightRailStore((s) => s.activeId)

  const openAssistant = useCallback(() => {
    openThread({
      kind: 'post',
      targetId: doc.id,
      title: titleDraft.trim() || 'Untitled post',
    })
    setRailActive('ai')
  }, [openThread, setRailActive, doc.id, titleDraft])

  // While the assistant panel is open on a post, focus that post's thread so the
  // panel is always scoped to what you're viewing — whether it was opened via the
  // header action or the global rail icon. `openThread` is create-or-focus, so a
  // returning post reuses its existing thread (and history) instead of resetting.
  useEffect(() => {
    if (railActive !== 'ai') return
    openThread({
      kind: 'post',
      targetId: doc.id,
      title: doc.title.trim() || 'Untitled post',
    })
  }, [railActive, doc.id, openThread])

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

  const platformInfo = getPlatformInfo(doc.platform_id)
  const navLabel = platformInfo
    ? `${platformInfo.name} - ${getPostTypeLabel(doc.platform_id, doc.platform_post_type)}`
    : 'No platform'

  return (
    <PageContainer variant="fullFlex">
      <ScrollArea className="flex-1 min-h-0 lg:px-6" type="scroll" scrollHideDelay={350}>
        <EditPageHeader
          title={navLabel}
          breadcrumbs={[{ label: campaignName, to: `/campaigns/${campaignId}` }]}
          actions={
            <>
              <Button variant="ghost" size="sm" type="button" onClick={openAssistant}>
                <SparkleIcon />
                Assistant
              </Button>
              <PostPreviewToggle value={view} onChange={setView} />
              <PostStatusHeaderActions
                post={doc}
                transitionStatus={transitionStatus}
                cancelScheduled={cancelScheduled}
                cancelling={cancelling}
              />
            </>
          }
        />
        <div className="flex flex-col items-center gap-0 relative z-0">
          <div className="w-[740px] bg-white px-16 py-8 mt-2 mb-8">
            {view === 'preview' ? (
              <PostPreview post={doc} title={titleDraft} />
            ) : (
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
                  key={`${doc.id}:${contentRevision}`}
                  initialContent={doc.content}
                  onContentChange={handleContentChange}
                  editable={!assistantStreaming}
                />
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </PageContainer>
  )
}
