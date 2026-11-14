import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Button } from '@/components/ui/button'
import { usePlatformCatalog } from '@/hooks/usePlatforms'
import { counted, formatDate, formatList, formatNumber } from '@/lib/intl'
import { useAssistantStore } from '@/stores/assistantStore'
import type {
  AssistantProposal,
  OfferNotMade,
  OfferOutcome as Outcome,
  UndoState,
} from '@/types/assistant'
import {
  ResolvedLine,
  ResultBlock,
  ResultRow,
  SourcesLine,
  TEXT_ACTION_CLASS,
  TextAction,
} from './blocks'
import { UndoAction, UndoNote, type ResultUndo } from './ResultCard'
import { useLapsed } from './useLapsed'

/** Rows the not-done list shows before it sums up the rest. */
const LIST_ROWS = 8

/**
 * How an offer answered from its card went (CON-467, drawn as CON-482 has
 * it), under the packs' own cards for what it made. A run that did part of
 * the job is PARTLY DONE — "9 of 12 made" — with what it didn't make, each
 * with its platform and the server's reason in amber, and RETRY N, which
 * confirms the fresh offer of just those, so the original can never run
 * twice; once that offer has lapsed it is ASK AGAIN. A retry that made the
 * rest says DONE over both runs. A tagging run from an offer gets its card
 * here, with UNDO, because the assets pack doesn't record one among its
 * results; so do the drafts the budget guard's "replace" deleted, which have
 * no undo (CON-468).
 */
export function OfferOutcome({
  threadId,
  turnId,
  outcome,
  retry,
  retriedTotal,
  undoStates,
  undoRefused,
  draftWarnings,
  disabled,
}: {
  threadId: string
  turnId: string
  outcome: Outcome
  /** The retry offer, while it is in this turn's proposals. */
  retry?: AssistantProposal
  /**
   * The first run's total, when this turn was a retry of it (CON-482): what
   * DONE sums the two runs to.
   */
  retriedTotal?: number
  undoStates: Record<string, UndoState>
  undoRefused?: Record<string, { changed: number; of: number }>
  /**
   * What the drafting under a replace warned about (CON-483): its own drafts
   * card is left out for the REPLACED one, which says them instead.
   */
  draftWarnings?: string[]
  disabled: boolean
}) {
  const { t } = useTranslation()
  const confirm = useAssistantStore((s) => s.confirmProposal)
  const send = useAssistantStore((s) => s.send)
  const undo = useAssistantStore((s) => s.undo)
  const u: ResultUndo = {
    states: undoStates,
    onUndo: (undoId) => void undo(threadId, turnId, undoId),
  }
  const { notMade, tagged, replaced, later, made, total } = outcome
  const partly = notMade.length > 0
  const lapsed = useLapsed(
    retry?.status === 'pending' ? retry.expiresAt : undefined,
  )
  const retryLapsed =
    retry !== undefined && (retry.status === 'expired' || lapsed)
  return (
    <>
      {replaced && (
        <ReplacedCard
          t={t}
          replaced={replaced}
          warnings={draftWarnings ?? []}
        />
      )}
      {later && (
        <ResultBlock
          status={t('assistant.answered.later.word')}
          title={t('assistant.answered.later.title', { what: later.removed })}
          meta={
            later.until
              ? t('assistant.answered.later.until', {
                  date: formatDate(later.until, {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  }),
                })
              : undefined
          }
        />
      )}
      {tagged && (
        <TaggedCard
          t={t}
          tagged={tagged}
          undo={u}
          refused={tagged.undoId ? undoRefused?.[tagged.undoId] : undefined}
        />
      )}
      {!partly && retriedTotal !== undefined && total !== undefined && (
        <>
          <ResolvedLine>
            {t('assistant.answered.retried', counted(total))}
          </ResolvedLine>
          <ResultBlock
            status={t('assistant.answered.done.word')}
            title={t('assistant.answered.done.title', {
              total: formatNumber(retriedTotal),
            })}
            meta={t('assistant.answered.done.onRetry', counted(total))}
          />
        </>
      )}
      {partly && (
        <ResultBlock
          status={t('assistant.answered.partly.word')}
          tone="warning"
          title={
            total
              ? t('assistant.answered.partly.title', {
                  made: formatNumber(made ?? 0),
                  total: formatNumber(total),
                })
              : t('assistant.answered.notMade.title', counted(notMade.length))
          }
        >
          <p className="pt-2.5 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-warning-ink">
            {t('assistant.answered.notMade.group', counted(notMade.length))}
          </p>
          <NotMadeRows t={t} items={notMade} />
          {retry && retryLapsed ? (
            <ResultRow className="flex items-baseline gap-3">
              <span className="min-w-0 flex-1 text-[12.5px] text-secondary-foreground">
                {t('assistant.answered.notMade.lapsed')}
              </span>
              <TextAction
                disabled={disabled}
                onClick={() => void send(threadId, retry.summary)}
              >
                {t('assistant.proposal.expiredCard.askAgain')}
              </TextAction>
            </ResultRow>
          ) : (
            retry?.status === 'pending' && (
              <div className="pt-3">
                <Button
                  variant="defaultInverted"
                  size="sm"
                  disabled={disabled}
                  onClick={() => void confirm(threadId, retry.id)}
                >
                  {t('assistant.answered.notMade.retryCount', {
                    count: notMade.length,
                    formatted: formatNumber(notMade.length),
                  })}
                </Button>
              </div>
            )
          )}
        </ResultBlock>
      )}
    </>
  )
}

/** Tags by name, quoted: “spa”, “summer”. */
function quoted(t: TFunction, tags: string[]): string {
  return formatList(
    tags.map((tag) => t('assistant.answered.tagged.quote', { tag })),
  )
}

/** Rows each side of a swap lists before it sums up the rest. */
const SWAP_ROWS = 2

/**
 * The budget guard's "replace the weakest drafts" (CON-468, drawn as CON-483
 * has it): one card for the swap — what it drafted and what it deleted for
 * good, each side by name with "and N more", and where the goal period
 * stands after it. No UNDO: the deleted drafts are gone, files included.
 * A swap that deleted nothing says so — with what it drafted all the same,
 * and what it kept and why.
 */
function ReplacedCard({
  t,
  replaced,
  warnings,
}: {
  t: TFunction
  replaced: NonNullable<Outcome['replaced']>
  warnings: string[]
}) {
  const { deleted, kept, draftedCount, drafted, removed, period } = replaced
  const drafts = (
    <>
      <SwapList
        t={t}
        label={t(
          'assistant.answered.replaced.draftedGroup',
          counted(draftedCount),
        )}
        posts={drafted}
        total={draftedCount}
      />
      {warnings.map((warning, i) => (
        <ResultRow key={i}>
          <p className="text-sm text-warning">{warning}</p>
        </ResultRow>
      ))}
    </>
  )
  if (deleted === 0) {
    if (kept === 0 && draftedCount === 0) return null
    return (
      <ResultBlock
        status={t('assistant.answered.replaced.noneWord')}
        title={
          draftedCount > 0
            ? t(
                'assistant.answered.replaced.draftedOnly',
                counted(draftedCount),
              )
            : t('assistant.answered.replaced.none')
        }
      >
        {drafts}
        {kept > 0 && <KeptRow t={t} kept={kept} />}
        {replaced.draftedGrounding && (
          <SourcesLine grounding={replaced.draftedGrounding} />
        )}
      </ResultBlock>
    )
  }
  return (
    <ResultBlock
      status={t('assistant.answered.replaced.replacedWord')}
      title={t('assistant.answered.replaced.replacedTitle', {
        ...counted(deleted),
        drafted: formatNumber(draftedCount),
      })}
      meta={
        period
          ? t('assistant.answered.replaced.period', {
              period: period.label,
              planned: formatNumber(period.planned),
            })
          : undefined
      }
    >
      {drafts}
      <SwapList
        t={t}
        label={t('assistant.answered.replaced.removedGroup', counted(deleted))}
        posts={removed}
        total={deleted}
      />
      {kept > 0 && <KeptRow t={t} kept={kept} />}
      {replaced.draftedGrounding && (
        <SourcesLine grounding={replaced.draftedGrounding} />
      )}
    </ResultBlock>
  )
}

function KeptRow({ t, kept }: { t: TFunction; kept: number }) {
  return (
    <ResultRow>
      <p className="text-[12.5px] text-secondary-foreground">
        {t('assistant.answered.replaced.kept', counted(kept))}
      </p>
    </ResultRow>
  )
}

/** One side of a swap: a group label, the first posts, "and N more". */
function SwapList({
  t,
  label,
  posts,
  total,
}: {
  t: TFunction
  label: string
  posts: NonNullable<Outcome['replaced']>['removed']
  total: number
}) {
  if (total === 0) return null
  const shown = posts.slice(0, SWAP_ROWS)
  const more = total - shown.length
  return (
    <>
      <p className="pt-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-tertiary-foreground">
        {label}
      </p>
      {shown.map((post) => (
        <ResultRow key={post.id} className="flex flex-col gap-0.5">
          <span className="text-sm text-foreground">{post.title}</span>
          <span className="text-[12.5px] text-tertiary-foreground">
            {[
              post.platform,
              post.fitPct !== undefined &&
                t('assistant.answered.replaced.fit', {
                  score: formatNumber(post.fitPct),
                }),
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </ResultRow>
      ))}
      {more > 0 && (
        <p className="pt-2.5 text-[12.5px] text-tertiary-foreground">
          {t('assistant.answered.notMade.more', counted(more))}
        </p>
      )}
    </>
  )
}

/**
 * A tagging from an offer (CON-482): which tags on how many, each asset with
 * what it gained or already had, and UNDO — which takes back only what the
 * job changed. Refused because tags moved since, it is CAN'T UNDO, saying
 * how many, with the way to do it by hand.
 */
function TaggedCard({
  t,
  tagged,
  undo,
  refused,
}: {
  t: TFunction
  tagged: NonNullable<Outcome['tagged']>
  undo: ResultUndo
  refused?: { changed: number; of: number }
}) {
  const state = tagged.undoId ? undo.states[tagged.undoId] : undefined
  const tags = quoted(t, [...tagged.add, ...tagged.remove])
  const named = tagged.add.length + tagged.remove.length > 0
  // A job that both added and took tags away says both (CON-482).
  const title =
    tagged.add.length > 0 && tagged.remove.length > 0
      ? t('assistant.answered.tagged.titleRetagged', {
          ...counted(tagged.count),
          added: quoted(t, tagged.add),
          removed: quoted(t, tagged.remove),
        })
      : tagged.add.length > 0
        ? t('assistant.answered.tagged.titleNamed', {
            ...counted(tagged.count),
            tags,
          })
        : named
          ? t('assistant.answered.tagged.untagged', {
              ...counted(tagged.count),
              tags,
            })
          : t('assistant.answered.tagged.title', counted(tagged.count))
  return (
    <>
      <ResultBlock
        status={t('assistant.answered.tagged.word')}
        title={title}
        action={
          state === 'changed' ? undefined : (
            <UndoAction t={t} undoId={tagged.undoId} undo={undo} />
          )
        }
      >
        {tagged.assets.map((a) => (
          <ResultRow key={a.id} className="flex flex-col gap-0.5">
            <span className="text-sm text-foreground">{a.title}</span>
            <span className="text-[12.5px] text-tertiary-foreground">
              {a.added.length > 0 && a.removed.length > 0
                ? t('assistant.answered.tagged.addedRemoved', {
                    added: quoted(t, a.added),
                    removed: quoted(t, a.removed),
                  })
                : a.added.length > 0
                  ? t('assistant.answered.tagged.added', {
                      tags: quoted(t, a.added),
                    })
                  : a.removed.length > 0
                    ? t('assistant.answered.tagged.removed', {
                        tags: quoted(t, a.removed),
                      })
                    : t('assistant.answered.tagged.already')}
            </span>
          </ResultRow>
        ))}
        {tagged.more > 0 && (
          <p className="pt-2.5 text-[12.5px] text-tertiary-foreground">
            {t('assistant.answered.notMade.more', counted(tagged.more))}
          </p>
        )}
        {state === 'undone' && (
          <ResultRow>
            <ResolvedLine>
              {named && tagged.changed !== undefined
                ? t('assistant.answered.tagged.putBack', {
                    ...counted(tagged.changed),
                    tags,
                  })
                : t('assistant.undo.undone')}
            </ResolvedLine>
          </ResultRow>
        )}
        {state === 'gone' && (
          <UndoNote t={t} undoId={tagged.undoId} undo={undo} />
        )}
        {named &&
          tagged.changed !== undefined &&
          tagged.changed < tagged.count && (
            <p className="border-t border-border pt-2.5 text-[12.5px] text-secondary-foreground">
              {t('assistant.answered.tagged.note')}
            </p>
          )}
      </ResultBlock>
      {state === 'changed' && (
        <ResultBlock
          status={t('assistant.answered.tagged.cantWord')}
          tone="warning"
          title={t('assistant.answered.tagged.cantTitle')}
        >
          <ResultRow className="flex items-baseline gap-3">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm text-foreground">
                {refused
                  ? t('assistant.answered.tagged.changedSince', {
                      changed: formatNumber(refused.changed),
                      of: formatNumber(refused.of),
                    })
                  : t('assistant.undo.changed')}
              </span>
              <span className="text-[12.5px] text-secondary-foreground">
                {t('assistant.answered.tagged.cantHint')}
              </span>
            </span>
            <Link to="/assets" className={TEXT_ACTION_CLASS}>
              {t('assistant.answered.tagged.open')}
            </Link>
          </ResultRow>
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
  const { resolve } = usePlatformCatalog()
  const rows: { key: string; title: string; reason: string; n: number }[] = []
  for (const item of items) {
    if (item.title) {
      // "LinkedIn · the writer timed out" (CON-482): the platform is its own
      // field now, no longer folded into the title.
      const platform = item.platform
        ? (resolve(item.platform)?.name ?? item.platform)
        : ''
      rows.push({
        key: `${item.id || item.title}:${item.platform ?? ''}`,
        title: item.title,
        reason: [platform, item.reason].filter(Boolean).join(' · '),
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
            <p className="text-[12.5px] text-warning-ink">{row.reason}</p>
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
