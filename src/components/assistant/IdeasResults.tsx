import { Fragment, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { LightbulbIcon } from '@phosphor-icons/react'
import { FitSection } from '@/components/ideas/card/IdeaCardParts'
import { Skeleton } from '@/components/ui/skeleton'
import { useCampaignNames } from '@/hooks/useCampaignNames'
import { usePlatformCatalog } from '@/hooks/usePlatforms'
import { startOfDay } from '@/lib/assetFilter'
import { counted, formatDate, formatList, formatNumber } from '@/lib/intl'
import { postStatusLabel } from '@/lib/postStatusLabel'
import { cn } from '@/lib/styles'
import { useAssistantStore } from '@/stores/assistantStore'
import type { PostStatus } from '@/types/posts'
import type {
  CompiledPost,
  DraftedIdeaPost,
  IdeaBrief,
  IdeaPlanBrief,
  IdeasChanged,
  IdeasResults as Results,
  IdeasShared,
  UndoState,
} from '@/types/assistant'
import {
  ResultBlock,
  ResultRow,
  SourcesLine,
  TEXT_ACTION_CLASS,
  TextAction,
} from './blocks'
import { UndoAction, UndoNote, type ResultUndo } from './ResultCard'

/** Rows a list card shows before it sums up the rest. */
const LIST_ROWS = 8

/**
 * What the ideas pack read or changed this turn (CON-465/466, drawn as
 * CON-481 has them), one card each: the ideas found, the verdicts given, a
 * move or delete, a compiled planned post, the drafts written, why an idea
 * fits, an edit, similar ideas, what a selection shares, duplicates and a
 * merge. Every change that can be put back carries UNDO, and every idea row
 * opens its idea (`?idea=` on the Ideas list).
 */
export function IdeasResults({
  threadId,
  turnId,
  campaignId,
  findFilter,
  results: r,
  undoStates,
}: {
  threadId: string
  turnId: string
  /** The thread's campaign: where its ideas and drafts open. */
  campaignId?: string
  /** What `findIdeas` was asked, in the Ideas list's syntax: SHOW ON SCREEN. */
  findFilter?: string
  results: Results
  undoStates: Record<string, UndoState>
}) {
  const { t } = useTranslation()
  const undo = useAssistantStore((s) => s.undo)
  const u: ResultUndo = {
    states: undoStates,
    onUndo: (undoId) => void undo(threadId, turnId, undoId),
  }
  const entries: [string, ReactNode][] = [
    [
      'found',
      r.found && (
        <FoundCard
          found={r.found}
          campaignId={campaignId}
          filter={findFilter}
          threadId={threadId}
          turnId={turnId}
        />
      ),
    ],
    [
      'decided',
      r.decided && (
        <ResultBlock
          status={t('assistant.ideas.decided.word')}
          title={verdictLine(t, r.decided.idea)}
          meta={backOn(t, r.decided.idea.verdict, r.decided.idea.remindAt)}
          action={<UndoAction t={t} undoId={r.decided.undoId} undo={u} />}
        >
          <UndoNote t={t} undoId={r.decided.undoId} undo={u} />
        </ResultBlock>
      ),
    ],
    [
      'decidedMany',
      r.decidedMany && <TriageCard triage={r.decidedMany} undo={u} />,
    ],
    [
      'moved',
      r.moved && (
        <ChangedCard
          t={t}
          word={t('assistant.ideas.moved.word')}
          title={t('assistant.ideas.moved.title', counted(r.moved.done))}
          change={r.moved}
          ideas={r.moved.ideas}
          undo={u}
        />
      ),
    ],
    [
      'deleted',
      r.deleted && (
        <ChangedCard
          t={t}
          word={t('assistant.ideas.deleted.word')}
          title={t('assistant.ideas.deleted.title', counted(r.deleted.done))}
          change={r.deleted}
        />
      ),
    ],
    ['compiled', r.compiled && <CompiledCard compiled={r.compiled} undo={u} />],
    [
      'drafted',
      r.drafted && <DraftedCard drafted={r.drafted} campaignId={campaignId} />,
    ],
    ['idea', r.idea && <IdeaCard read={r.idea} campaignId={campaignId} />],
    ['edited', r.edited && <EditedCard edited={r.edited} undo={u} />],
    ['similar', r.similar && <SimilarCard similar={r.similar} />],
    ['common', r.common && <CommonCard common={r.common} />],
    [
      'duplicates',
      r.duplicates && <DuplicatesCard duplicates={r.duplicates} />,
    ],
    ['merged', r.merged && <MergedCard merged={r.merged} />],
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

type Pile = 'waiting' | 'yes' | 'later' | 'no'

/**
 * The pile an idea sits in, as the Ideas list counts it: a `later` idea past
 * its day is woken and back on the desk (bug 6), though its verdict stays.
 */
function pileOf(idea: IdeaBrief, now = Date.now()): Pile {
  if (
    idea.verdict === 'later' &&
    idea.remindAt &&
    Date.parse(idea.remindAt) <= now
  )
    return 'waiting'
  return idea.verdict ?? 'waiting'
}

/** A pile's name, as the Ideas list names it. */
function pileName(t: TFunction, pile: Pile): string {
  return pile === 'waiting'
    ? t('ideas.pile.waiting')
    : t(`ideas.verdict.${pile}`)
}

function verdictLine(t: TFunction, idea: IdeaBrief): string {
  return t('assistant.ideas.decided.title', {
    pile: pileName(t, pileOf(idea)),
    idea: idea.title || t('assistant.ideas.untitled'),
  })
}

/** "back on 1 May", for a `later` that names its day. */
function backOn(
  t: TFunction,
  verdict: string | undefined,
  remindAt: string | undefined,
): string | undefined {
  return verdict === 'later' && remindAt
    ? t('assistant.ideas.backOn', { day: shortDay(remindAt) })
    : undefined
}

function shortDay(iso: string): string {
  return formatDate(iso, { day: 'numeric', month: 'short' }) ?? iso
}

/** A `YYYY-MM-DD` day as the card prints it, read as the local day. */
function dayLabel(day: string): string {
  return formatDate(startOfDay(day), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/**
 * An idea on the Ideas list, opened (`?idea=`, CON-481): its campaign's
 * list, or the workspace's, on the pile that holds it.
 */
function IdeaLink({
  idea,
  className,
  children,
}: {
  idea: IdeaBrief
  className?: string
  children: ReactNode
}) {
  const pile = pileOf(idea)
  const search = {
    idea: idea.id,
    ...(pile === 'waiting' ? {} : { pile }),
  }
  return idea.campaignId ? (
    <Link
      to="/campaigns/$campaignId/ideas"
      params={{ campaignId: idea.campaignId }}
      search={search as never}
      className={className}
    >
      {children}
    </Link>
  ) : (
    <Link to="/ideas" search={search as never} className={className}>
      {children}
    </Link>
  )
}

/** The pile, as a small-caps word in its own ink: the desk amber, a yes teal. */
function PileWord({ pile }: { pile: Pile }) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        'shrink-0 text-[11px] font-semibold uppercase tracking-[0.06em]',
        pile === 'waiting'
          ? 'text-warning-ink'
          : pile === 'yes'
            ? 'text-accent-ink'
            : 'text-tertiary-foreground',
      )}
    >
      {pileName(t, pile)}
    </span>
  )
}

/**
 * One idea as a row: the lightbulb, its title — which opens it — wrapping
 * rather than cut, a detail line under it, and its pile on the right.
 */
function IdeaLine({
  idea,
  detail,
  pile = true,
}: {
  idea: IdeaBrief
  detail?: ReactNode
  pile?: boolean
}) {
  const { t } = useTranslation()
  return (
    <ResultRow className="flex items-baseline gap-2.5">
      <LightbulbIcon
        aria-hidden
        className="size-3.5 shrink-0 translate-y-0.5 text-tertiary-foreground"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <IdeaLink
          idea={idea}
          className="text-sm text-foreground hover:underline"
        >
          {idea.title || t('assistant.ideas.untitled')}
        </IdeaLink>
        {detail && (
          <span className="text-[12.5px] text-tertiary-foreground">
            {detail}
          </span>
        )}
      </span>
      {pile && <PileWord pile={pileOf(idea)} />}
    </ResultRow>
  )
}

/** "and 3 more" under a list cut at `LIST_ROWS` (bug 7). */
function More({ count }: { count: number }) {
  const { t } = useTranslation()
  if (count <= 0) return null
  return (
    <p className="pt-2.5 text-[12.5px] text-tertiary-foreground">
      {t('assistant.ideas.more', counted(count))}
    </p>
  )
}

/** The pile a filter names, when it names one. */
function filterPile(filter: string | undefined): Pile | undefined {
  const p = new URLSearchParams(filter ?? '').get('pile')
  return p === 'waiting' || p === 'yes' || p === 'later' || p === 'no'
    ? p
    : undefined
}

/**
 * The ideas a question found (CON-481): how many, of the pile's whole when
 * the filter named one, each with its fit; SHOW ON SCREEN puts the same
 * filter on the Ideas list, as a screen change with BACK (bug 5).
 */
function FoundCard({
  found,
  campaignId,
  filter,
  threadId,
  turnId,
}: {
  found: NonNullable<Results['found']>
  campaignId?: string
  filter?: string
  threadId: string
  turnId: string
}) {
  const { t } = useTranslation()
  const run = useAssistantStore((s) => s.runUiAction)
  const shown = found.ideas.slice(0, LIST_ROWS)
  const more = Math.max(found.total, found.ideas.length) - shown.length
  const pile = filterPile(filter)
  return (
    <ResultBlock
      status={t('assistant.ideas.found.word')}
      title={
        found.total === 0
          ? t('assistant.ideas.found.none')
          : t('assistant.ideas.found.title', counted(found.total))
      }
      meta={
        found.pileTotal !== undefined && pile
          ? t('assistant.ideas.found.ofPile', {
              total: formatNumber(found.pileTotal),
              pile: pileName(t, pile),
            })
          : undefined
      }
      // Only with the filter it ran: a reloaded thread keeps the result but
      // not its steps, and an empty filter would clear the list instead.
      action={
        found.total > 0 && filter !== undefined ? (
          <TextAction
            onClick={() =>
              void run(threadId, turnId, {
                type: 'set_filter',
                screen: campaignId ? 'campaign.ideas' : 'ideas',
                campaignId,
                filter,
              })
            }
          >
            {t('assistant.ideas.found.show')}
          </TextAction>
        ) : undefined
      }
    >
      {shown.map((idea) => (
        <IdeaLine
          key={idea.id}
          idea={idea}
          detail={
            idea.fitScore !== undefined
              ? t('assistant.ideas.found.fit', {
                  score: formatNumber(idea.fitScore),
                })
              : undefined
          }
        />
      ))}
      <More count={more} />
    </ResultBlock>
  )
}

/**
 * Many verdicts at once (CON-481): which pile they went to and when they come
 * back, each idea named, and UNDO — whose line says where they went back to.
 */
function TriageCard({
  triage,
  undo,
}: {
  triage: NonNullable<Results['decidedMany']>
  undo: ResultUndo
}) {
  const { t } = useTranslation()
  const to: Pile | undefined =
    triage.verdict === 'none' ? 'waiting' : triage.verdict
  const shown = triage.ideas.slice(0, LIST_ROWS)
  return (
    <ResultBlock
      status={t('assistant.ideas.decided.word')}
      title={
        to
          ? t('assistant.ideas.decided.manyTo', {
              ...counted(triage.done),
              pile: pileName(t, to),
            })
          : t('assistant.ideas.decided.many', counted(triage.done))
      }
      meta={backOn(t, triage.verdict, triage.remindAt)}
      action={<UndoAction t={t} undoId={triage.undoId} undo={undo} />}
    >
      {shown.map((idea) => (
        <IdeaLine
          key={idea.id}
          idea={idea}
          pile={false}
          detail={[
            pileName(t, pileOf(idea)),
            idea.verdict === 'later' && idea.remindAt
              ? shortDay(idea.remindAt)
              : '',
          ]
            .filter(Boolean)
            .join(' · ')}
        />
      ))}
      <More count={triage.ideas.length - shown.length} />
      <Problems t={t} change={triage} />
      <UndoNote
        t={t}
        undoId={triage.undoId}
        undo={undo}
        undone={t('assistant.ideas.decided.undone', counted(triage.done))}
      />
    </ResultBlock>
  )
}

function Problems({ t, change }: { t: TFunction; change: IdeasChanged }) {
  return (
    <>
      {change.failed > 0 && (
        <ResultRow className="text-[12.5px] text-warning-ink">
          {t('assistant.ideas.failed', counted(change.failed))}
        </ResultRow>
      )}
      {change.stopped && (
        <ResultRow className="text-[12.5px] text-warning-ink">
          {t('assistant.ideas.stopped')}
        </ResultRow>
      )}
    </>
  )
}

/** A bulk move or delete: how many, the ideas moved, why it stopped, UNDO. */
function ChangedCard({
  t,
  word,
  title,
  change,
  ideas = [],
  undo,
}: {
  t: TFunction
  word: string
  title: string
  change: IdeasChanged
  ideas?: IdeaBrief[]
  undo?: ResultUndo
}) {
  const shown = ideas.slice(0, LIST_ROWS)
  return (
    <ResultBlock
      status={word}
      title={title}
      action={<UndoAction t={t} undoId={change.undoId} undo={undo} />}
    >
      {shown.map((idea) => (
        <IdeaLine key={idea.id} idea={idea} />
      ))}
      <More count={ideas.length - shown.length} />
      <Problems t={t} change={change} />
      <UndoNote t={t} undoId={change.undoId} undo={undo} />
    </ResultBlock>
  )
}

/**
 * A planned post compiled from ideas (CON-449, drawn as CON-481 has it): its
 * platform, type and date, the theses one per idea, the ideas it was built
 * from with UNDO, and the sources. UNDO deletes the post while it is as the
 * assistant made it; once someone has changed it the card says so, and how
 * to remove it by hand.
 */
function CompiledCard({
  compiled: c,
  undo,
}: {
  compiled: NonNullable<Results['compiled']>
  undo: ResultUndo
}) {
  const { t } = useTranslation()
  const { resolve } = usePlatformCatalog()
  const changed = c.undoId ? undo.states[c.undoId] === 'changed' : false
  const plainType = (slug?: string) => slug?.replace(/[-_]/g, ' ')
  const meta = (p: CompiledPost) =>
    p.platformId
      ? [
          resolve(p.platformId)?.name,
          plainType(p.postType),
          p.date ? dayLabel(p.date) : t('assistant.ideas.noDate'),
        ]
          .filter(Boolean)
          .join(' · ')
      : t('assistant.ideas.compiled.noPlatform')
  const open = (postId: string) =>
    c.campaignId ? (
      <Link
        to="/campaigns/$campaignId/posts/$postId"
        params={{ campaignId: c.campaignId, postId }}
        className={TEXT_ACTION_CLASS}
      >
        {t('assistant.ideas.open')}
      </Link>
    ) : undefined
  const first = c.posts[0]
  return (
    <ResultBlock
      status={t('assistant.ideas.compiled.word', counted(c.posts.length))}
      title={
        <>
          {first.title || t('assistant.ideas.untitled')}
          {changed && (
            <span className="ml-1.5 text-sm font-normal text-secondary-foreground">
              {t('assistant.ideas.compiled.editedSince')}
            </span>
          )}
        </>
      }
      meta={c.posts.length === 1 ? meta(first) : undefined}
      // UNDO sits with the ideas it was built from; with none listed (a
      // server before CON-481) it takes the header, as the only way back.
      action={
        c.builtFrom.length === 0 ? (
          <UndoAction t={t} undoId={c.undoId} undo={undo} />
        ) : c.posts.length === 1 ? (
          open(first.postId)
        ) : undefined
      }
    >
      {c.posts.length > 1 &&
        c.posts.map((p) => (
          <ResultRow
            key={p.postId}
            className="flex items-baseline gap-3 text-[12.5px]"
          >
            <span className="min-w-0 flex-1 truncate text-secondary-foreground">
              {meta(p)}
            </span>
            {open(p.postId)}
          </ResultRow>
        ))}
      {c.theses.map((th, i) => (
        <ResultRow key={i} className="flex items-baseline gap-3 text-sm">
          <span className="w-5 shrink-0 font-mono text-[12px] text-tertiary-foreground">
            {String(i + 1).padStart(2, '0')}
          </span>
          <span className="min-w-0 flex-1 text-foreground">
            {th.title}
            {th.points.length > 0 && (
              <span className="block text-[12.5px] text-tertiary-foreground">
                {th.points.join(' · ')}
              </span>
            )}
          </span>
        </ResultRow>
      ))}
      {c.builtFrom.length > 0 && (
        <ResultRow className="flex items-baseline gap-3">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm text-foreground">
              {t(
                'assistant.ideas.compiled.builtFrom',
                counted(c.builtFrom.length),
              )}
            </span>
            <span className="text-[12.5px] text-tertiary-foreground">
              {c.builtFrom.map((i) => i.title).join(' · ')}
            </span>
          </span>
          <UndoAction t={t} undoId={c.undoId} undo={undo} />
        </ResultRow>
      )}
      <UndoNote
        t={t}
        undoId={c.undoId}
        undo={undo}
        changed={t('assistant.ideas.compiled.cantUndo')}
      />
      <SourcesLine
        grounding={c.grounding}
        note={t('assistant.ideas.compiled.fromIdeas', counted(c.ideas))}
      />
    </ResultBlock>
  )
}

/** Where a draft opens: its own campaign, else the thread's (bug 4). */
function draftCampaign(
  p: DraftedIdeaPost,
  campaignId: string | undefined,
): string | undefined {
  return p.campaignId || campaignId
}

/**
 * One draft as it is written (CON-481): its title and platform, OPEN, the
 * start of its body, and where it came from — or that it came from the idea's
 * own words.
 */
function DraftCard({
  draft,
  campaignId,
}: {
  draft: DraftedIdeaPost
  campaignId?: string
}) {
  const { t } = useTranslation()
  const { resolve } = usePlatformCatalog()
  const campaign = draftCampaign(draft, campaignId)
  return (
    <ResultBlock
      status={t('assistant.ideas.drafted.one')}
      title={draft.title || t('assistant.ideas.untitled')}
      meta={resolve(draft.platformId)?.name}
      action={
        campaign ? (
          <Link
            to="/campaigns/$campaignId/posts/$postId"
            params={{ campaignId: campaign, postId: draft.postId }}
            className={TEXT_ACTION_CLASS}
          >
            {t('assistant.ideas.open')}
          </Link>
        ) : undefined
      }
    >
      {draft.excerpt && (
        <p className="py-2.5 text-sm text-secondary-foreground">
          {draft.excerpt}
        </p>
      )}
      <SourcesLine
        grounding={draft.grounding}
        note={t(
          'assistant.ideas.drafted.fromIdea',
          counted(draft.ideaIds.length || 1),
        )}
      />
    </ResultBlock>
  )
}

/**
 * The drafts while they are being written (CON-481): each finished one as a
 * card, then the next as a placeholder. The turn's summary replaces them.
 */
export function LiveDrafts({
  drafts,
}: {
  drafts: { posts: DraftedIdeaPost[]; done: number; total: number }
}) {
  const { t } = useTranslation()
  const writing = Math.max(drafts.done, drafts.posts.length)
  return (
    <div className="flex flex-col gap-5">
      {drafts.posts.map((p) => (
        <DraftCard key={p.postId} draft={p} />
      ))}
      {drafts.total > writing && (
        <ResultBlock
          status={t('assistant.ideas.drafted.writing')}
          title={t('assistant.ideas.drafted.writingNth', {
            n: formatNumber(writing + 1),
            total: formatNumber(drafts.total),
          })}
        >
          <div className="flex flex-col gap-2 py-2.5" aria-hidden>
            <Skeleton className="h-2.5 w-3/5" />
            <Skeleton className="h-2.5 w-2/5" />
          </div>
        </ResultBlock>
      )}
    </div>
  )
}

/**
 * The drafts written from ideas, as one summary (CON-481): how many from how
 * many ideas, OPEN ALL to the campaign's drafts when they share one, and each
 * draft with its platform and whether it is grounded — amber where it isn't.
 * A single draft is drawn as its own card.
 */
function DraftedCard({
  drafted: d,
  campaignId,
}: {
  drafted: NonNullable<Results['drafted']>
  campaignId?: string
}) {
  const { t } = useTranslation()
  const { resolve } = usePlatformCatalog()
  if (d.posts.length === 1 && d.warnings.length === 0)
    return <DraftCard draft={d.posts[0]} campaignId={campaignId} />
  const ideas = new Set(d.posts.flatMap((p) => p.ideaIds)).size
  const campaigns = new Set(d.posts.map((p) => draftCampaign(p, campaignId)))
  const only = campaigns.size === 1 ? [...campaigns][0] : undefined
  const unscheduled = d.posts.filter((p) => !p.publishDate).length
  return (
    <ResultBlock
      status={t('assistant.ideas.drafted.word')}
      title={
        ideas > 0
          ? t('assistant.ideas.drafted.fromIdeas', {
              drafts: t(
                'assistant.ideas.drafted.title',
                counted(d.posts.length),
              ),
              ...counted(ideas),
            })
          : t('assistant.ideas.drafted.title', counted(d.posts.length))
      }
      meta={
        unscheduled === d.posts.length
          ? t('assistant.ideas.drafted.unscheduled')
          : unscheduled > 0
            ? t('assistant.ideas.drafted.someUnscheduled', counted(unscheduled))
            : undefined
      }
      action={
        only ? (
          <Link
            to="/campaigns/$campaignId/list"
            params={{ campaignId: only }}
            search={{ status: 'draft' } as never}
            className={TEXT_ACTION_CLASS}
          >
            {t('assistant.ideas.drafted.openAll')}
          </Link>
        ) : undefined
      }
    >
      {d.posts.map((p) => {
        const campaign = draftCampaign(p, campaignId)
        const grounded = p.grounding.mode === 'grounded'
        return (
          <ResultRow key={p.postId} className="flex items-baseline gap-3">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              {campaign ? (
                <Link
                  to="/campaigns/$campaignId/posts/$postId"
                  params={{ campaignId: campaign, postId: p.postId }}
                  className="text-sm text-foreground hover:underline"
                >
                  {p.title || t('assistant.ideas.untitled')}
                </Link>
              ) : (
                <span className="text-sm text-foreground">
                  {p.title || t('assistant.ideas.untitled')}
                </span>
              )}
              <span
                className={cn(
                  'text-[12.5px]',
                  grounded ? 'text-tertiary-foreground' : 'text-warning-ink',
                )}
              >
                {[
                  resolve(p.platformId)?.name,
                  p.publishDate ? dayLabel(p.publishDate) : '',
                  grounded
                    ? t('assistant.ideas.drafted.grounded')
                    : t('assistant.ideas.drafted.notGrounded'),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </span>
          </ResultRow>
        )
      })}
      {d.warnings.length > 0 && (
        <ResultRow className="text-[12.5px] text-warning-ink">
          {t('assistant.ideas.drafted.dropped', counted(d.warnings.length))}
        </ResultRow>
      )}
    </ResultBlock>
  )
}

/**
 * Why an idea fits (CON-481): "Fit 82 for Spring reopening", the breakdown
 * first, then its angle and rationale in its own words, the analysis it came
 * from — opening the asset on that lens — and the posts made from it.
 */
function IdeaCard({
  read,
  campaignId,
}: {
  read: NonNullable<Results['idea']>
  campaignId?: string
}) {
  const { t } = useTranslation()
  const { names } = useCampaignNames()
  const fit = read.fit
  const score = fit?.score ?? read.idea.fitScore
  const breakdown = fit
    ? {
        lens: fit.lens,
        campaign_id: fit.campaignId ?? null,
        caps: fit.caps,
        criteria: Object.fromEntries(
          fit.criteria.map((c) => [
            c.key,
            {
              level: c.level,
              why: c.why,
              phase: c.phase,
              campaign: c.campaign,
            },
          ]),
        ),
      }
    : undefined
  const scoredFor = fit?.campaignId
    ? (names.get(fit.campaignId) ?? t('assistant.ideas.idea.aCampaign'))
    : t('assistant.ideas.idea.workspace')
  const lens = read.lens?.campaignId
    ? (read.lens.campaignName ??
      names.get(read.lens.campaignId) ??
      t('assistant.ideas.idea.aCampaign'))
    : t('assistant.ideas.idea.workspace')
  const asset = read.sourceAsset
  return (
    <ResultBlock
      status={t('assistant.ideas.idea.word')}
      title={
        score !== undefined
          ? t('assistant.ideas.idea.fitFor', {
              score: formatNumber(score),
              scope: scoredFor,
            })
          : read.idea.title || t('assistant.ideas.untitled')
      }
      meta={score !== undefined ? read.idea.title : undefined}
    >
      {breakdown && score !== undefined && (
        <div className="py-2.5">
          <FitSection
            idea={{ fitScore: score, fitBreakdown: breakdown }}
            scoredFor={null}
            compact
          />
        </div>
      )}
      {read.angle && (
        <Labelled label={t('assistant.ideas.idea.angle')}>
          {read.angle}
        </Labelled>
      )}
      {read.rationale && (
        <Labelled label={t('assistant.ideas.idea.rationale')}>
          {read.rationale}
        </Labelled>
      )}
      {asset && (
        <ResultRow className="flex items-baseline gap-3">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm text-foreground">
              {t('assistant.ideas.idea.from')}
            </span>
            <span className="text-[12.5px] text-tertiary-foreground">
              {t('assistant.ideas.idea.fromLens', { asset: asset.title, lens })}
            </span>
            {read.analysisGist && (
              <span className="text-[12.5px] text-tertiary-foreground">
                {read.analysisGist}
              </span>
            )}
          </span>
          {campaignId ? (
            <Link
              to="/campaigns/$campaignId/assets/$assetId"
              params={{ campaignId, assetId: asset.id }}
              search={
                (read.lens?.campaignId
                  ? { lens: read.lens.campaignId }
                  : {}) as never
              }
              className={TEXT_ACTION_CLASS}
            >
              {t('assistant.ideas.open')}
            </Link>
          ) : (
            <Link
              to="/assets/$assetId"
              params={{ assetId: asset.id }}
              search={
                (read.lens?.campaignId
                  ? { lens: read.lens.campaignId }
                  : {}) as never
              }
              className={TEXT_ACTION_CLASS}
            >
              {t('assistant.ideas.open')}
            </Link>
          )}
        </ResultRow>
      )}
      {read.posts.map((p) => (
        <ResultRow
          key={p.id}
          className="flex items-baseline gap-3 text-[12.5px]"
        >
          <span className="min-w-0 flex-1 truncate">
            <span className="text-tertiary-foreground">
              {t('assistant.ideas.idea.post')}
            </span>{' '}
            <span className="text-foreground">{p.title}</span>
          </span>
          <span className="shrink-0 text-tertiary-foreground">
            {postStatusLabel(t, p.status as PostStatus)}
          </span>
        </ResultRow>
      ))}
    </ResultBlock>
  )
}

function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ResultRow className="flex flex-col gap-0.5">
      <span className="text-sm text-foreground">{label}</span>
      <span className="text-[12.5px] text-secondary-foreground">
        {children}
      </span>
    </ResultRow>
  )
}

/** A plan in words: "Instagram · carousel", or that nothing is planned. */
function planLine(
  t: TFunction,
  plan: IdeaPlanBrief | undefined,
  platformName: (slug: string) => string,
  phaseName: (id: string) => string,
): string {
  const parts = [
    plan?.platformId ? platformName(plan.platformId) : '',
    plan?.postType ? plan.postType.replace(/[-_]/g, ' ') : '',
    plan?.phaseId ? phaseName(plan.phaseId) : '',
    plan?.targetDate ? dayLabel(plan.targetDate) : '',
  ].filter(Boolean)
  return parts.length > 0
    ? parts.join(' · ')
    : t('assistant.ideas.edited.noPlan')
}

/**
 * An edit (CON-481): each field it changed, the old value struck through over
 * the new one, and UNDO. A plan field is the plan as a whole, as the idea
 * reads it.
 */
function EditedCard({
  edited,
  undo,
}: {
  edited: NonNullable<Results['edited']>
  undo: ResultUndo
}) {
  const { t } = useTranslation()
  const { resolve } = usePlatformCatalog()
  const name = (slug: string) => resolve(slug)?.name ?? slug
  // The idea's phases are its campaign type's, which the card doesn't hold:
  // a phase reads as one, its slug made legible.
  const phase = (id: string) =>
    t('assistant.ideas.edited.phase', { phase: id.replace(/[-_]/g, ' ') })
  const before = edited.before
  const titleChanged = edited.changed.includes('title')
  const noteChanged = edited.changed.includes('note')
  const planChanged = edited.changed.some(
    (f) =>
      f.startsWith('plan') ||
      ['platformId', 'postType', 'phaseId', 'targetDate'].includes(f),
  )
  const field = (
    label: string,
    from: string | undefined,
    to: string | undefined,
  ) => (
    <ResultRow className="flex flex-col gap-0.5">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-tertiary-foreground">
        {label}
      </span>
      {from !== undefined && (
        <s className="text-[12.5px] text-tertiary-foreground">{from}</s>
      )}
      {to !== undefined && (
        <span className="text-sm text-foreground">{to}</span>
      )}
    </ResultRow>
  )
  return (
    <ResultBlock
      status={t('assistant.ideas.edited.word')}
      title={edited.idea.title || t('assistant.ideas.untitled')}
      action={<UndoAction t={t} undoId={edited.undoId} undo={undo} />}
    >
      {before ? (
        <>
          {titleChanged &&
            field(
              t('assistant.ideas.edited.fields.title'),
              before.title,
              edited.idea.title,
            )}
          {noteChanged &&
            field(
              t('assistant.ideas.edited.fields.note'),
              before.note || t('assistant.ideas.edited.empty'),
              // The server leaves out a cleared note; one it sends is the
              // note as it now reads.
              edited.note || t('assistant.ideas.edited.empty'),
            )}
          {planChanged &&
            field(
              t('assistant.ideas.edited.fields.plan'),
              planLine(t, before.plan, name, phase),
              planLine(t, edited.idea.plan, name, phase),
            )}
        </>
      ) : (
        <ResultRow className="text-[12.5px] text-tertiary-foreground">
          {changedFields(t, edited.changed)}
        </ResultRow>
      )}
      <UndoNote t={t} undoId={edited.undoId} undo={undo} />
    </ResultBlock>
  )
}

/** The fields an edit changed, in words, for a server that sent no `before`. */
function changedFields(t: TFunction, fields: string[]): string | undefined {
  const words = fields.map((f) => {
    switch (f) {
      case 'title':
        return t('assistant.ideas.edited.fields.title')
      case 'note':
        return t('assistant.ideas.edited.fields.note')
      case 'plan.platformId':
      case 'platformId':
        return t('assistant.ideas.edited.fields.platform')
      case 'plan.postType':
      case 'postType':
        return t('assistant.ideas.edited.fields.postType')
      case 'plan.phaseId':
      case 'phaseId':
        return t('assistant.ideas.edited.fields.phase')
      case 'plan.targetDate':
      case 'targetDate':
        return t('assistant.ideas.edited.fields.date')
      default:
        return f
    }
  })
  return words.length > 0
    ? t('assistant.ideas.edited.changed', { fields: formatList(words) })
    : undefined
}

/**
 * An edit the server refused because the idea came from an analysis
 * (`idea_read_only`, bug 9): NOT CHANGED, and what can change instead.
 */
export function IdeaReadOnly() {
  const { t } = useTranslation()
  return (
    <ResultBlock
      status={t('assistant.ideas.readOnly.word')}
      tone="warning"
      title={t('assistant.ideas.readOnly.title')}
    >
      <ResultRow className="flex flex-col gap-0.5">
        <span className="text-sm text-foreground">
          {t('assistant.ideas.readOnly.why')}
        </span>
        <span className="text-[12.5px] text-tertiary-foreground">
          {t('assistant.ideas.readOnly.instead')}
        </span>
      </ResultRow>
    </ResultBlock>
  )
}

/** Ideas like one, each with the server's reasons it matched. */
function SimilarCard({
  similar,
}: {
  similar: NonNullable<Results['similar']>
}) {
  const { t } = useTranslation()
  const shown = similar.items.slice(0, LIST_ROWS)
  return (
    <ResultBlock
      status={t('assistant.ideas.similar.word')}
      title={
        similar.items.length === 0
          ? t('assistant.ideas.similar.none')
          : t('assistant.ideas.similar.title', counted(similar.items.length))
      }
    >
      {shown.map((s) => (
        <IdeaLine
          key={s.idea.id}
          idea={s.idea}
          detail={s.why.length > 0 ? s.why.join(' · ') : undefined}
        />
      ))}
      <More count={similar.items.length - shown.length} />
      {similar.items.length > 0 && (
        <p className="border-t border-border pt-2.5 text-[12.5px] text-tertiary-foreground">
          {t('assistant.ideas.similar.note')}
        </p>
      )}
    </ResultBlock>
  )
}

/** The kinds the card shows, in its order; the rest are left to the model. */
const SHARED_SHOWN = ['lenses', 'assets'] as const

const SPLIT_FIELDS = {
  campaign: 'assistant.ideas.common.split.campaign',
  lens: 'assistant.ideas.common.split.lens',
  platform: 'assistant.ideas.common.split.platform',
  postType: 'assistant.ideas.common.split.postType',
  phase: 'assistant.ideas.common.split.phase',
} as const

/**
 * What a selection shares (CON-481): "3 ideas, one thread · the spa", the
 * angle they take, the lens and the sources with how many carry each, and —
 * in amber, the thing to settle before compiling — where they split.
 */
function CommonCard({ common }: { common: NonNullable<Results['common']> }) {
  const { t } = useTranslation()
  const { resolve } = usePlatformCatalog()
  const n = common.ideas.length
  const value = (v: IdeasShared) =>
    t('assistant.ideas.common.value', {
      value: v.label,
      ...counted(v.ideaIds.length),
      of: formatNumber(n),
    })
  const shared = SHARED_SHOWN.flatMap((kind) => {
    const s = common.shared.find((x) => x.kind === kind)
    return s ? [{ ...s, kind }] : []
  })
  const nothing = !common.theme && !common.angle && shared.length === 0
  return (
    <ResultBlock
      status={t('assistant.ideas.common.word')}
      title={
        nothing
          ? t('assistant.ideas.common.nothing', counted(n))
          : t('assistant.ideas.common.title', counted(n))
      }
      meta={common.theme}
    >
      {common.angle && (
        <Labelled label={t('assistant.ideas.common.angle')}>
          {common.angle}
        </Labelled>
      )}
      {shared.map((s) => (
        <Labelled key={s.kind} label={t(`assistant.ideas.common.${s.kind}`)}>
          {s.values.map(value).join(' · ')}
        </Labelled>
      ))}
      {common.splits.length > 0 && (
        <ResultRow className="flex flex-col gap-0.5">
          <span className="text-sm text-foreground">
            {t('assistant.ideas.common.splitTitle')}
          </span>
          {common.splits.map((sp) => (
            <span key={sp.field} className="text-[12.5px] text-warning-ink">
              {t(
                SPLIT_FIELDS[sp.field as keyof typeof SPLIT_FIELDS] ??
                  'assistant.ideas.common.split.other',
                {
                  values: formatList(
                    sp.values.map((v) =>
                      t('assistant.ideas.common.value', {
                        value:
                          sp.field === 'platform'
                            ? (resolve(v.value)?.name ?? v.label)
                            : v.label,
                        ...counted(v.ideaIds.length),
                        of: formatNumber(n),
                      }),
                    ),
                  ),
                },
              )}
            </span>
          ))}
        </ResultRow>
      )}
    </ResultBlock>
  )
}

/** Groups of ideas alike enough to merge: the one kept, and the others. */
function DuplicatesCard({
  duplicates,
}: {
  duplicates: NonNullable<Results['duplicates']>
}) {
  const { t } = useTranslation()
  const shown = duplicates.groups.slice(0, LIST_ROWS)
  return (
    <ResultBlock
      status={t('assistant.ideas.duplicates.word')}
      title={
        duplicates.total === 0
          ? t('assistant.ideas.duplicates.none')
          : t('assistant.ideas.duplicates.title', counted(duplicates.total))
      }
    >
      {shown.map((g) => {
        const keep = g.ideas.find((i) => i.id === g.keepId) ?? g.ideas[0]
        const others = g.ideas.filter((i) => i !== keep)
        if (!keep) return null
        return (
          <IdeaLine
            key={g.keepId}
            idea={keep}
            pile={false}
            detail={t('assistant.ideas.duplicates.with', {
              ideas: formatList(
                others.map((i) => i.title || t('assistant.ideas.untitled')),
              ),
              alike: formatNumber(g.similarity, { maximumFractionDigits: 2 }),
            })}
          />
        )
      })}
      <More count={duplicates.groups.length - shown.length} />
    </ResultBlock>
  )
}

/**
 * Merges (CON-481): "2 groups merged · 4 ideas → 2", one row per kept idea.
 * No UNDO: a merge deletes, and nothing puts a deleted idea back.
 */
function MergedCard({ merged }: { merged: NonNullable<Results['merged']> }) {
  const { t } = useTranslation()
  const kept = merged.groups.length
  const before = merged.groups.reduce((n, g) => n + g.deleted + 1, 0)
  return (
    <ResultBlock
      status={t('assistant.ideas.merged.word')}
      title={t('assistant.ideas.merged.groups', counted(kept))}
      meta={t('assistant.ideas.merged.ideas', {
        before: formatNumber(before),
        after: formatNumber(kept),
      })}
    >
      {merged.groups.map((g) => (
        <IdeaLine
          key={g.idea.id}
          idea={g.idea}
          detail={t('assistant.ideas.merged.removed', counted(g.deleted))}
        />
      ))}
      {merged.stopped && (
        <ResultRow className="text-[12.5px] text-warning-ink">
          {t('assistant.ideas.stopped')}
        </ResultRow>
      )}
    </ResultBlock>
  )
}
