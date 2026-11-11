import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Button } from '@/components/ui/button'
import { counted } from '@/lib/intl'
import { useAssistantStore } from '@/stores/assistantStore'
import type {
  AssistantProposal,
  OfferNotMade,
  OfferOutcome as Outcome,
  UndoState,
} from '@/types/assistant'
import { ResultBlock, ResultRow } from './blocks'
import { UndoAction, UndoNote, type ResultUndo } from './ResultCard'

/** Rows the not-done list shows before it sums up the rest. */
const LIST_ROWS = 8

/**
 * How an offer answered from its card went (CON-467), under the packs' own
 * cards for what it made: what the run left undone, each with the server's
 * reason in amber, and RETRY — which confirms the fresh offer of just the
 * items worth trying again, so the original offer can never run twice. A
 * tagging run from an offer gets its card here, with UNDO, because the
 * assets pack doesn't record one among its results; so do the drafts the
 * budget guard's "replace" deleted, which have no undo (CON-468).
 */
export function OfferOutcome({
  threadId,
  turnId,
  outcome,
  retry,
  undoStates,
  disabled,
}: {
  threadId: string
  turnId: string
  outcome: Outcome
  /** The retry offer, while it is in this turn's proposals. */
  retry?: AssistantProposal
  undoStates: Record<string, UndoState>
  disabled: boolean
}) {
  const { t } = useTranslation()
  const confirm = useAssistantStore((s) => s.confirmProposal)
  const undo = useAssistantStore((s) => s.undo)
  const u: ResultUndo = {
    states: undoStates,
    onUndo: (undoId) => void undo(threadId, turnId, undoId),
  }
  const { notMade, tagged, replaced } = outcome
  return (
    <>
      {replaced && replaced.deleted + replaced.kept > 0 && (
        <ResultBlock
          status={
            replaced.deleted > 0
              ? t('assistant.answered.replaced.word')
              : t('assistant.answered.replaced.noneWord')
          }
          title={
            replaced.deleted > 0
              ? t(
                  'assistant.answered.replaced.title',
                  counted(replaced.deleted),
                )
              : t('assistant.answered.replaced.none')
          }
        >
          {replaced.kept > 0 && (
            <ResultRow>
              <p className="text-[12.5px] text-secondary-foreground">
                {t('assistant.answered.replaced.kept', counted(replaced.kept))}
              </p>
            </ResultRow>
          )}
        </ResultBlock>
      )}
      {tagged && (
        <ResultBlock
          status={t('assistant.answered.tagged.word')}
          title={t('assistant.answered.tagged.title', counted(tagged.count))}
          action={<UndoAction t={t} undoId={tagged.undoId} undo={u} />}
        >
          <UndoNote t={t} undoId={tagged.undoId} undo={u} />
        </ResultBlock>
      )}
      {notMade.length > 0 && (
        <ResultBlock
          status={t('assistant.answered.notMade.word')}
          tone="warning"
          title={t('assistant.answered.notMade.title', counted(notMade.length))}
        >
          <NotMadeRows t={t} items={notMade} />
          {retry?.status === 'pending' && (
            <div className="pt-3">
              <Button
                variant="defaultInverted"
                size="sm"
                disabled={disabled}
                onClick={() => void confirm(threadId, retry.id)}
              >
                {t('assistant.answered.notMade.retry')}
              </Button>
            </div>
          )}
        </ResultBlock>
      )}
    </>
  )
}

/**
 * One row per named item, its reason underneath; items the server names no
 * title for are counted together under their shared reason.
 */
function NotMadeRows({ t, items }: { t: TFunction; items: OfferNotMade[] }) {
  const unnamed = new Map<string, number>()
  const rows: { key: string; title: string; reason: string; n: number }[] = []
  for (const item of items) {
    if (item.title) {
      rows.push({
        key: item.id || item.title,
        title: item.title,
        reason: item.reason,
        n: 1,
      })
    } else {
      unnamed.set(item.reason, (unnamed.get(item.reason) ?? 0) + 1)
    }
  }
  for (const [reason, n] of unnamed) {
    rows.push({
      key: `unnamed:${reason}`,
      title: t('assistant.answered.notMade.unnamed', counted(n)),
      reason,
      n,
    })
  }
  const rest = rows.slice(LIST_ROWS).reduce((sum, row) => sum + row.n, 0)
  return (
    <>
      {rows.slice(0, LIST_ROWS).map((row) => (
        <ResultRow key={row.key}>
          <p className="text-sm text-foreground">{row.title}</p>
          {row.reason && (
            <p className="text-[12.5px] text-warning">{row.reason}</p>
          )}
        </ResultRow>
      ))}
      {rest > 0 && (
        <p className="pt-1.5 text-[12.5px] text-tertiary-foreground">
          {t('assistant.answered.notMade.more', counted(rest))}
        </p>
      )}
    </>
  )
}
