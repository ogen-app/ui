import { useCallback, useEffect, useRef, useState } from 'react'
import { RailPanel } from '@/components/page-primitives/RailPanel'
import { Logo } from '@/components/Logo'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/styles'
import { useAssistantStore } from '@/stores/assistantStore'
import { AssistantComposer } from './AssistantComposer'
import { AssistantReply } from './AssistantReply'
import { StarterChips } from './StarterChips'
import { ThreadCount } from './ThreadCount'
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

  // Pin to the newest turn. Streaming grows the last turn rather than adding
  // one, so this tracks its length too.
  const turns = thread?.turns
  const streamLength = turns && turns.length > 0 ? turns[turns.length - 1].content.length : 0
  useEffect(() => {
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
      titleAdornment={<ThreadCount />}
      // Only inside a thread does the header have somewhere to go; on the list
      // itself it is just a heading.
      onTitleClick={thread ? () => selectThread(null) : undefined}
      titleLabel={thread ? 'Back to all conversations' : undefined}
      // The chips are a block of their own: they want a little opaque margin
      // above them and a longer run-out, where the bare composer reads better
      // tight to the thread with just a short fade.
      footerFade={chipsInFooter ? 32 : 12}
      footer={
        thread && (
          // Opaque: the thread scrolls under the footer, and the starters have
          // to sit on something.
          <div className={cn('flex flex-col gap-2 bg-primary', chipsInFooter && 'pt-3')}>
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
