import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Link } from '@tanstack/react-router'
import {
  SignInIcon,
  BriefcaseIcon,
  FileTextIcon,
  SquaresFourIcon,
} from '@phosphor-icons/react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { useAssistantStore } from '@/stores/assistantStore'
import { useAssistantThreads } from '@/hooks/useAssistantThreads'
import { useTick } from '@/hooks/useTick'
import { cn } from '@/lib/styles'
import { formatDuration, stepLabel, threadName } from '@/lib/assistantTools'
import {
  lastActivityText,
  mergeThreadRows,
  showsSummary,
  type ThreadRow,
} from '@/lib/assistantThreads'
import type {
  AssistantAction,
  AssistantThread,
  ThreadSubject,
} from '@/types/assistant'

/**
 * Every thread the workspace has talked in, so a run started on one campaign
 * stays visible — and resumable — from anywhere in the app, and after a
 * reload (CON-459). The list is the server's (`useAssistantThreads`); what this
 * tab has open is merged over it, because that copy is the live one. Threads
 * are only *started* from their subject's page; this is how the user gets back
 * to them.
 *
 * There is no closing a row: the history is the workspace's and survives, so
 * a row hidden here would only come back on the next read.
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
  const adopt = useAssistantStore((s) => s.adoptThread)
  const listed = useAssistantThreads()
  const { t, i18n } = useTranslation()
  const rows = mergeThreadRows(threads, listed.summaries, currentThreadId)
  const anyRunning = rows.some((row) => row.live?.status === 'running')
  useTick(anyRunning, 1000)

  const open = (row: ThreadRow) => {
    if (row.live) select(row.id)
    else adopt(row.subject, row.title, row.campaignTitle)
  }

  if (rows.length === 0) {
    // Nothing to say yet while the list is on its way: "no conversations"
    // would be a claim about a workspace that may well have some.
    if (listed.isPending) return null
    return (
      // Same shape as an empty thread: mark, then what to do about it.
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <Logo variant="mark" className="size-8 text-quinary-foreground" />
        <div className="flex max-w-72 flex-col gap-1 text-sm text-tertiary-foreground">
          <p>{t('assistant.list.empty1')}</p>
          <p>{t('assistant.list.empty2')}</p>
          <p>{t('assistant.list.empty3')}</p>
        </div>
        {listed.isError && (
          <ListError t={t} onRetry={() => void listed.refetch()} />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <ul className="flex flex-col">
        {rows.map((row) => {
          const Icon = ICONS[row.subject.kind]
          const link = openLink(row.subject)
          return (
            <li
              key={row.id}
              className="group relative border-b border-border last:border-b-0"
            >
              <button
                type="button"
                onClick={() => open(row)}
                // Full width: the row actions float over its right end instead of
                // reserving a column, so the text gets the whole rail.
                className="flex w-full min-w-0 items-center gap-3 py-3 text-left cursor-pointer"
              >
                {/* The mark rides the icon box's corner rather than the title
                  line, so it can't push the name around. It means one thing
                  here and everywhere else in the app — this thread is waiting
                  on you — which is why a running thread does not get one: the
                  status line below shimmers and counts up, and the trigger's
                  mark animates, so work in progress is already spoken for. A
                  dot that meant either would make the one in the corner of the
                  screen unreadable.

                  The square is the panel's own mark from the header, one step
                  down: same 40px box, same border, same 20px glyph. The
                  header's is unfilled and its glyph is a shade darker, because
                  it is the place these rows live in; a row is one of them, and
                  the name is what should be read first. */}
                <span
                  className={cn(
                    'relative flex size-10 shrink-0 items-center justify-center',
                    'border border-border bg-secondary transition-colors',
                    // The row's answer to the pointer, and the only one it has:
                    // with the hover fill gone, the square is what says which row
                    // is under the cursor. Same gesture as the header's mark —
                    // border and glyph to full contrast — so the two squares
                    // behave alike as well as match.
                    'group-hover:border-foreground',
                  )}
                  aria-hidden
                >
                  <Icon className="size-5 text-quaternary-foreground transition-colors group-hover:text-foreground" />
                  {row.live?.unread && (
                    <span className="absolute -top-1 -right-1 size-2 rounded-full bg-accent" />
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 truncate text-xs text-secondary-foreground">
                      {threadName(row)}
                    </span>
                    {row.summary?.archived && (
                      <span className="shrink-0 bg-tertiary px-[3px] py-[2px] text-[10px] font-semibold tracking-[0.08em] text-tertiary-foreground">
                        {t('assistant.list.archived')}
                      </span>
                    )}
                    {row.id === currentThreadId && (
                      <span className="shrink-0 bg-accent/10 px-[3px] py-[2px] text-[10px] font-semibold tracking-[0.08em] text-accent">
                        {t('assistant.list.current')}
                      </span>
                    )}
                  </span>
                  {showsSummary(row) ? (
                    <SummaryLine row={row} t={t} locale={i18n.language} />
                  ) : (
                    row.live && <ThreadStatusLine thread={row.live} t={t} />
                  )}
                </span>
              </button>

              {/* Floated over the row's right end on hover. The gradient lets a
                long line run under the icons and fade out rather than being
                truncated short for a column that is usually empty. */}
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100">
                {/* Fades into the panel's own background: the row no longer
                  fills on hover, so this is the colour behind the text it
                  covers. Matching the old hover grey would band the row. */}
                <span
                  className="h-full w-10 bg-gradient-to-r from-transparent to-primary"
                  aria-hidden
                />
                <span className="flex h-full items-center gap-1 bg-primary">
                  {/* Goes to the subject and leaves the rail exactly as it is.
                    Jumping to a post is not a request to put the assistant
                    away — you usually want it there when you arrive. */}
                  {link && (
                    <Link
                      {...link}
                      aria-label={
                        row.subject.kind === 'campaign'
                          ? t('assistant.list.openCampaign')
                          : t('assistant.list.openPost')
                      }
                      className="flex size-6 shrink-0 items-center justify-center text-secondary-foreground hover:text-foreground"
                    >
                      {/* Enter, not open-out: the arrow-out-of-a-square is the
                      convention for leaving the app in a new tab, and this
                      goes to a page in this window. The in-facing variant of
                      that icon is no better — at 20px the two are the same
                      drawing with the arrow moved. This one is an arrow going
                      through a doorway, which nothing else in the app means.

                      Regular weight and 20px, which is the panel's close X —
                      these sit a few pixels from it on the same white and any
                      other stroke reads as a different set of controls. */}
                      <SignInIcon className="size-5" />
                    </Link>
                  )}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
      {listed.hasNextPage && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 self-center"
          disabled={listed.isFetchingNextPage}
          onClick={() => void listed.fetchNextPage()}
        >
          {listed.isFetchingNextPage
            ? t('common.loading')
            : t('assistant.list.older')}
        </Button>
      )}
      {listed.isError && (
        <ListError t={t} onRetry={() => void listed.refetch()} />
      )}
    </div>
  )
}

/** A thread not opened yet: when it last moved, and what was said. */
function SummaryLine({
  row,
  t,
  locale,
}: {
  row: ThreadRow & { summary: NonNullable<ThreadRow['summary']> }
  t: TFunction
  locale: string
}) {
  const when = lastActivityText(
    t,
    row.summary.lastMessageAt,
    new Date(),
    locale,
  )
  const { preview } = row.summary
  const text =
    when && preview
      ? t('assistant.list.lastMessage', { when, preview })
      : (when ?? preview)
  return (
    <span className="block w-full truncate text-sm text-foreground">
      {text}
    </span>
  )
}

/** The list could not be read: what is shown is only what this tab has open. */
function ListError({ t, onRetry }: { t: TFunction; onRetry: () => void }) {
  return (
    <p className="flex items-center justify-center gap-2 py-3 text-sm text-tertiary-foreground">
      {t('assistant.list.loadFailed')}
      <button
        type="button"
        onClick={onRetry}
        className="cursor-pointer text-foreground underline-offset-2 hover:underline"
      >
        {t('common.tryAgain')}
      </button>
    </p>
  )
}

/**
 * What the assistant did, or is doing — one phrase, in the same vocabulary the
 * thinking timeline uses. A running turn reports the step it is actually on;
 * a finished one reports the action it landed, which is what the user came
 * back to find out.
 */
function idleStatus(t: TFunction, thread: AssistantThread): string {
  const last = [...thread.turns]
    .reverse()
    .find((turn) => turn.role === 'assistant')
  if (!last)
    return thread.turns.length > 0
      ? t('assistant.status.waiting')
      : t('assistant.status.notStarted')
  if (last.cancelled) return t('assistant.status.stopped')
  if (last.failed) return t('assistant.status.failed')
  return last.action
    ? actionStatus(t, last.action)
    : t('assistant.status.answeredGeneric')
}

function actionStatus(t: TFunction, action: AssistantAction): string {
  return t(`assistant.status.${action}`)
}

/** The step the running turn is on right now, else a generic stand-in. */
function runningStatus(t: TFunction, thread: AssistantThread): string {
  const steps = thread.turns[thread.turns.length - 1]?.steps ?? []
  const live = [...steps].reverse().find((s) => s.endedAt === null)
  if (live) return stepLabel(t, live)
  switch (thread.subject.kind) {
    case 'campaign':
      return t('assistant.status.workingCampaign')
    case 'post':
      return t('assistant.status.workingPost')
    case 'workspace':
      return t('assistant.status.workingWorkspace')
  }
}

const ICONS = {
  campaign: BriefcaseIcon,
  post: FileTextIcon,
  workspace: SquaresFourIcon,
} as const

/**
 * Where the jump-to arrow goes, per subject kind. The workspace thread has no
 * page of its own — every workspace screen talks to it — so it gets none.
 */
function openLink(subject: ThreadSubject) {
  switch (subject.kind) {
    case 'campaign':
      return {
        to: '/campaigns/$campaignId',
        params: { campaignId: subject.campaignId },
      } as const
    case 'post':
      return {
        to: '/campaigns/$campaignId/posts/$postId',
        params: { campaignId: subject.campaignId, postId: subject.postId },
      } as const
    case 'workspace':
      return null
  }
}

function ThreadStatusLine({
  thread,
  t,
}: {
  thread: AssistantThread
  t: TFunction
}) {
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
        {t('assistant.status.running', {
          step: runningStatus(t, thread),
          elapsed: formatDuration(elapsed),
        })}
      </span>
    )
  }
  if (thread.status === 'error') {
    return (
      <span className="block w-full truncate text-sm text-destructive">
        {t('assistant.status.failed')}
      </span>
    )
  }
  return (
    <span className="block w-full truncate text-sm text-foreground">
      {idleStatus(t, thread)}
    </span>
  )
}
