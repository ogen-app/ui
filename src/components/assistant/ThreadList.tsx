import { Link } from '@tanstack/react-router'
import {
  ArrowSquareOutIcon,
  MegaphoneIcon,
  NoteIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useAssistantStore } from '@/stores/assistantStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useTick } from '@/hooks/useTick'
import { formatDuration } from '@/lib/assistantTools'
import type { AssistantThread } from '@/types/assistant'

/**
 * Every open thread, so a run started on one campaign stays visible — and
 * resumable — from anywhere in the app. Threads are only *started* from their
 * subject's page; this is how the user gets back to them.
 */
export function ThreadList() {
  const threads = useAssistantStore((s) => s.threads)
  const select = useAssistantStore((s) => s.selectThread)
  const close = useAssistantStore((s) => s.closeThread)
  const list = Object.values(threads)
  const anyRunning = list.some((t) => t.status === 'running')
  useTick(anyRunning, 1000)

  if (list.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-tertiary-foreground">No conversations yet.</p>
        <p className="max-w-64 text-sm text-quaternary-foreground">
          Open a campaign or a post to start one — the assistant works on whatever you're in.
        </p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col">
      {list.map((thread) => {
        const Icon = thread.subject.kind === 'campaign' ? MegaphoneIcon : NoteIcon
        return (
          <li key={thread.id} className="border-b border-border first:border-t">
            <div className="group flex items-center gap-2">
              <button
                type="button"
                onClick={() => select(thread.id)}
                // Not `items-start`: the rows must stretch so `truncate` has a
                // width to work against.
                className="flex min-w-0 flex-1 flex-col gap-0.5 py-3 text-left cursor-pointer"
              >
                <span className="flex w-full items-center gap-2">
                  {thread.unread && (
                    <span className="size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                  )}
                  <Icon className="size-3.5 shrink-0 text-quaternary-foreground" aria-hidden />
                  <span className="truncate text-sm font-medium text-foreground">
                    {thread.title.trim() || untitled(thread)}
                  </span>
                </span>
                <ThreadStatusLine thread={thread} />
              </button>

              <Link
                {...openLink(thread)}
                onClick={() => useSettingsStore.getState().closeRightPanel()}
                aria-label={
                  thread.subject.kind === 'campaign' ? 'Open the campaign' : 'Open the post'
                }
                className="flex size-6 shrink-0 items-center justify-center text-quaternary-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
              >
                <ArrowSquareOutIcon className="size-4" />
              </Link>
              <button
                type="button"
                onClick={() => close(thread.id)}
                aria-label="Close this conversation"
                className="flex size-6 shrink-0 items-center justify-center text-quaternary-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 cursor-pointer"
              >
                <XIcon className="size-4" />
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/** Where the jump-to arrow goes, per subject kind. */
function openLink(thread: AssistantThread) {
  if (thread.subject.kind === 'campaign') {
    return {
      to: '/campaigns/$campaignId',
      params: { campaignId: thread.subject.campaignId },
    } as const
  }
  return {
    to: '/campaigns/$campaignId/posts/$postId',
    params: {
      campaignId: thread.subject.campaignId,
      postId: thread.subject.postId,
    },
  } as const
}

function ThreadStatusLine({ thread }: { thread: AssistantThread }) {
  if (thread.status === 'running') {
    const elapsed = thread.runStartedAt ? Date.now() - thread.runStartedAt : 0
    return (
      <span className="flex items-center gap-1.5 text-xs text-accent">
        <span className="size-1.5 rounded-full bg-accent animate-pulse" aria-hidden />
        Working · {formatDuration(elapsed)}
      </span>
    )
  }
  if (thread.status === 'error') {
    return <span className="text-xs text-destructive">Failed</span>
  }
  const last = thread.turns[thread.turns.length - 1]
  return (
    <span className="block w-full truncate text-xs text-tertiary-foreground">
      {last?.content || 'No messages yet'}
    </span>
  )
}

function untitled(thread: AssistantThread): string {
  return thread.subject.kind === 'campaign' ? 'Untitled campaign' : 'Untitled post'
}
