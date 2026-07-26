import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeftIcon, CaretDownIcon, CaretRightIcon } from '@phosphor-icons/react'
import { RailPanel } from '@/components/page-primitives/RailPanel'
import { Logo } from '@/components/Logo'
import { Skeleton } from '@/components/ui/skeleton'
import { useAssistantStore } from '@/stores/assistantStore'
import { AssistantComposer } from './AssistantComposer'
import { AssistantReply } from './AssistantReply'
import { StarterChips } from './StarterChips'
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
  const prefillToken = useRef(0)
  const pick = useCallback((text: string) => {
    prefillToken.current += 1
    setPrefill({ text, token: prefillToken.current })
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

  return (
    <RailPanel
      title="AI Assistant"
      onClose={onClose}
      className="h-full"
      bodyClassName="flex-1 gap-6"
      scrollRef={scrollRef}
      subheader={
        thread && (
          <button
            type="button"
            onClick={() => selectThread(null)}
            className="mt-2 flex w-full items-center gap-2 text-left text-xs text-tertiary-foreground hover:text-foreground cursor-pointer"
          >
            <ArrowLeftIcon className="size-3.5 shrink-0" />
            <span className="truncate">{thread.title || untitled(thread)}</span>
          </button>
        )
      }
      footer={
        thread && (
          <div className="flex flex-col gap-2">
            {isCampaign && thread.turns.length > 0 && <Suggestions onPick={pick} disabled={running} />}
            <AssistantComposer
              onSend={(text) => void send(thread.id, text)}
              running={running}
              onCancel={() => cancel(thread.id)}
              placeholder={
                isCampaign
                  ? 'Ask for a plan, a brief change, or a review...'
                  : 'Ask for a change to this post...'
              }
              prefill={prefill}
            />
          </div>
        )
      }
    >
      {thread ? <ThreadView thread={thread} onPick={pick} /> : <ThreadList />}
    </RailPanel>
  )
}

/** Mid-conversation access to the starters, collapsed by default. */
function Suggestions({
  onPick,
  disabled,
}: {
  onPick: (text: string) => void
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 self-start text-xs text-tertiary-foreground hover:text-foreground cursor-pointer"
      >
        {open ? <CaretDownIcon className="size-3" /> : <CaretRightIcon className="size-3" />}
        Suggestions
      </button>
      {open && <StarterChips onPick={onPick} disabled={disabled} />}
    </div>
  )
}

function ThreadView({
  thread,
  onPick,
}: {
  thread: AssistantThread
  onPick: (text: string) => void
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
    // The campaign assistant has nine capabilities and no other affordance
    // announcing them, so its empty state is the menu.
    if (thread.subject.kind === 'campaign') {
      return (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-tertiary-foreground">
            Ask about this campaign, or start with:
          </p>
          <StarterChips onPick={onPick} />
        </div>
      )
    }
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <Logo variant="mark" className="size-8 text-quinary-foreground" />
        <p className="max-w-64 text-sm text-tertiary-foreground">
          Ask for a rewrite, a different tone, or to work something in from an attached asset.
        </p>
      </div>
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

function untitled(thread: AssistantThread): string {
  return thread.subject.kind === 'campaign' ? 'Untitled campaign' : 'Untitled post'
}
