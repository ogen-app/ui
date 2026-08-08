import { Fragment } from 'react'
import { ArrowRightIcon, CopyIcon, WarningIcon } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import { parseAssistantMarkup, type InlineSpan } from '@/lib/assistantMarkup'
import { ThinkingTimeline } from './ThinkingTimeline'
import { hasResultCard, ResultCard } from './ResultCard'
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
  const showCard = settled && hasResultCard(turn.details)
  const footer = !showCard && turn.action ? actionLabel(turn.action) : null

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
        <p className="flex items-start gap-2 text-sm/[1.6] text-destructive">
          <WarningIcon className="mt-1 size-4 shrink-0" />
          <span>{turn.content}</span>
        </p>
      ) : (
        <div className="flex flex-col gap-4 text-sm/[1.6] text-foreground">
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
      {showCard && turn.details && <ResultCard details={turn.details} />}

      {/* A clone the turn created — an opt-in jump to the new post's editor
          (CON-59). The source thread stays put; the user chooses to switch. */}
      {settled && turn.clone && <CloneCard clone={turn.clone} />}

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
 * The one-line footer under a reply. It only appears when no result card
 * did — the card always says it better — which in practice means turns
 * restored from history, whose result payload the server doesn't persist.
 */
const ACTION_LABELS: Record<AssistantAction, string | null> = {
  edited: 'Post updated',
  declined: 'No changes made',
  answered: null,
  content_plan_generated: 'Content plan generated',
  posts_generated: 'Posts added',
  brief_enriched: 'Brief updated',
  dates_updated: 'Campaign dates updated',
  posts_redistributed: 'Posts redistributed',
  brief_reviewed: 'Brief reviewed',
  posts_reviewed: 'Posts reviewed',
}

function actionLabel(action: AssistantAction): string | null {
  return ACTION_LABELS[action] ?? null
}

/**
 * A jump to a clone the turn just created. Non-hijacking by design: the source
 * thread stays active, and following the link lands on the clone's editor —
 * which, on arrival, binds the assistant to the clone's own thread. The rail is
 * left open, same as the thread list's "open the post" affordance: you asked to
 * see the clone, not to dismiss the assistant that made it.
 */
function CloneCard({ clone }: { clone: NonNullable<AssistantTurn['clone']> }) {
  return (
    <Link
      to="/campaigns/$campaignId/posts/$postId"
      params={{ campaignId: clone.campaignId, postId: clone.postId }}
      className="group flex items-center gap-2 border border-border px-3 py-2.5 hover:bg-secondary"
    >
      <CopyIcon aria-hidden weight="regular" className="size-4 shrink-0 text-tertiary-foreground" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
        Open the clone
      </span>
      <ArrowRightIcon
        aria-hidden
        className="size-4 shrink-0 text-tertiary-foreground transition-transform group-hover:translate-x-0.5"
      />
    </Link>
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
