import { Fragment } from 'react'
import { WarningIcon } from '@phosphor-icons/react'
import { parseAssistantMarkup, type InlineSpan } from '@/lib/assistantMarkup'
import { ThinkingTimeline } from './ThinkingTimeline'
import { ResultCard } from './ResultCard'
import { cn } from '@/lib'
import type { AssistantAction, AssistantTurn } from '@/types/assistant'

function Inline({ spans }: { spans: InlineSpan[] }) {
  return (
    <>
      {spans.map((span, i) => (
        <Fragment key={i}>
          {span.bold ? <strong className="font-semibold">{span.text}</strong> : span.text}
        </Fragment>
      ))}
    </>
  )
}

/**
 * An assistant turn. Replies are plain reading text — no bubble, no avatar —
 * so the panel reads as a document the assistant is writing into, and the
 * user's own bubbles are the only punctuation in the column.
 */
export function AssistantReply({ turn }: { turn: AssistantTurn }) {
  const blocks = parseAssistantMarkup(turn.content)
  const steps = turn.steps ?? []
  const settled = !turn.streaming && !turn.failed
  const footer = turn.action ? actionLabel(turn.action) : null

  return (
    <div className="flex flex-col gap-3">
      {steps.length > 0 && (
        <ThinkingTimeline
          steps={steps}
          streaming={turn.streaming === true}
          startedAt={turn.startedAt ?? 0}
          endedAt={turn.endedAt ?? null}
        />
      )}

      {turn.failed ? (
        <p className="flex items-start gap-2 text-[15px]/[1.6] text-destructive">
          <WarningIcon className="mt-1 size-4 shrink-0" />
          <span>{turn.content}</span>
        </p>
      ) : (
        <div className="flex flex-col gap-4 text-[15px]/[1.6] text-foreground">
          {blocks.map((block, i) =>
            block.kind === 'paragraph' ? (
              <p key={i}>
                <Inline spans={block.spans} />
              </p>
            ) : (
              <ListBlock key={i} ordered={block.ordered} items={block.items} />
            ),
          )}
        </div>
      )}

      {/* The structured result behind the action — campaign turns only. */}
      {settled && turn.details && <ResultCard details={turn.details} />}

      {/* What the turn did to its subject, once it's settled. */}
      {settled && (footer || turn.saveVersion) && (
        <p className="text-xs text-tertiary-foreground">
          {footer}
          {turn.saveVersion && (
            <>
              {' · '}
              <span className="text-foreground">Version saved</span>
              {turn.versionNote && `: ${turn.versionNote}`}
            </>
          )}
        </p>
      )}
    </div>
  )
}

/**
 * The one-line footer under a reply. Actions whose detail is already spelled
 * out by a result card get no line at all — the card says it better.
 */
function actionLabel(action: AssistantAction): string | null {
  switch (action) {
    case 'edited':
      return 'Post updated'
    case 'declined':
      return 'No changes made'
    case 'answered':
      return null
    default:
      // Every remaining action is a campaign mutation, and each one renders a
      // result card above.
      return null
  }
}

function ListBlock({ ordered, items }: { ordered: boolean; items: InlineSpan[][] }) {
  const List = ordered ? 'ol' : 'ul'
  return (
    <List
      className={cn(
        'flex flex-col gap-2 pl-6',
        ordered ? 'list-decimal' : 'list-disc',
        'marker:text-tertiary-foreground',
      )}
    >
      {items.map((spans, i) => (
        <li key={i} className="pl-1">
          <Inline spans={spans} />
        </li>
      ))}
    </List>
  )
}
