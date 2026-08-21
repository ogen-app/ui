import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ListBulletsIcon } from '@phosphor-icons/react'
import { RailPanel } from '@/components/page-primitives/RailPanel'
import { Logo } from '@/components/Logo'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/styles'
import { useAssistantStore } from '@/stores/assistantStore'
import { selectActivePanel, useSettingsStore } from '@/stores/settingsStore'
import { AssistantComposer } from './AssistantComposer'
import { AssistantReply } from './AssistantReply'
import { StarterChips } from './StarterChips'
import { ThreadStatusSummary } from './ThreadStatusSummary'
import { ThreadEmptyState } from './ThreadEmptyState'
import { ThreadList } from './ThreadList'
import { UserMessage } from './UserMessage'
import type { AssistantThread } from '@/types/assistant'

/**
 * The assistant, hosted in the right sidebar. It shows either the list of open
 * threads or one thread's conversation; a thread is started from its subject's
 * page but stays reachable — and keeps running — from anywhere.
 *
 * The panel stays mounted while the sidebar shows something else, so the
 * thread and the draft survive panel switches.
 */
export function AssistantPanel({ onClose }: { onClose?: () => void }) {
  const activeId = useAssistantStore((s) => s.activeThreadId)
  const thread = useAssistantStore((s) => (s.activeThreadId ? s.threads[s.activeThreadId] : undefined))
  const loadHistory = useAssistantStore((s) => s.loadHistory)
  const selectThread = useAssistantStore((s) => s.selectThread)
  const send = useAssistantStore((s) => s.send)
  const cancel = useAssistantStore((s) => s.cancel)
  const scrollRef = useRef<HTMLDivElement>(null)

  // A starter fills the composer rather than sending: every campaign
  // capability except the reviews writes, so the user gets the last word.
  const [prefill, setPrefill] = useState<{ text: string; token: number }>()
  const [suggesting, setSuggesting] = useState(false)
  const prefillToken = useRef(0)
  const pick = useCallback((text: string) => {
    prefillToken.current += 1
    setPrefill({ text, token: prefillToken.current })
    // The draft is now the suggestion — leaving the list open would only push
    // the thread up while the user edits it.
    setSuggesting(false)
  }, [])

  useEffect(() => {
    if (activeId) void loadHistory(activeId)
  }, [activeId, loadHistory])

  // Looking at a thread is what marks it read — not opening the rail, and not
  // being the thread that happens to be selected. The panel stays mounted
  // behind every other panel and keeps its thread selected across navigation,
  // so without the resolved-panel check a turn could finish "read" while a
  // quality report covered it. This is also the only path in: reopening the
  // rail onto the thread you were already in never goes through `selectThread`,
  // which is where the other half of the marking lives.
  const panelShowing = useSettingsStore(selectActivePanel) === 'assistant'
  const markRead = useAssistantStore((s) => s.markRead)
  const unread = thread?.unread
  useEffect(() => {
    if (panelShowing && activeId && unread) markRead(activeId)
  }, [panelShowing, activeId, unread, markRead])

  // A draft asked for from elsewhere in the app (an overview CTA) lands in the
  // composer exactly like a starter chip — filled in, never sent.
  const prefillRequest = useAssistantStore((s) => s.prefillRequest)
  const clearPrefillRequest = useAssistantStore((s) => s.clearPrefillRequest)
  useEffect(() => {
    if (!prefillRequest || prefillRequest.threadId !== activeId) return
    pick(prefillRequest.text)
    clearPrefillRequest()
  }, [prefillRequest, activeId, pick, clearPrefillRequest])

  // Pin to the newest turn. Streaming grows the last turn rather than adding
  // one, so this tracks its length too.
  //
  // Layout, not passive: a thread's history arrives all at once, and a passive
  // effect runs *after* the browser has painted it — so the panel showed the
  // top of the conversation for a frame and then snapped to the bottom. Moving
  // the write before paint means the newest turn is simply where the panel
  // opens.
  const turns = thread?.turns
  const streamLength = turns && turns.length > 0 ? turns[turns.length - 1].content.length : 0
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [activeId, turns?.length, streamLength])

  const running = thread?.status === 'running'
  const isCampaign = thread?.subject.kind === 'campaign'
  // An unused thread *is* the starter menu, so the lightbulb starts lit and
  // keeps owning the chips — it just toggles them where they already are.
  const isEmpty = Boolean(thread?.loaded && thread.turns.length === 0)
  const chipsInFooter = suggesting && !isEmpty
  useEffect(() => {
    setSuggesting(isEmpty)
  }, [activeId, isEmpty])

  return (
    <RailPanel
      title="Content Strategist"
      onClose={onClose}
      className="h-full"
      bodyClassName="flex-1 gap-6"
      scrollRef={scrollRef}
      subheader={<ThreadStatusSummary />}
      // The panel's square, and the one place the rail says what the two lines
      // beside it are: a list of conversations. Exactly a row's square — 40px
      // and the same 20px glyph — rather than stretched to the two lines it
      // stands against, which came to 46 and read as a different object next to
      // the list it heads. It centres on the pair instead, so the 3px of slack
      // is split rather than hanging off one end.
      leading={
        <span
          aria-hidden
          className={cn(
            'flex size-10 shrink-0 items-center justify-center self-center',
            // Its own fill, unlike the type beside it: the mark is an object,
            // and a thread scrolling through the inside of a bordered square
            // reads as a hole in the header rather than as translucency.
            'bg-primary border border-border text-tertiary-foreground transition-colors',
            // Only lights up when the block is a way back to the list — on the
            // list itself there is nowhere to go and it is just the mark.
            'group-hover/title:border-foreground group-hover/title:text-foreground',
          )}
        >
          <ListBulletsIcon className="size-5" />
        </span>
      }
      // Only inside a thread does the header have somewhere to go; on the list
      // itself it is just a heading.
      onTitleClick={thread ? () => selectThread(null) : undefined}
      titleLabel={thread ? 'Back to all conversations' : undefined}
      // Solid across the 24px below the composer only — the whole 56px row is on
      // the ramp. That is what puts a trace of the thread at the height of the
      // placeholder: the field's own fill covers the words, so what shows is the
      // gaps around it and between the buttons, and the input reads as sitting
      // *in* the panel rather than on a plate laid over it. The ramp then runs
      // 40px clear of the row, which is where the fade is actually watched — a
      // short one ends too close to the row and reads as a cut. Chips make the
      // footer a block of a depth this doesn't know, so it falls back to
      // covering all of it.
      footerSolid={chipsInFooter ? undefined : 24}
      footerFade={96}
      footer={
        thread && (
          // No fill of its own: the panel's ramp is what the thread scrolls
          // behind, and a solid block here would put the composer back on the
          // slab the ramp exists to get rid of. Keyed by thread: openThread can
          // swap the active thread without unmounting the panel, and the
          // composer's local draft must not follow into the next conversation.
          <div key={thread.id} className={cn('flex flex-col gap-2', chipsInFooter && 'pt-3')}>
            {/* In an empty thread the chips are the body's, not the footer's. */}
            {chipsInFooter && (
              <StarterChips
                kind={thread.subject.kind}
                onPick={pick}
                disabled={running}
              />
            )}
            <AssistantComposer
              onSend={(text) => void send(thread.id, text)}
              running={running}
              onCancel={() => cancel(thread.id)}
              placeholder={
                isCampaign
                  ? 'Ask for a plan or a review...'
                  : 'Ask for a change to this post...'
              }
              prefill={prefill}
              onToggleSuggestions={() => setSuggesting((s) => !s)}
              suggestionsOpen={suggesting}
            />
          </div>
        )
      }
    >
      {thread ? (
        <ThreadView thread={thread} onPick={pick} showStarters={suggesting} />
      ) : (
        <ThreadList />
      )}
    </RailPanel>
  )
}

function ThreadView({
  thread,
  onPick,
  showStarters,
}: {
  thread: AssistantThread
  onPick: (text: string) => void
  showStarters: boolean
}) {
  if (!thread.loaded) {
    return (
      <div className="flex flex-col gap-3" aria-busy>
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    )
  }

  if (thread.turns.length === 0) {
    return (
      <ThreadEmptyState
        kind={thread.subject.kind}
        onPick={onPick}
        showStarters={showStarters}
      />
    )
  }

  return (
    <>
      {thread.turns.map((turn) =>
        turn.role === 'user' ? (
          <UserMessage key={turn.id} content={turn.content} />
        ) : (
          <AssistantReply key={turn.id} turn={turn} />
        ),
      )}
      {thread.status === 'running' && (
        <Logo variant="mark" loading className="size-8 shrink-0 text-accent" />
      )}
    </>
  )
}
