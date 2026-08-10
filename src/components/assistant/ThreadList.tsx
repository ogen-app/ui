import type { CSSProperties } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowSquareOutIcon,
  BriefcaseIcon,
  FileTextIcon,
  XIcon,
} from '@phosphor-icons/react'
import { Logo } from '@/components/Logo'
import { useAssistantStore } from '@/stores/assistantStore'
import { useTick } from '@/hooks/useTick'
import { cn } from '@/lib/styles'
import { formatDuration } from '@/lib/assistantTools'
import type { AssistantAction, AssistantThread } from '@/types/assistant'

/**
 * Every open thread, so a run started on one campaign stays visible — and
 * resumable — from anywhere in the app. Threads are only *started* from their
 * subject's page; this is how the user gets back to them.
 *
 * A row is its subject over its state: what the thread is attached to, then
 * what the assistant did there or is doing now. Threads still group by
 * campaign, so related work stays together even though the campaign name is
 * no longer spelled out on every row.
 */
export function ThreadList() {
  const threads = useAssistantStore((s) => s.threads)
  const currentThreadId = useAssistantStore((s) => s.currentThreadId)
  const select = useAssistantStore((s) => s.selectThread)
  const close = useAssistantStore((s) => s.closeThread)
  const list = order(Object.values(threads), threads[currentThreadId ?? ''])
  const anyRunning = list.some((t) => t.status === 'running')
  useTick(anyRunning, 1000)

  if (list.length === 0) {
    return (
      // Same shape as an empty thread: mark, then what to do about it.
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <Logo variant="mark" className="size-8 text-quinary-foreground" />
        <div className="flex max-w-72 flex-col gap-1 text-sm text-tertiary-foreground">
          <p>No conversations yet.</p>
          <p>Open a campaign or a post to start one.</p>
          <p>The strategist works on whatever you are in.</p>
        </div>
      </div>
    )
  }

  return (
    <ul className="flex flex-col">
      {list.map((thread) => {
        const Icon = thread.subject.kind === 'campaign' ? BriefcaseIcon : FileTextIcon
        return (
          <li
            key={thread.id}
            className="group relative border-b border-border last:border-b-0 hover:bg-secondary"
          >
            <button
              type="button"
              onClick={() => select(thread.id)}
              // Full width: the row actions float over its right end instead of
              // reserving a column, so the text gets the whole rail.
              className="flex w-full min-w-0 items-center gap-3 py-3 text-left cursor-pointer"
            >
              {/* The mark rides the icon box's corner rather than the title
                  line, so it can't push the name around. It is the row's whole
                  activity signal: unread when it holds still, running when it
                  pulses. On hover the box steps up a shade so it doesn't
                  dissolve into the row's own fill. */}
              <span
                className="relative flex size-10 shrink-0 items-center justify-center bg-secondary group-hover:bg-tertiary"
                aria-hidden
              >
                <Icon className="size-8 text-tertiary-foreground" />
                {(thread.unread || thread.status === 'running') && (
                  <span
                    className={cn(
                      'absolute -top-1 -right-1 size-2 rounded-full bg-accent',
                      thread.status === 'running' && 'animate-pulse',
                    )}
                  />
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2">
                  <span className="min-w-0 truncate text-xs text-secondary-foreground">
                    {name(thread)}
                  </span>
                  {thread.id === currentThreadId && (
                    <span className="shrink-0 bg-accent/10 px-[3px] py-[2px] text-[10px] font-semibold tracking-[0.08em] text-accent">
                      CURRENT
                    </span>
                  )}
                </span>
                <ThreadStatusLine thread={thread} />
              </span>
            </button>

            {/* Floated over the row's right end on hover. The gradient lets a
                long line run under the icons and fade out rather than being
                truncated short for a column that is usually empty. */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100">
              {/* Fades into the row's hover fill — the overlay only ever shows
                  while the row is hovered, so that is the colour to match. */}
              <span
                className="h-full w-10 bg-gradient-to-r from-transparent to-secondary"
                aria-hidden
              />
              <span className="flex h-full items-center gap-1 bg-secondary">
                {/* Goes to the subject and leaves the rail exactly as it is.
                    Jumping to a post is not a request to put the assistant
                    away — you usually want it there when you arrive. */}
                <Link
                  {...openLink(thread)}
                  aria-label={
                    thread.subject.kind === 'campaign' ? 'Open the campaign' : 'Open the post'
                  }
                  className="flex size-6 shrink-0 items-center justify-center text-secondary-foreground hover:text-foreground"
                >
                  {/* Bold at this size: these two only appear over the row's
                      hover fill, and at regular weight they barely register
                      against it. */}
                  <ArrowSquareOutIcon weight="bold" className="size-5" />
                </Link>
                <button
                  type="button"
                  onClick={() => close(thread.id)}
                  aria-label="Close this conversation"
                  className="flex size-6 shrink-0 items-center justify-center text-secondary-foreground hover:text-foreground cursor-pointer"
                >
                  <XIcon weight="bold" className="size-5" />
                </button>
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * The current subject first, then everything else from the same campaign, then
 * the rest — so the list opens on the work in front of the user rather than on
 * whatever was registered first.
 */
function order(list: AssistantThread[], current: AssistantThread | undefined): AssistantThread[] {
  if (!current) return list
  const campaignId = current.subject.campaignId
  return [
    current,
    ...list.filter((t) => t.id !== current.id && t.subject.campaignId === campaignId),
    ...list.filter((t) => t.id !== current.id && t.subject.campaignId !== campaignId),
  ]
}

/** What the thread is attached to. The icon already says which kind it is. */
function name(thread: AssistantThread): string {
  if (thread.subject.kind === 'campaign') {
    return thread.campaignTitle.trim() || 'Untitled campaign'
  }
  return thread.title.trim() || 'Untitled post'
}

/**
 * What the assistant did, or is doing — one phrase, in the same vocabulary the
 * thinking timeline uses. A running turn reports the step it is actually on;
 * a finished one reports the action it landed, which is what the user came
 * back to find out.
 */
const ACTION_LABELS: Record<AssistantAction, string> = {
  answered: 'Answered a question',
  declined: 'Declined the request',
  edited: 'Edited the post',
  noted: 'Added a note',
  content_plan_generated: 'Generated a content plan',
  posts_generated: 'Added posts',
  brief_enriched: 'Improved the brief',
  dates_updated: 'Updated the campaign dates',
  posts_redistributed: 'Redistributed posts',
  brief_reviewed: 'Reviewed the brief',
  posts_reviewed: 'Checked posts against the brief',
}

function idleStatus(thread: AssistantThread): string {
  const last = [...thread.turns].reverse().find((t) => t.role === 'assistant')
  if (!last) return thread.turns.length > 0 ? 'Waiting for a reply' : 'Not started yet'
  if (last.cancelled) return 'Stopped'
  if (last.failed) return 'Failed'
  return last.action ? ACTION_LABELS[last.action] : 'Answered'
}

/** The step the running turn is on right now, else a generic stand-in. */
function runningStatus(thread: AssistantThread): string {
  const steps = thread.turns[thread.turns.length - 1]?.steps ?? []
  const live = [...steps].reverse().find((s) => s.endedAt === null)
  if (live) return live.label
  return thread.subject.kind === 'campaign' ? 'Working on the campaign' : 'Working on the post'
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
    // Same colour as any other status — the pulsing mark on the icon says it
    // is live, so the text doesn't have to shout it too. The sweep runs in the
    // text's own colour, a shade of grey travelling through the black.
    return (
      <span
        className="block w-full truncate text-sm text-foreground animate-text-shimmer"
        style={
          {
            '--shimmer-color': 'var(--foreground)',
            '--shimmer-highlight': 'var(--quaternary-foreground)',
          } as CSSProperties
        }
      >
        {runningStatus(thread)} · {formatDuration(elapsed)}
      </span>
    )
  }
  if (thread.status === 'error') {
    return <span className="block w-full truncate text-sm text-destructive">Failed</span>
  }
  return (
    <span className="block w-full truncate text-sm text-foreground">{idleStatus(thread)}</span>
  )
}
