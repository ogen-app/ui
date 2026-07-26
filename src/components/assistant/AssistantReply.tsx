import { Fragment } from 'react'
import { WarningIcon } from '@phosphor-icons/react'
import { parseAssistantMarkup, type InlineSpan } from '@/lib/assistantMarkup'
import { ThinkingTimeline } from './ThinkingTimeline'
import { cn } from '@/lib'
import type { AssistantTurn } from '@/types/assistant'

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

      {/* What the turn did to the post, once it's settled. */}
      {!turn.streaming && !turn.failed && turn.action && (
        <p className="text-xs text-tertiary-foreground">
          {turn.action === 'edited' ? 'Post updated' : 'No changes made'}
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
