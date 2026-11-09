import { Fragment } from 'react'
import { ArrowRightIcon, WarningIcon } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { parseAssistantMarkup, type InlineSpan } from '@/lib/assistantMarkup'
import { ThinkingTimeline } from './ThinkingTimeline'
import { hasResultCard, ResultCard } from './ResultCard'
import { ProposalCard } from './ProposalCard'
import { UiActionRows } from './UiActionRows'
import { FindingsBlock } from './FindingsBlock'
import { useAssistantStore } from '@/stores/assistantStore'
import { cn } from '@/lib'
import type { AssistantAction, AssistantTurn } from '@/types/assistant'

function Inline({ spans }: { spans: InlineSpan[] }) {
  return (
    <>
      {spans.map((span, i) => (
        <Fragment key={i}>
          {span.bold ? (
            <strong className="font-semibold">{span.text}</strong>
          ) : (
            span.text
          )}
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
export function AssistantReply({
  turn,
  threadId,
  running = false,
}: {
  turn: AssistantTurn
  threadId: string
  /** A turn is in flight in this thread: offers can't be answered meanwhile. */
  running?: boolean
}) {
  const { t } = useTranslation()
  const undo = useAssistantStore((s) => s.undo)
  const blocks = parseAssistantMarkup(turn.content)
  const steps = turn.steps ?? []
  const settled = !turn.streaming && !turn.failed
  const showCard = settled && hasResultCard(turn.details)
  const footer = !showCard && turn.action ? actionLabel(t, turn.action) : null

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
      {showCard && turn.details && (
        <ResultCard
          details={turn.details}
          undo={{
            states: turn.undo ?? {},
            onUndo: (undoId) => void undo(threadId, turn.id, undoId),
          }}
        />
      )}

      {/* A calendar check's findings, each with its fixes. */}
      {settled && turn.findings && (
        <FindingsBlock
          threadId={threadId}
          findings={turn.findings}
          disabled={running}
        />
      )}

      {/* What the turn did to the screen behind the rail. */}
      {settled && turn.uiActions && turn.uiActions.length > 0 && (
        <UiActionRows
          threadId={threadId}
          turnId={turn.id}
          actions={turn.uiActions}
        />
      )}

      {/* Offers this turn made, waiting for a yes — or answered since. */}
      {settled &&
        turn.proposals?.map((proposal) => (
          <ProposalCard
            key={proposal.id}
            threadId={threadId}
            proposal={proposal}
            disabled={running}
          />
        ))}

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
              <span className="text-foreground">
                {t('assistant.footer.versionSaved')}
              </span>
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
function actionLabel(t: TFunction, action: AssistantAction): string | null {
  // A plain answer needs no footer: the prose is the whole of what happened.
  // `noted` gets its own line rather than "post updated" — the body was
  // deliberately left alone (CON-188), so the note is all that changed.
  if (action === 'answered') return null
  return t(`assistant.footer.${action}`)
}

/**
 * A jump to a clone the turn just created. Non-hijacking by design: the source
 * thread stays active, and following the link lands on the clone's editor —
 * which, on arrival, binds the assistant to the clone's own thread. The rail is
 * left open, same as the thread list's "open the post" affordance: you asked to
 * see the clone, not to dismiss the assistant that made it.
 */
function CloneCard({ clone }: { clone: NonNullable<AssistantTurn['clone']> }) {
  const { t } = useTranslation()
  return (
    <Link
      to="/campaigns/$campaignId/posts/$postId"
      params={{ campaignId: clone.campaignId, postId: clone.postId }}
      className="group flex items-center gap-2 border-y border-border py-2.5"
    >
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
        {t('assistant.reply.openClone')}
      </span>
      <ArrowRightIcon
        aria-hidden
        className="size-4 shrink-0 text-tertiary-foreground transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  )
}

function ListBlock({
  ordered,
  items,
}: {
  ordered: boolean
  items: InlineSpan[][]
}) {
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
