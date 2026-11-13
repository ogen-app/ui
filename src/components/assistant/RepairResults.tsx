import { Fragment, type ReactNode } from 'react'
import { LockSimpleIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { usePlatformCatalog } from '@/hooks/usePlatforms'
import { getPostTypeLabel } from '@/lib/platformDictionary'
import { counted, formatDate, formatList } from '@/lib/intl'
import { cn } from '@/lib/styles'
import { useAssistantStore } from '@/stores/assistantStore'
import type {
  AssistantProposal,
  CalendarMove,
  CalendarMoved,
  CalendarPlan,
  CampaignReview,
  ChangedPost,
  PostRevised,
  PostsChanged,
  RepairResults as Results,
  UndoState,
} from '@/types/assistant'
import {
  PendingBox,
  ResolvedLine,
  ResultBlock,
  ResultRow,
  SourcesLine,
  StatusWord,
  TEXT_ACTION_CLASS,
  TextAction,
} from './blocks'
import {
  CheckedFooter,
  FindingRow,
  FixActions,
  IgnoredList,
} from './FindingsBlock'
import { useIsIgnored } from './useIsIgnored'
import { ProposalCard } from './ProposalCard'
import { UndoAction, UndoNote, type ResultUndo } from './ResultCard'

/**
 * What the repair pack's review, optimise and post fixes did this turn
 * (CON-462, drawn as CON-478 has them), one card each — and the campaign
 * pack's brief and posts checks, which answer in the review's shape. The
 * calendar check is `FindingsBlock`, drawn beside these.
 */
export function RepairResults({
  threadId,
  turnId,
  results: r,
  ignored = [],
  proposals = [],
  undoStates,
  disabled,
}: {
  threadId: string
  turnId: string
  results: Results
  ignored?: string[]
  /** The turn's offers: the plan's, and what each fix's offer became. */
  proposals?: AssistantProposal[]
  undoStates: Record<string, UndoState>
  disabled: boolean
}) {
  const { t } = useTranslation()
  const undo = useAssistantStore((s) => s.undo)
  const undoFor: ResultUndo = {
    states: undoStates,
    onUndo: (undoId) => void undo(threadId, turnId, undoId),
  }
  const review = (kind: ReviewKind, value: CampaignReview | undefined) =>
    value && (
      <ReviewCard
        kind={kind}
        review={value}
        threadId={threadId}
        turnId={turnId}
        ignored={ignored}
        proposals={proposals}
        disabled={disabled}
      />
    )

  const entries: [string, ReactNode][] = [
    ['review', review('review', r.review)],
    ['briefReview', review('brief', r.briefReview)],
    ['postsReview', review('posts', r.postsReview)],
    [
      'plan',
      r.plan && (
        <PlanCard
          threadId={threadId}
          plan={r.plan}
          offer={proposals.find((p) => p.id === r.plan?.proposalId)}
          disabled={disabled}
        />
      ),
    ],
    ['moved', r.moved && <MovedCard t={t} moved={r.moved} undo={undoFor} />],
    [
      'revised',
      r.revised && <RevisedCard t={t} revised={r.revised} undo={undoFor} />,
    ],
    [
      'converted',
      r.converted && (
        <ChangedCard kind="converted" change={r.converted} undo={undoFor} />
      ),
    ],
    [
      'unscheduled',
      r.unscheduled && (
        <ChangedCard kind="unscheduled" change={r.unscheduled} undo={undoFor} />
      ),
    ],
    ['deleted', r.deleted && <ChangedCard kind="deleted" change={r.deleted} />],
  ]
  const blocks = entries.filter(([, node]) => Boolean(node))
  if (blocks.length === 0) return null
  return (
    <div className="flex flex-col gap-5">
      {blocks.map(([key, block]) => (
        <Fragment key={key}>{block}</Fragment>
      ))}
    </div>
  )
}

type ReviewKind = 'review' | 'brief' | 'posts'

const REVIEW_TITLE = {
  review: 'assistant.repair.review.title',
  brief: 'assistant.repair.review.briefTitle',
  posts: 'assistant.repair.review.postsTitle',
} as const

const REVIEW_PROMPT = {
  review: 'assistant.repair.review.again.review',
  brief: 'assistant.repair.review.again.brief',
  posts: 'assistant.repair.review.again.posts',
} as const

/**
 * The brief and the posts read against each other — the whole review, or
 * either half alone. Each finding carries its own fixes — the brief's own
 * edit, or rewriting the post — and IGNORE, which the next review honours
 * while the brief or the post stays the same. "They agree" is said only when
 * nothing was set aside: ignoring a finding is not resolving it.
 */
function ReviewCard({
  kind,
  review,
  threadId,
  turnId,
  ignored,
  proposals,
  disabled,
}: {
  kind: ReviewKind
  review: CampaignReview
  threadId: string
  turnId: string
  ignored: string[]
  proposals: AssistantProposal[]
  disabled: boolean
}) {
  const { t } = useTranslation()
  const ignore = useAssistantStore((s) => s.ignoreFinding)
  const send = useAssistantStore((s) => s.send)
  const { campaignId } = review
  const isIgnored = useIsIgnored(
    campaignId,
    ignored,
    review.dismissedFindings.map((f) => f.key),
  )
  const all = [...review.findings, ...review.dismissedFindings]
  const open = all.filter((f) => !isIgnored(f.key))
  const allIgnored = all.filter((f) => isIgnored(f.key))
  const goneHere = review.findings.filter((f) => isIgnored(f.key))
  const readFrom = review.readFrom
    .map((what) =>
      what === 'brief'
        ? t('assistant.repair.review.from.brief')
        : what === 'posts'
          ? t('assistant.repair.review.from.posts')
          : null,
    )
    .filter((x): x is string => !!x)
  return (
    <ResultBlock
      status={t('assistant.repair.review.word')}
      tone={open.length > 0 ? 'warning' : 'neutral'}
      title={
        open.length > 0
          ? t(REVIEW_TITLE[kind], counted(open.length))
          : allIgnored.length > 0
            ? t('assistant.repair.review.noneOpen', counted(allIgnored.length))
            : t('assistant.repair.review.none')
      }
      meta={
        review.postsChecked > 0
          ? t('assistant.repair.review.read', counted(review.postsChecked))
          : undefined
      }
    >
      {open.length > 0 && (
        <ol className="flex flex-col">
          {open.map((f, i) => (
            <FindingRow
              key={f.key || i}
              n={i + 1}
              warn={f.severity === 'high'}
              title={f.issue}
              detail={
                [
                  f.label &&
                    (f.kind === 'post'
                      ? t('assistant.repair.review.inPost', { title: f.label })
                      : t('assistant.repair.review.inBrief', {
                          aspect: f.label,
                        })),
                  f.suggestion,
                ]
                  .filter(Boolean)
                  .join(' ') || undefined
              }
              onIgnore={
                f.key && campaignId
                  ? () => void ignore(threadId, turnId, campaignId, f.key)
                  : undefined
              }
              disabled={disabled}
            >
              <FixActions
                threadId={threadId}
                campaignId={campaignId}
                fixes={f.fixes}
                proposals={proposals}
                disabled={disabled}
              />
            </FindingRow>
          ))}
        </ol>
      )}
      {goneHere.map((f) => (
        <ResolvedLine key={f.key}>
          {t('assistant.findings.ignored', { finding: f.issue })}
        </ResolvedLine>
      ))}
      <IgnoredList
        campaignId={campaignId}
        items={allIgnored.map((f) => ({ key: f.key, title: f.issue }))}
      />
      {readFrom.length > 0 && (
        <SourcesLine
          label={t('assistant.assets.analysis.readFrom')}
          grounding={{
            mode: 'grounded',
            sources: readFrom.map((title) => ({ id: '', title })),
          }}
        />
      )}
      <CheckedFooter
        checkedAt={review.checkedAt}
        disabled={disabled}
        onCheck={() => void send(threadId, t(REVIEW_PROMPT[kind]))}
      />
    </ResultBlock>
  )
}

/** Rows listed before the rest are summed up. */
const PLAN_ROWS = 8

/** The widest window the plan draws as days; a longer one is counted. */
const GRID_DAYS = 14

/** "Thu, Apr 17" — a day, read in UTC so no timezone moves it. */
function dayLabel(value: string): string {
  return (
    formatDate(value, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }) ?? value
  )
}

/** "Mon, Apr 14, 10:00" — a move's landing time, when the server sends it. */
function timeLabel(at: string | undefined, day: string): string {
  return at
    ? (formatDate(at, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      }) ?? dayLabel(day))
    : dayLabel(day)
}

/** The window's days, YYYY-MM-DD, both ends included. */
function daysOf(window: { from: string; to: string }): string[] {
  const out: string[] = []
  const at = new Date(`${window.from}T00:00:00Z`)
  const end = new Date(`${window.to}T00:00:00Z`)
  while (at <= end && out.length <= GRID_DAYS) {
    out.push(at.toISOString().slice(0, 10))
    at.setUTCDate(at.getUTCDate() + 1)
  }
  return out
}

/**
 * The moves an optimise offers, inside the offer itself (CON-478): the
 * window in the headline, both weeks drawn before and after — moved posts in
 * teal, scheduled ones locked — then every move with its landing time, the
 * locked posts capped like the moves, and the confirm named after the work.
 * A run longer than two weeks is listed and counted, not drawn: six weeks of
 * days don't fit the rail.
 */
function PlanCard({
  threadId,
  plan,
  offer,
  disabled,
}: {
  threadId: string
  plan: CalendarPlan
  offer?: AssistantProposal
  disabled: boolean
}) {
  const { t } = useTranslation()
  const confirm = useAssistantStore((s) => s.confirmProposal)
  const dismiss = useAssistantStore((s) => s.dismissProposal)
  const moves = plan.moves.slice(0, PLAN_ROWS)
  const locked = plan.locked.slice(0, Math.max(0, PLAN_ROWS - moves.length))
  const more =
    plan.moves.length - moves.length + (plan.locked.length - locked.length)
  const days = plan.window ? daysOf(plan.window) : []
  const drawn =
    plan.moves.length > 0 && days.length > 0 && days.length <= GRID_DAYS
  const window = plan.window
    ? t('assistant.repair.plan.window', {
        from: dayLabel(plan.window.from),
        to: dayLabel(plan.window.to),
      })
    : undefined

  const body = (
    <>
      <h3 className="text-base/6 font-medium text-foreground">
        {plan.moves.length === 0
          ? t('assistant.repair.plan.even')
          : t('assistant.repair.plan.title', counted(plan.moves.length))}
        {window && plan.moves.length > 0 && (
          <span className="ml-2 text-sm font-normal text-secondary-foreground">
            {window}
          </span>
        )}
      </h3>
      {drawn && <PlanGrid t={t} days={days} plan={plan} />}
      <div className="mt-1 flex flex-col">
        {moves.map((m) => (
          <ResultRow key={m.postId} className="flex gap-3 text-sm">
            <span className="w-2/5 shrink-0 truncate text-secondary-foreground">
              {m.title || t('assistant.repair.untitled')}
            </span>
            <span className="text-foreground">
              {t('assistant.repair.plan.move', {
                from: dayLabel(m.from),
                to: timeLabel(m.toAt, m.to),
              })}
            </span>
          </ResultRow>
        ))}
        {locked.map((l) => (
          <ResultRow key={l.postId} className="flex gap-3 text-sm">
            <span className="w-2/5 shrink-0 truncate text-secondary-foreground">
              {l.title || t('assistant.repair.untitled')}
            </span>
            <span className="flex items-center gap-1.5 text-secondary-foreground">
              <LockSimpleIcon aria-hidden className="size-3.5 shrink-0" />
              {t('assistant.repair.plan.stays', {
                date: timeLabel(l.at, l.date),
              })}
            </span>
          </ResultRow>
        ))}
        {more > 0 && (
          <ResultRow className="text-[12.5px] text-secondary-foreground">
            {t('assistant.repair.plan.more', counted(more))}
          </ResultRow>
        )}
      </div>
    </>
  )

  if (offer && offer.status === 'pending' && plan.moves.length > 0) {
    return (
      <PendingBox>
        <StatusWord>{t('assistant.word.proposal')}</StatusWord>
        {body}
        <div className="mt-3 flex items-center gap-4">
          <Button
            variant="defaultInverted"
            size="sm"
            disabled={disabled}
            onClick={() => void confirm(threadId, offer.id)}
          >
            {t('assistant.repair.plan.confirm', counted(plan.moves.length))}
          </Button>
          <TextAction
            disabled={disabled}
            onClick={() => void dismiss(threadId, offer.id)}
          >
            {t('assistant.proposal.dismiss')}
          </TextAction>
        </div>
      </PendingBox>
    )
  }
  return (
    <section className="flex flex-col gap-1">
      <StatusWord>{t('assistant.repair.plan.word')}</StatusWord>
      {body}
      {offer && offer.status !== 'pending' && (
        <ProposalCard
          threadId={threadId}
          proposal={offer}
          disabled={disabled}
        />
      )}
    </section>
  )
}

/**
 * The window before and after, one row of days each: every moved post on
 * its old day above and its new one below — in teal there — and the locked
 * ones on their day in both, with a lock. Only what the plan names is drawn.
 */
function PlanGrid({
  t,
  days,
  plan,
}: {
  t: TFunction
  days: string[]
  plan: CalendarPlan
}) {
  const row = (label: string, after: boolean) => (
    <div className="flex flex-col gap-1">
      <StatusWord>{label}</StatusWord>
      <div
        className="grid gap-px border border-border bg-border"
        style={{
          gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
        }}
      >
        {days.map((day) => {
          const moved = plan.moves.filter(
            (m) => (after ? m.to : m.from) === day,
          )
          const kept = plan.locked.filter((l) => l.date === day)
          return (
            <div
              key={day}
              className="flex min-h-12 flex-col items-center gap-1 bg-primary p-1"
            >
              <span className="text-[10px] text-secondary-foreground">
                {formatDate(day, { weekday: 'narrow', timeZone: 'UTC' })}
              </span>
              {kept.map((l) => (
                <span
                  key={l.postId}
                  title={l.title}
                  className="flex h-3 w-full items-center justify-center border border-border"
                >
                  <LockSimpleIcon aria-hidden className="size-2.5" />
                </span>
              ))}
              {moved.map((m) => (
                <span
                  key={m.postId}
                  title={m.title}
                  className={cn(
                    'h-3 w-full border',
                    after
                      ? 'border-accent-ink bg-accent/15'
                      : 'border-border bg-secondary',
                  )}
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
  return (
    <div className="mt-2 flex flex-col gap-2">
      {row(t('assistant.repair.plan.before'), false)}
      {row(t('assistant.repair.plan.after'), true)}
      <p className="flex items-center gap-3 text-[11px] text-secondary-foreground">
        <span className="flex items-center gap-1">
          <span
            aria-hidden
            className="h-2.5 w-3 border border-accent-ink bg-accent/15"
          />
          {t('assistant.repair.plan.legendMoved')}
        </span>
        <span className="flex items-center gap-1">
          <LockSimpleIcon aria-hidden className="size-3" />
          {t('assistant.repair.plan.legendLocked')}
        </span>
      </p>
    </div>
  )
}

const STATUS_GROUP: Record<string, 'early' | 'ready'> = {
  planned: 'early',
  draft: 'early',
  ready_for_publish: 'ready',
}

/**
 * What a confirmed move did (`applyCalendarMoves`): one post from its old
 * time to its new one, or a run counted by what the posts were — drafts and
 * planned posts, posts ready to publish, the scheduled ones it left — with
 * one UNDO for all of it.
 */
function MovedCard({
  t,
  moved,
  undo,
}: {
  t: TFunction
  moved: CalendarMoved
  undo: ResultUndo
}) {
  const [only] = moved.moves
  const single = moved.moves.length === 1 && only
  const groups = { early: 0, ready: 0 }
  for (const [status, n] of Object.entries(moved.byStatus)) {
    const group = STATUS_GROUP[status]
    if (group) groups[group] += n
  }
  const span = weeksSpanned(moved.moves)
  return (
    <ResultBlock
      status={t('assistant.repair.moved.word')}
      title={
        single
          ? only.title || t('assistant.repair.untitled')
          : t('assistant.repair.moved.title', counted(moved.moved))
      }
      meta={
        !single && span > 1
          ? t('assistant.repair.moved.over', counted(span))
          : undefined
      }
      action={<UndoAction t={t} undoId={moved.undoId} undo={undo} />}
    >
      {single && (
        <ResultRow>
          <span className="text-sm text-foreground">
            {t('assistant.repair.plan.move', {
              from: timeLabel(only.fromAt, only.from),
              to: timeLabel(only.toAt, only.to),
            })}
          </span>
        </ResultRow>
      )}
      {!single && groups.early > 0 && (
        <MovedRow
          title={t('assistant.repair.moved.early')}
          sub={t('assistant.repair.moved.count', counted(groups.early))}
        />
      )}
      {!single && groups.ready > 0 && (
        <MovedRow
          title={t('assistant.repair.moved.ready')}
          sub={t('assistant.repair.moved.count', counted(groups.ready))}
        />
      )}
      {moved.locked > 0 && (
        <MovedRow
          title={
            <span className="flex items-center gap-1.5">
              <LockSimpleIcon aria-hidden className="size-3.5 shrink-0" />
              {t('assistant.repair.moved.locked', counted(moved.locked))}
            </span>
          }
          sub={t('assistant.repair.moved.lockedNote')}
        />
      )}
      {moved.skipped.length > 0 && (
        <ResultRow className="text-[12.5px] text-secondary-foreground">
          {t('assistant.repair.moved.skipped', counted(moved.skipped.length))}
        </ResultRow>
      )}
      <UndoNote t={t} undoId={moved.undoId} undo={undo} />
    </ResultBlock>
  )
}

function MovedRow({ title, sub }: { title: ReactNode; sub: ReactNode }) {
  return (
    <ResultRow className="flex flex-col">
      <span className="text-sm text-foreground">{title}</span>
      <span className="text-[12.5px] text-secondary-foreground">{sub}</span>
    </ResultRow>
  )
}

/** How many weeks the moves land across: "over 6 weeks". */
function weeksSpanned(moves: CalendarMove[]): number {
  const days = moves.map((m) => Date.parse(`${m.to}T00:00:00Z`)).filter(Boolean)
  if (days.length < 2) return 1
  const span = Math.max(...days) - Math.min(...days)
  return Math.floor(span / (7 * 24 * 3600 * 1000)) + 1
}

const CHANGED_WORD = {
  converted: 'assistant.repair.converted.word',
  unscheduled: 'assistant.repair.unscheduled.word',
  deleted: 'assistant.repair.deleted.word',
} as const

const CHANGED_TITLE = {
  converted: 'assistant.repair.converted.title',
  unscheduled: 'assistant.repair.unscheduled.title',
  deleted: 'assistant.repair.deleted.title',
} as const

/**
 * Posts a fix changed, each by name (CON-478): a conversion's types and what
 * it kept, and the time it keeps; an unscheduled post's status now and the
 * time it had. One post is the card's title; several are its rows. A
 * withdrawal from publishing is said apart, because no undo reaches it; a
 * post the fix left is named with the server's reason.
 */
function ChangedCard({
  kind,
  change,
  undo,
}: {
  kind: 'converted' | 'unscheduled' | 'deleted'
  change: PostsChanged
  undo?: ResultUndo
}) {
  const { t } = useTranslation()
  const { resolve } = usePlatformCatalog()
  const [only] = change.posts
  const single = change.posts.length === 1 && only
  const typeName = (post: ChangedPost, slug: string | undefined) =>
    slug
      ? getPostTypeLabel(resolve(post.platformId ?? post.platform ?? ''), slug)
      : ''
  const statusName = (status: string | undefined) =>
    status
      ? t(`posts.status.${status}` as 'posts.status.draft', {
          defaultValue: status,
        })
      : ''
  const when = (at: string | undefined) =>
    formatDate(at, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    })

  const rows = (post: ChangedPost) => {
    if (kind === 'converted') {
      return (
        <>
          {post.fromType && post.toType && (
            <MovedRow
              title={t('assistant.repair.converted.types', {
                from: typeName(post, post.fromType),
                to: typeName(post, post.toType),
              })}
              sub={
                post.kept.length > 0
                  ? t('assistant.repair.converted.kept', {
                      what: formatList(post.kept.map((k) => keptWord(t, k))),
                    })
                  : undefined
              }
            />
          )}
          {when(post.scheduledAt) && (
            <MovedRow
              title={t('assistant.repair.converted.still', {
                when: when(post.scheduledAt),
              })}
              sub={undefined}
            />
          )}
        </>
      )
    }
    if (kind === 'unscheduled') {
      return (
        <MovedRow
          title={t('assistant.repair.unscheduled.back', {
            status: statusName(post.toStatus),
          })}
          sub={
            when(post.wasAt)
              ? post.platform
                ? t('assistant.repair.unscheduled.wasOn', {
                    when: when(post.wasAt),
                    platform: resolve(post.platform)?.name ?? post.platform,
                  })
                : t('assistant.repair.unscheduled.was', {
                    when: when(post.wasAt),
                  })
              : undefined
          }
        />
      )
    }
    return null
  }

  return (
    <ResultBlock
      status={t(CHANGED_WORD[kind])}
      title={
        single
          ? only.title || t('assistant.repair.untitled')
          : t(CHANGED_TITLE[kind], counted(change.changed))
      }
      action={<UndoAction t={t} undoId={change.undoId} undo={undo} />}
    >
      {single
        ? rows(only)
        : change.posts.map((post) => (
            <Fragment key={post.postId}>
              <ResultRow className="text-sm text-foreground">
                {post.title || t('assistant.repair.untitled')}
              </ResultRow>
              {rows(post)}
            </Fragment>
          ))}
      {change.withdrawing > 0 && (
        <ResultRow className="text-[12.5px] text-warning-ink">
          {t('assistant.repair.withdrawing', counted(change.withdrawing))}
        </ResultRow>
      )}
      {change.skipped.map((s) => (
        <ResultRow
          key={s.postId}
          className="text-[12.5px] text-secondary-foreground"
        >
          {t('assistant.repair.skipped', { reason: s.reason })}
        </ResultRow>
      ))}
      {undo && <UndoNote t={t} undoId={change.undoId} undo={undo} />}
    </ResultBlock>
  )
}

const KEPT = {
  caption: 'assistant.repair.converted.keptWhat.caption',
  media: 'assistant.repair.converted.keptWhat.media',
} as const

/** What a conversion kept, in the catalogue's words; a part this build predates as the server named it. */
function keptWord(t: TFunction, part: string): string {
  return part in KEPT ? t(KEPT[part as keyof typeof KEPT]) : part
}

/**
 * One post rewritten (`revisePost`): the post by name, the voice it was
 * rewritten in, OPEN and UNDO (CON-477) — and where its words came from: a
 * rewrite keeps the post's sources, so the line is the post's own (CON-474).
 */
function RevisedCard({
  t,
  revised,
  undo,
}: {
  t: TFunction
  revised: PostRevised
  undo: ResultUndo
}) {
  const undone = revised.undoId && undo.states[revised.undoId] === 'undone'
  if (!revised.revised) {
    return (
      <ResultBlock
        status={t('assistant.repair.revised.word')}
        title={t('assistant.repair.revised.notRevised')}
      />
    )
  }
  return (
    <ResultBlock
      status={t('assistant.word.done')}
      title={revised.title || t('assistant.repair.revised.title')}
      meta={revised.title ? t('assistant.repair.revised.meta') : undefined}
      action={<UndoAction t={t} undoId={revised.undoId} undo={undo} />}
    >
      <ResultRow className="flex items-baseline gap-3">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm text-foreground">
            {revised.voiceName
              ? t('assistant.repair.revised.inVoice', {
                  voice: revised.voiceName,
                })
              : t('assistant.repair.revised.newVersion')}
          </span>
          <span
            className={cn(
              'text-[12.5px]',
              revised.versioned
                ? 'text-secondary-foreground'
                : 'text-warning-ink',
            )}
          >
            {revised.versioned
              ? t('assistant.repair.revised.versioned')
              : t('assistant.repair.revised.unversioned')}
          </span>
        </span>
        {revised.campaignId && !undone && (
          <Link
            to="/campaigns/$campaignId/posts/$postId"
            params={{ campaignId: revised.campaignId, postId: revised.postId }}
            className={`shrink-0 ${TEXT_ACTION_CLASS}`}
          >
            {t('assistant.repair.revised.open')}
          </Link>
        )}
      </ResultRow>
      <UndoNote t={t} undoId={revised.undoId} undo={undo} />
      {revised.grounding && <SourcesLine grounding={revised.grounding} />}
    </ResultBlock>
  )
}
