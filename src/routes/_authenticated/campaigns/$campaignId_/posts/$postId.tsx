import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { PageContainer } from '@/components/page-primitives/PageContainer'
import { PAGE_ACTION_BAR_INSET } from '@/components/page-primitives/PageActionBar'
import { PageBottomFader } from '@/components/page-primitives/PageBottomFader'
import { PageLoader } from '@/components/page-primitives/PageLoader'
import { PageError } from '@/components/page-primitives/PageError'
import { Explainer } from '@/components/page-primitives/Explainer'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PostContentEditor } from '@/components/posts/PostContentEditor'
import { ThreadSplitNote } from '@/components/posts/sequence/ThreadSplitNote'
import { PostDetailsHeader } from '@/components/posts/PostDetailsHeader'
import { PostLockNotice } from '@/components/posts/PostLockNotice'
import { PostPerformanceSection } from '@/components/analytics/PostPerformanceSection'
import { usePostPerformance } from '@/hooks/usePostPerformance'
import { PostMediaCard } from '@/components/posts/PostMediaCard'
import { PostQuickSettingsBar } from '@/components/posts/PostQuickSettingsBar'
import { PostStatusActionBar } from '@/components/posts/PostStatusActionBar'
import { PostSourcesCard } from '@/components/posts/sources/PostSourcesCard'
import { PostValidationsSection } from '@/components/posts/PostValidationsSection'
import { DeletePostDialog } from '@/components/posts/DeletePostDialog'
import { PublishedUrlDialog } from '@/components/posts/PublishedUrlDialog'
import { PostSettingsForm } from '@/components/forms/postSettingsForm/PostSettingsForm'
import { PostPreviewPanel } from '@/components/posts/preview/PostPreviewPanel'
import { PostQualityPanelView } from '@/components/posts/quality/PostQualityPanelView'
import { PostVersionsPanel } from '@/components/posts/versions/PostVersionsPanel'
import { PostNotesCard } from '@/components/posts/notes/PostNotesCard'
import {
  POST_PREVIEW_PORTAL_ID,
  POST_QUALITY_PORTAL_ID,
  POST_SETTINGS_PORTAL_ID,
  POST_VERSIONS_PORTAL_ID,
} from '@/components/layout/RightSidebar'
import { selectActivePanel, useSettingsStore } from '@/stores/settingsStore'
import { usePanelScope } from '@/hooks/usePanelScope'
import { threadIdFor, useAssistantStore } from '@/stores/assistantStore'
import { charCount } from '@/lib/socialText'
import { getPlatformInfo } from '@/lib/platformDictionary'
import {
  MAX_THREAD_POSTS,
  isSequencePost,
  planThread,
} from '@/lib/threadSequence'
import { useFeatureFlag } from '@/config/featureFlags'
import { useThreadSequence } from '@/hooks/useThreadSequence'
import type { PostCheck } from '@/lib/postValidation'
import { useCampaign } from '@/hooks/useCampaigns'
import {
  usePost,
  type TransitionStatusResult,
  type VerifyExternalResult,
} from '@/hooks/usePost'
import { usePostAssessment } from '@/hooks/usePostAssessment'
import { usePostMedia } from '@/hooks/usePostMedia'
import { usePostNotes } from '@/hooks/usePostNotes'
import { usePostStatusActions } from '@/hooks/usePostStatusActions'
import { useDuplicatePost } from '@/hooks/usePosts'
import { useAutoPublishAllowlist } from '@/hooks/useAutoPublishAllowlist'
import { usePublishingAccount } from '@/hooks/usePublishingAccount'
import { usePostArrowNavigation } from '@/hooks/usePostNavigation'
import { usePublishStatus } from '@/hooks/usePublishStatus'
import { cn } from '@/lib'
import { downloadMarkdown } from '@/lib/downloadMarkdown'
import { resolvePublishMethod } from '@/lib/autoPublish'
import { isSubmitted, type PublishMethod } from '@/lib/postStatusMachine'
import type { CancelTarget } from '@/services/api/posts'
import type { PostNote } from '@/services/api/postNotes'
import type { Post, PostStatus } from '@/types/posts'

export const Route = createFileRoute(
  '/_authenticated/campaigns/$campaignId_/posts/$postId',
)({
  component: PostPage,
})

function PostPage() {
  const { campaignId, postId } = Route.useParams()
  // Declared by the route, not by the editor below it: being on a post is what
  // makes the post panels resolvable, and that is true from the moment the URL
  // is. Inside the editor it would drop for as long as the document takes to
  // arrive — the rail would fall back to the assistant and animate its width
  // twice on the way to a post nobody had opened before.
  usePanelScope('post', campaignId)
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
      // A different post is a different document, not new props for this one.
      // The surface holds page-local state that only makes sense against the
      // post it was opened on — the title draft, the auto/manual choice, the
      // blocked-action flash — and until the arrow keys (`usePostArrowNavigation`)
      // there was no way to reach one post from another without the loader
      // unmounting it in between. Arriving on a post already in cache skips
      // that loader entirely, so the identity has to be stated.
      key={postId}
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

/**
 * The first few words of a post, for the media picker's menu. Long enough to
 * recognise the post by, short enough not to reflow the menu.
 */
function excerpt(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > 48 ? `${flat.slice(0, 47)}…` : flat
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
  // Only the thread-sequence copy reads this today — the rest of this screen
  // is still hard-coded English awaiting the CON-174 pass.
  const { t } = useTranslation()
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

  // A copy of this post already exists outside Ogen — Zernio holds the
  // submission, or the network holds the post — so the document below is the
  // record of it rather than a draft (CON-251). Every surface on this screen
  // asks the one predicate; the cards that already knew about `published`
  // (media, the date, the account) now answer through it too.
  const locked = isSubmitted(doc.status)

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

  // Thread sequences (CON-196) — a post that publishes as a chain rather than
  // one post. The flag withdraws the type from every picker, so with it off
  // this is false for every post, *including* one already saved as a `thread`:
  // that post keeps rendering as the single body it was written in, which is
  // exactly what it still publishes as until the submit path sends
  // `threadItems`.
  const sequenceEnabled = useFeatureFlag('thread-sequence')
  const platformInfo = getPlatformInfo(doc.platform_id)
  const isSequence =
    sequenceEnabled &&
    isSequencePost(platformInfo?.zernioId, doc.platform_post_type)

  // Attachments, the platform's post-type rules and the checks derived from
  // both. Called once here because the media card and the validations
  // section are two views of the same state (and share upload progress).
  const media = usePostMedia(doc, isSequence)

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
  // Null unless something really is going to publish the post — see
  // `publishTiming` for which statuses those are.
  const publishStatus = usePublishStatus(doc)

  // The bottom bar's slot once there are no transitions left to put in it.
  // Offered on `published` alone, not on every locked status: a scheduled post
  // still has UNSCHEDULE to make, and duplicating one would be a second copy
  // of something that has not happened yet.
  const duplicate = useDuplicatePost(campaignId)
  const duplicateAction =
    doc.status === 'published'
      ? { run: () => duplicate.run(doc), running: duplicate.running }
      : null
  // ← / → step to the neighbouring post, unless the keypress belongs to a
  // field the user is typing in.
  usePostArrowNavigation(campaignId, doc.id)
  // The allowlist decides whether SCHEDULE lands on auto or manual, so the
  // status actions wait for it too — scheduling a post the wrong way is not
  // something the user can see happening, let alone undo.
  const statusBusy = pending || cancelling || allowlistPending
  const flashBlockers = useCallback(() => setAttention((n) => n + 1), [])

  // The settings form renders in the shared right sidebar (one panel at a
  // time, alongside the AI assistant). The route owns the form because it
  // owns the post's autosave pipeline; the sidebar only hosts the layer. What
  // makes these four resolvable at all is the scope `PostPage` declares — off
  // this screen they stay remembered but the rail falls back to the assistant.
  const activePanel = useSettingsStore(selectActivePanel)
  const settingsOpen = activePanel === 'postSettings'
  const previewOpen = activePanel === 'postPreview'
  const qualityOpen = activePanel === 'postQuality'
  const versionsOpen = activePanel === 'postVersions'
  // Lazy, then sticky: the sidebar keeps every layer mounted for the
  // crossfade, but the versions panel fetches its history on mount — portalled
  // eagerly, merely opening a post costs a GET /versions nobody asked for.
  // First open mounts it; after that it stays for the fade.
  const [versionsWarm, setVersionsWarm] = useState(false)
  useEffect(() => {
    if (versionsOpen) setVersionsWarm(true)
  }, [versionsOpen])
  const toggleRightPanel = useSettingsStore((s) => s.toggleRightPanel)
  const openRightPanel = useSettingsStore((s) => s.openRightPanel)
  const closeRightPanel = useSettingsStore((s) => s.closeRightPanel)

  // Owned here rather than inside the quality panel (CON-183): the checks bar
  // shows the score and can start a run, and the panel draws that same run's
  // progress. Two `usePostAssessment` instances would share the cached result
  // but not the run — the bar would stream while the panel sat on its "assess
  // this post" empty state, offering a second one.
  const quality = usePostAssessment(doc.id)
  const { assessment, assess: startAssessment, assessing } = quality
  // Opening the rail is its own action, separate from starting a run: the bar
  // can now do both, and a link that says "see the full breakdown" must not
  // also spend a model call.
  const openQuality = useCallback(
    () => openRightPanel('postQuality'),
    [openRightPanel],
  )
  // Notes (CON-188), all of them in the one card below the media.
  const notes = usePostNotes(doc.id)
  const { edit: editNote } = notes
  const saveNote = useCallback(
    (note: PostNote, patch: { title: string; body: string }) =>
      editNote(note.id, patch),
    [editNote],
  )

  const [settingsHost, setSettingsHost] = useState<HTMLElement | null>(null)
  const [previewHost, setPreviewHost] = useState<HTMLElement | null>(null)
  const [qualityHost, setQualityHost] = useState<HTMLElement | null>(null)
  const [versionsHost, setVersionsHost] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setSettingsHost(document.getElementById(POST_SETTINGS_PORTAL_ID))
    setPreviewHost(document.getElementById(POST_PREVIEW_PORTAL_ID))
    setQualityHost(document.getElementById(POST_QUALITY_PORTAL_ID))
    setVersionsHost(document.getElementById(POST_VERSIONS_PORTAL_ID))
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

  // What this post did, once it is out there. The facts come off the document
  // because the wire carries none of them — the snapshot knows figures, not
  // which campaign this was for or what a "Single image" is called.
  const performanceFacts = useMemo(
    () => ({
      title: doc.title,
      platform: doc.platform_id,
      format: doc.platform?.post_types[doc.platform_post_type] ?? '',
      publishedAt: doc.published_at,
      scheduledAt: doc.scheduled_at,
      campaign: campaignName,
      // Empty means unspecified, and a reconnect link pointing at "" would
      // name an account the connections screen has never heard of.
      socialAccountId: doc.social_account_id || null,
    }),
    [
      doc.title,
      doc.platform_id,
      doc.platform,
      doc.platform_post_type,
      doc.published_at,
      doc.scheduled_at,
      doc.social_account_id,
      campaignName,
    ],
  )
  const performance = usePostPerformance(
    doc.id,
    doc.status,
    doc.publisher_post_id,
    performanceFacts,
  )
  useEffect(() => {
    openThread({ kind: 'post', postId: doc.id, campaignId }, doc.title, '')
    // Only on arrival — the title is tracked separately so that retitling the
    // post doesn't yank the panel away from a thread the user is reading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openThread, doc.id, campaignId])

  useEffect(() => {
    renameThread(threadId, doc.title, campaignName?.trim())
  }, [renameThread, threadId, doc.title, campaignName])

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

  // The one thing a thread stores: which post of the chain carries which file.
  // The words are not here — they are `doc.content`, and the chain is derived
  // from it below, so there is no second copy to keep in step.
  const sequence = useThreadSequence(doc.id, {
    enabled: isSequence,
    attachments: media.attachments,
  })

  // The chain itself, worked out from the body on every keystroke. Every
  // ceiling here is per post, because each post of a chain *is* a post on the
  // platform: the character limit the server resolved, and the platform's own
  // per-post media caps.
  const plan = useMemo(
    () =>
      planThread({
        content: isSequence ? doc.content : '',
        attachments: media.attachments,
        assignment: sequence.assignment,
        charLimit: media.maxContentChars,
        imageCap: media.policy.image?.maxPerPost,
        videoCap: media.policy.video?.maxPerPost,
      }),
    [
      isSequence,
      doc.content,
      media.attachments,
      sequence.assignment,
      media.maxContentChars,
      media.policy,
    ],
  )

  // What the media card's per-thumbnail picker offers. Excerpts rather than
  // numbers alone: telling post 4 from post 5 by counting paragraphs back in
  // the editor is not something to ask of anyone.
  const threadTargets = useMemo(
    () =>
      isSequence
        ? {
            excerpts: plan.posts.map((p) => excerpt(p.text)),
            indexFor: (id: string) =>
              // Never -1: `planThread` puts every live attachment on a post,
              // and an unassigned one on the first.
              Math.max(
                0,
                plan.posts.findIndex((p) =>
                  p.attachments.some((a) => a.id === id),
                ),
              ),
            assign: sequence.assign,
          }
        : undefined,
    [isSequence, plan, sequence.assign],
  )

  // Appended here rather than inside `evaluatePost`, which is a pure module
  // with no `t` — and this row is new copy, so it belongs in the catalogue
  // (CLAUDE.md) rather than beside that file's legacy English.
  //
  // Length is deliberately not among the things it can fail on: a part of the
  // body past the ceiling is cut to fit rather than reported, so what is left
  // is the media the author has to move themselves.
  const checks = useMemo<PostCheck[]>(() => {
    if (!isSequence) return media.checks
    const failing = plan.posts.filter((p) => p.issues.length > 0)
    return [
      ...media.checks,
      {
        id: 'thread-sequence',
        label: t('posts.sequence.check.label'),
        status: plan.pending
          ? 'pending'
          : plan.overflowed || failing.length > 0
            ? 'fail'
            : 'pass',
        detail: plan.pending
          ? t('posts.sequence.check.pending')
          : plan.overflowed
            ? t('posts.sequence.check.overflow', { max: MAX_THREAD_POSTS })
            : failing.length > 0
              ? t('posts.sequence.check.issues', {
                  count: failing.length,
                  positions: failing.map((p) => p.position).join(', '),
                })
              : t('posts.sequence.postCount', { count: plan.posts.length }),
      },
    ]
  }, [isSequence, media.checks, plan, t])

  const handleDownloadMarkdown = useCallback(
    () => downloadMarkdown(doc.title, doc.content, 'post'),
    [doc.title, doc.content],
  )

  return (
    // Fades in rather than appearing whole. The document, the bars and the
    // cards all become ready in the same commit, so without this the screen
    // arrives as one hard cut — from a spinner, or from the post that was here
    // a moment ago. Keyed by post above, so the fade plays on each one.
    <PageContainer variant="fullFlex" className="page-content-motion">
      {/* `relative` so the action bar anchors to the content column rather
          than the window: the right rail is a sibling of this container, so
          the bar recentres when a panel opens instead of drifting off the
          post it acts on. */}
      <div className="relative flex flex-1 min-h-0">
        <ScrollArea
          className="flex-1 min-h-0"
          type="scroll"
          scrollHideDelay={350}
        >
          <PostDetailsHeader
            campaignId={campaignId}
            saving={saving}
            settingsOpen={settingsOpen}
            onToggleSettings={() => toggleRightPanel('postSettings')}
            previewOpen={previewOpen}
            onTogglePreview={() => toggleRightPanel('postPreview')}
            qualityOpen={qualityOpen}
            onToggleQuality={() => toggleRightPanel('postQuality')}
            versionsOpen={versionsOpen}
            onToggleVersions={() => toggleRightPanel('postVersions')}
            onDownloadMarkdown={handleDownloadMarkdown}
            onDeletePost={() => setDeleteOpen(true)}
          />
          <div
            className={cn(
              'flex flex-col items-center gap-3 relative z-0',
              PAGE_ACTION_BAR_INSET,
            )}
          >
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
            {/* Between the bar and the checks: below the status badge that is
                the reason for the lock, above everything the lock applies to. */}
            <div className="w-content empty:hidden">
              <PostLockNotice status={doc.status} />
            </div>
            <div className="w-content">
              <PostValidationsSection
                checks={checks}
                status={doc.status}
                assessment={assessment}
                postUpdatedAt={doc.updated_at}
                qualityUnavailable={quality.unavailable}
                assessing={assessing}
                onAssess={startAssessment}
                onOpenQuality={openQuality}
              />
            </div>
            <div className="w-content bg-primary px-10 py-8">
              <div className="flex flex-col">
                <div className="mb-4 flex flex-col">
                  <textarea
                    ref={titleRef}
                    value={titleDraft}
                    onChange={(e) => {
                      const next = e.target.value.replace(/\n/g, '')
                      handleTitleChange(next)
                    }}
                    // No placeholder once locked: "Title" under a published
                    // post reads as a field waiting to be filled in, and
                    // nobody can fill it in. An untitled post that has gone
                    // out simply has no title.
                    placeholder={locked ? undefined : 'Title'}
                    readOnly={locked}
                    rows={1}
                    className="resize-none overflow-hidden bg-transparent border-0 outline-none w-full text-4xl font-bold tracking-tight placeholder:text-tertiary-foreground"
                  />
                  {/* Only where the platform publishes a title and caps it —
                      YouTube today. Elsewhere the title is Ogen's own label
                      and a counter on it would be noise. Deliberately not a
                      `maxLength`: silently swallowing keystrokes mid-word is
                      worse than showing how far over the title is. */}
                  <TitleCounter
                    title={titleDraft}
                    limit={media.maxTitleChars}
                  />
                </div>
                {/* One editor for every post type, threads included: a thread
                    is the same Markdown body, and the chain is derived from
                    it. The Explainer teaches the divider; the note below
                    reports what the body actually became. */}
                {isSequence && (
                  <Explainer id="post-thread-sequence" className="mb-6">
                    {t('posts.sequence.explainer')}
                  </Explainer>
                )}
                <PostContentEditor
                  content={doc.content}
                  onContentChange={handleContentChange}
                  readOnly={locked}
                  busy={assistantRunning}
                />
                {isSequence && (
                  <ThreadSplitNote
                    plan={plan}
                    charLimit={media.maxContentChars}
                  />
                )}
              </div>
            </div>
            <div className="w-content">
              <PostSourcesCard post={doc} changeDoc={changeDoc} />
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
                thread={threadTargets}
              />
            </div>
            {/* Above the notes, below everything that *is* the post. For a
                published post this is the reason the screen was opened, and
                notes are the team's working material either way — burying the
                figures under a card that grows without limit would put the
                answer below the commentary. `empty:hidden` because most of
                this section's states render nothing at all. */}
            <div className="w-content empty:hidden">
              <PostPerformanceSection
                result={performance}
                onAddPostLink={() => setPublishedUrlOpen(true)}
              />
            </div>
            <div className="w-content">
              <PostNotesCard
                notes={notes.notes}
                loading={notes.loading}
                error={notes.error !== null}
                onAdd={notes.add}
                onSave={saveNote}
                onDelete={notes.remove}
              />
            </div>

            {/* Scroll past the end. `PAGE_ACTION_BAR_INSET` above is only
                clearance — the minimum that keeps the bar off the last card —
                and it leaves the notes pinned against the bottom edge with
                nowhere to go. This is the travel that lets the end of the post
                come up to the middle of the screen, where you can read it. A
                spacer rather than more padding: the two have different jobs,
                and `cn` would merge one `pb-*` over the other and silently
                drop the clearance. */}
            <div className="h-40 shrink-0" aria-hidden />
          </div>
        </ScrollArea>

        {/* The header's fade, mirrored: the post dissolves into the page on
            its way under the action bar rather than being sliced off by the
            bottom edge. Sibling of the scroll area, before the bar, so it
            covers the document and nothing else. */}
        <PageBottomFader />

        {/* Outside the ScrollArea on purpose — inside it the bar would scroll
            away with the post. Renders nothing once the post is terminal. */}
        <PostStatusActionBar
          buttons={buttons}
          back={back}
          duplicate={duplicateAction}
          pending={statusBusy}
          onBlocked={flashBlockers}
          status={publishStatus}
        />

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
              sequence={isSequence ? plan : undefined}
              onClose={closeRightPanel}
            />,
            previewHost,
          )}

        {qualityHost &&
          createPortal(
            /* `doc.updated_at` rather than the stored evaluation's copy of the
               post, so the panel can tell a score that still describes what is
               in the editor from one taken before the last edit. */
            <PostQualityPanelView
              assessment={assessment}
              postUpdatedAt={doc.updated_at}
              loading={quality.loading}
              unavailable={quality.unavailable}
              loadError={quality.loadError}
              onReload={quality.reload}
              onAssess={startAssessment}
              assessing={assessing}
              steps={quality.steps}
              cached={quality.cached}
              assessError={quality.assessError}
              locked={locked}
              onClose={closeRightPanel}
            />,
            qualityHost,
          )}

        {versionsWarm &&
          versionsHost &&
          createPortal(
            /* The live document, so the list can tell whether the newest
               snapshot still *is* the post's text or has been edited past.
               Its writes still go through the server's stored copy, flushing
               the autosave first. */
            <PostVersionsPanel doc={doc} onClose={closeRightPanel} />,
            versionsHost,
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

/**
 * The title's character count against the platform's cap (CON-160).
 *
 * Renders nothing when the platform sets no title limit — five of the six do
 * — and nothing while the platform row is still loading, so it never flashes
 * a cap it is about to correct.
 */
function TitleCounter({
  title,
  limit,
}: {
  title: string
  limit: number | null | undefined
}) {
  // Counted after this exit: five of the six platforms have no title cap, and
  // a counter that renders nothing should cost nothing per keystroke.
  if (!limit) return null
  const length = charCount(title.trim())
  const over = length > limit
  return (
    <span
      className={cn(
        'self-end text-xs tabular-nums',
        over ? 'text-destructive' : 'text-tertiary-foreground',
      )}
    >
      {length} / {limit}
    </span>
  )
}
