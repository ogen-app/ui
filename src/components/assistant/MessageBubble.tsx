import { memo, type ReactNode } from 'react'
import { CheckCircleIcon } from '@phosphor-icons/react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Spinner } from '@/components/ui/spinner'
import { ToolActivity } from '@/components/assistant/ToolActivity'
import { postKey } from '@/hooks/usePost'
import { getPost } from '@/services/api/posts'
import { SHORT_DATE_TIME_FORMAT } from '@/lib/dateTime'
import { getPlatformInfo } from '@/lib/platformDictionary'
import type { AssistantCloneResult, ChatMessage } from '@/types/assistant'

/**
 * A single chat turn: a user instruction or a (possibly streaming) model reply.
 * Memoized because each streamed token replaces the thread's `messages` array —
 * `patchMessage` keeps untouched siblings referentially stable, so only the
 * streaming bubble re-renders.
 */
export const MessageBubble = memo(function MessageBubble({
  message,
}: {
  message: ChatMessage
}) {
  if (message.role === 'user') {
    return (
      <div className="self-end max-w-[85%] bg-secondary px-3 py-2">
        <p className="text-sm text-foreground whitespace-pre-wrap break-words">
          {message.text}
        </p>
      </div>
    )
  }

  const thinking =
    message.pending && message.explanation.length === 0 && message.tools.length === 0

  return (
    <div className="self-start w-full flex flex-col gap-2">
      {message.tools.length > 0 && <ToolActivity tools={message.tools} />}

      {thinking ? (
        <div className="flex items-center gap-2 text-sm text-tertiary-foreground">
          <Spinner className="w-4" />
          <span>Thinking…</span>
        </div>
      ) : (
        message.explanation.length > 0 && (
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">
            {message.explanation}
            {message.pending && (
              <span className="ml-0.5 inline-block w-1.5 h-4 align-text-bottom bg-foreground animate-pulse" />
            )}
          </p>
        )
      )}

      {!message.pending && <ActionFooter message={message} />}

      {message.error && <p className="text-xs text-destructive">{message.error}</p>}
    </div>
  )
})

/**
 * Outcome line under a completed turn. Messages reloaded from history carry
 * only the action (result payloads are not persisted), so every branch must
 * render something sensible without its `*Result`.
 */
function ActionFooter({ message }: { message: ChatMessage & { role: 'model' } }) {
  switch (message.action) {
    case 'edited':
      return <FooterLine>Post updated</FooterLine>
    case 'restored': {
      const r = message.restoreResult
      if (r?.noOp) return <FooterLine>Content already matched that version</FooterLine>
      return (
        <FooterLine>
          {r
            ? `Restored from v${r.restoredFromVersion} as v${r.newVersionNumber}`
            : 'Version restored'}
        </FooterLine>
      )
    }
    case 'scheduled': {
      const r = message.scheduleResult
      const at = r ? new Date(r.scheduledAt) : null
      return (
        <FooterLine>
          {at && !Number.isNaN(at.getTime())
            ? `Scheduled for ${SHORT_DATE_TIME_FORMAT.format(at)}${r?.autoPublish ? '' : ' (manual publish)'}`
            : 'Post scheduled'}
        </FooterLine>
      )
    }
    case 'cloned':
      return <CloneFooter result={message.cloneResult} />
    default:
      return null
  }
}

function FooterLine({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-secondary-foreground">
      <CheckCircleIcon className="size-3.5" weight="fill" />
      <span>{children}</span>
    </div>
  )
}

function CloneFooter({ result }: { result?: AssistantCloneResult }) {
  const platformName = result?.platformId
    ? getPlatformInfo(result.platformId)?.name
    : undefined

  // The clone's campaign id is needed for the link route; fetch the clone
  // (cached under the regular post key, so opening it is already warm).
  const { data: clone } = useQuery({
    queryKey: postKey(result?.newPostId ?? ''),
    queryFn: () => getPost(result!.newPostId),
    enabled: Boolean(result?.newPostId),
    staleTime: 60_000,
  })

  return (
    <FooterLine>
      Clone created{platformName ? ` for ${platformName}` : ''}
      {clone && (
        <>
          {' · '}
          <Link
            to="/campaigns/$campaignId/posts/$postId"
            params={{ campaignId: clone.campaign_id, postId: clone.id }}
            className="text-foreground underline underline-offset-2 hover:no-underline"
          >
            Open
          </Link>
        </>
      )}
    </FooterLine>
  )
}
