import { Fragment, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { FitSection } from '@/components/ideas/card/IdeaCardParts'
import { usePlatformCatalog } from '@/hooks/usePlatforms'
import { counted, formatList, formatNumber } from '@/lib/intl'
import { postStatusLabel } from '@/lib/postStatusLabel'
import { cn } from '@/lib/styles'
import { useAssistantStore } from '@/stores/assistantStore'
import type { PostStatus } from '@/types/posts'
import type {
  IdeaBrief,
  IdeasChanged,
  IdeasResults as Results,
  UndoState,
} from '@/types/assistant'
import { ResultBlock, ResultRow, SourcesLine } from './blocks'
import { UndoAction, UndoNote, type ResultUndo } from './ResultCard'

/** Rows a list card shows before it sums up the rest. */
const LIST_ROWS = 8

const LINK =
  'shrink-0 text-xs font-medium tracking-[0.03em] text-secondary-foreground hover:text-foreground'

/**
 * What the ideas pack read or changed this turn (CON-465/466), one card each:
 * the ideas found, the verdicts given, a move or delete, a compiled planned
 * post, the drafts written, why an idea fits, an edit, similar ideas, what a
 * selection shares, duplicates and a merge. Every change that can be put back
 * carries UNDO.
 */
export function IdeasResults({
  threadId,
  turnId,
  campaignId,
  results: r,
  undoStates,
}: {
  threadId: string
  turnId: string
  /** The thread's campaign: where its ideas and drafts open. */
  campaignId?: string
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
    ['found', r.found && <FoundCard found={r.found} campaignId={campaignId} />],
    [
      'decided',
      r.decided && (
        <ResultBlock
          status={t('assistant.ideas.decided.word')}
          title={verdictLine(t, r.decided.idea)}
          action={<UndoAction t={t} undoId={r.decided.undoId} undo={u} />}
        >
          <UndoNote t={t} undoId={r.decided.undoId} undo={u} />
        </ResultBlock>
      ),
    ],
    [
      'decidedMany',
      r.decidedMany && (
        <ChangedCard
          t={t}
          word={t('assistant.ideas.decided.word')}
          title={t('assistant.ideas.decided.many', counted(r.decidedMany.done))}
          change={r.decidedMany}
          undo={u}
        />
      ),
    ],
    [
      'moved',
      r.moved && (
        <ChangedCard
          t={t}
          word={t('assistant.ideas.moved.word')}
          title={t('assistant.ideas.moved.title', counted(r.moved.done))}
          change={r.moved}
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
    ['idea', r.idea && <IdeaCard read={r.idea} />],
    [
      'edited',
      r.edited && (
        <ResultBlock
          status={t('assistant.ideas.edited.word')}
          title={r.edited.idea.title || t('assistant.ideas.untitled')}
          meta={changedFields(t, r.edited.changed)}
          action={<UndoAction t={t} undoId={r.edited.undoId} undo={u} />}
        >
          <UndoNote t={t} undoId={r.edited.undoId} undo={u} />
        </ResultBlock>
      ),
    ],
    ['similar', r.similar && <SimilarCard similar={r.similar} />],
    ['common', r.common && <CommonCard common={r.common} />],
    [
      'duplicates',
      r.duplicates && <DuplicatesCard duplicates={r.duplicates} />,
    ],
    [
      'merged',
      r.merged && (
        <ResultBlock
          status={t('assistant.ideas.merged.word')}
          title={t('assistant.ideas.merged.title', {
            idea: r.merged.idea.title,
          })}
          meta={t('assistant.ideas.merged.removed', counted(r.merged.deleted))}
        />
      ),
    ],
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

/** An idea's pile, named as the Ideas list names it. */
function pileName(t: TFunction, verdict: IdeaBrief['verdict']): string {
  return verdict ? t(`ideas.verdict.${verdict}`) : t('ideas.pile.waiting')
}

function verdictLine(t: TFunction, idea: IdeaBrief): string {
  return t('assistant.ideas.decided.title', {
    pile: pileName(t, idea.verdict),
    idea: idea.title || t('assistant.ideas.untitled'),
  })
}

function IdeaRow({ idea, aside }: { idea: IdeaBrief; aside?: ReactNode }) {
  const { t } = useTranslation()
  return (
    <ResultRow className="flex items-baseline gap-3 text-sm">
      <span className="min-w-0 flex-1 truncate text-foreground">
        {idea.title || t('assistant.ideas.untitled')}
      </span>
      {aside}
      <span
        className={cn(
          'shrink-0 text-[12.5px]',
          idea.verdict === 'yes' ? 'text-accent' : 'text-tertiary-foreground',
        )}
      >
        {pileName(t, idea.verdict)}
      </span>
    </ResultRow>
  )
}

function IdeasLink({
  campaignId,
  children,
}: {
  campaignId?: string
  children: ReactNode
}) {
  return campaignId ? (
    <Link
      to="/campaigns/$campaignId/ideas"
      params={{ campaignId }}
      className={LINK}
    >
      {children}
    </Link>
  ) : (
    <Link to="/ideas" className={LINK}>
      {children}
    </Link>
  )
}

function FoundCard({
  found,
  campaignId,
}: {
  found: NonNullable<Results['found']>
  campaignId?: string
}) {
  const { t } = useTranslation()
  const shown = found.ideas.slice(0, LIST_ROWS)
  const more = Math.max(found.total, found.ideas.length) - shown.length
  return (
    <ResultBlock
      status={t('assistant.ideas.found.word')}
      title={
        found.total === 0
          ? t('assistant.ideas.found.none')
          : t('assistant.ideas.found.title', counted(found.total))
      }
      action={
        found.total > 0 ? (
          <IdeasLink campaignId={campaignId}>
            {t('assistant.ideas.open')}
          </IdeasLink>
        ) : undefined
      }
    >
      {shown.map((idea) => (
        <IdeaRow key={idea.id} idea={idea} />
      ))}
      {more > 0 && (
        <ResultRow className="text-[12.5px] text-tertiary-foreground">
          {t('assistant.ideas.more', counted(more))}
        </ResultRow>
      )}
    </ResultBlock>
  )
}

/** A bulk change: how many, how many it couldn't, why it stopped, UNDO. */
function ChangedCard({
  t,
  word,
  title,
  change,
  undo,
}: {
  t: TFunction
  word: string
  title: string
  change: IdeasChanged
  undo?: ResultUndo
}) {
  return (
    <ResultBlock
      status={word}
      title={title}
      action={<UndoAction t={t} undoId={change.undoId} undo={undo} />}
    >
      {change.failed > 0 && (
        <ResultRow className="text-[12.5px] text-warning">
          {t('assistant.ideas.failed', counted(change.failed))}
        </ResultRow>
      )}
      {change.stopped && (
        <ResultRow className="text-[12.5px] text-warning">
          {t('assistant.ideas.stopped')}
        </ResultRow>
      )}
      <UndoNote t={t} undoId={change.undoId} undo={undo} />
    </ResultBlock>
  )
}

/**
 * A planned post compiled from ideas (CON-449): theses, no body. UNDO deletes
 * it while it is as the assistant made it; once someone has changed it the
 * server answers 409, which the undo note words as "changed since".
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
  const platform = c.platformId ? resolve(c.platformId)?.name : undefined
  return (
    <div className="flex flex-col gap-2">
      <ResultBlock
        status={t('assistant.ideas.compiled.word')}
        title={c.title || t('assistant.ideas.untitled')}
        meta={[platform, t('assistant.ideas.compiled.from', counted(c.ideas))]
          .filter(Boolean)
          .join(' · ')}
        action={<UndoAction t={t} undoId={c.undoId} undo={undo} />}
      >
        <ResultRow className="flex items-baseline gap-3 text-[12.5px]">
          <span className="min-w-0 flex-1 text-tertiary-foreground">
            {t('assistant.ideas.compiled.planned')}
          </span>
          {c.campaignId && (
            <Link
              to="/campaigns/$campaignId/posts/$postId"
              params={{ campaignId: c.campaignId, postId: c.postId }}
              className={LINK}
            >
              {t('assistant.ideas.open')}
            </Link>
          )}
        </ResultRow>
        <UndoNote t={t} undoId={c.undoId} undo={undo} />
      </ResultBlock>
      <SourcesLine grounding={c.grounding} />
    </div>
  )
}

/**
 * The drafts written from ideas, each with whether it is grounded; the one
 * sources line names everything the grounded ones drew on, or says none was.
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
  const sources = [
    ...new Map(
      d.posts.flatMap((p) => p.grounding.sources).map((s) => [s.id, s]),
    ).values(),
  ]
  return (
    <div className="flex flex-col gap-2">
      <ResultBlock
        status={t('assistant.ideas.drafted.word')}
        title={t('assistant.ideas.drafted.title', counted(d.posts.length))}
        meta={t('assistant.ideas.drafted.unscheduled')}
      >
        {d.posts.map((p) => (
          <ResultRow key={p.postId} className="flex items-baseline gap-3">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm text-foreground">
                {p.title || t('assistant.ideas.untitled')}
              </span>
              <span
                className={cn(
                  'text-[12.5px]',
                  p.grounding.mode === 'grounded'
                    ? 'text-tertiary-foreground'
                    : 'text-warning',
                )}
              >
                {[
                  resolve(p.platformId)?.name,
                  p.grounding.mode === 'grounded'
                    ? t('assistant.ideas.drafted.grounded')
                    : t('assistant.ideas.drafted.notGrounded'),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </span>
            {campaignId && (
              <Link
                to="/campaigns/$campaignId/posts/$postId"
                params={{ campaignId, postId: p.postId }}
                className={LINK}
              >
                {t('assistant.ideas.open')}
              </Link>
            )}
          </ResultRow>
        ))}
        {d.warnings.length > 0 && (
          <ResultRow className="text-[12.5px] text-warning">
            {t('assistant.ideas.drafted.dropped', counted(d.warnings.length))}
          </ResultRow>
        )}
      </ResultBlock>
      {d.posts.length > 0 && (
        <SourcesLine
          grounding={{
            mode: sources.length > 0 ? 'grounded' : 'exploratory',
            sources,
          }}
        />
      )}
    </div>
  )
}

/**
 * Why an idea fits: its angle and rationale in its own words, the fit
 * breakdown as the Ideas list draws it, the page it came from, and the posts
 * already made from it.
 */
function IdeaCard({ read }: { read: NonNullable<Results['idea']> }) {
  const { t } = useTranslation()
  const fit = read.fit
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
  return (
    <ResultBlock
      status={t('assistant.ideas.idea.word')}
      title={read.idea.title || t('assistant.ideas.untitled')}
      meta={pileName(t, read.idea.verdict)}
    >
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
      {breakdown && (
        <div className="py-2.5">
          <FitSection
            idea={{
              fitScore: fit?.score ?? read.idea.fitScore,
              fitBreakdown: breakdown,
            }}
            scoredFor={null}
          />
        </div>
      )}
      {read.sourceAsset && (
        <ResultRow className="flex items-baseline gap-3 text-[12.5px]">
          <span className="min-w-0 flex-1">
            <span className="text-tertiary-foreground">
              {t('assistant.ideas.idea.from')}
            </span>{' '}
            <span className="text-foreground">{read.sourceAsset.title}</span>
            {read.analysisGist && (
              <span className="block text-tertiary-foreground">
                {read.analysisGist}
              </span>
            )}
          </span>
          <Link
            to="/assets/$assetId"
            params={{ assetId: read.sourceAsset.id }}
            className={LINK}
          >
            {t('assistant.ideas.open')}
          </Link>
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
    <ResultRow className="flex flex-col gap-0.5 text-sm">
      <span className="text-[12px] text-tertiary-foreground">{label}</span>
      <span className="text-foreground">{children}</span>
    </ResultRow>
  )
}

/** The fields an edit changed, in words; a plan field by its own name. */
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

/** Ideas like one, each with the server's reasons it matched. */
function SimilarCard({
  similar,
}: {
  similar: NonNullable<Results['similar']>
}) {
  const { t } = useTranslation()
  return (
    <ResultBlock
      status={t('assistant.ideas.similar.word')}
      title={
        similar.items.length === 0
          ? t('assistant.ideas.similar.none')
          : t('assistant.ideas.similar.title', counted(similar.items.length))
      }
      meta={similar.title || undefined}
    >
      {similar.items.slice(0, LIST_ROWS).map((s) => (
        <ResultRow key={s.idea.id} className="flex flex-col gap-0.5">
          <span className="flex items-baseline gap-3 text-sm">
            <span className="min-w-0 flex-1 truncate text-foreground">
              {s.idea.title || t('assistant.ideas.untitled')}
            </span>
            <span
              className={cn(
                'shrink-0 text-[12.5px]',
                s.idea.verdict === 'yes'
                  ? 'text-accent'
                  : 'text-tertiary-foreground',
              )}
            >
              {pileName(t, s.idea.verdict)}
            </span>
          </span>
          {s.why.length > 0 && (
            <span className="text-[12.5px] text-tertiary-foreground">
              {s.why.join(' · ')}
            </span>
          )}
        </ResultRow>
      ))}
    </ResultBlock>
  )
}

const SHARED_LABEL = {
  assets: 'assistant.ideas.common.assets',
  lenses: 'assistant.ideas.common.lenses',
  campaigns: 'assistant.ideas.common.campaigns',
  platforms: 'assistant.ideas.common.platforms',
  postTypes: 'assistant.ideas.common.postTypes',
  phases: 'assistant.ideas.common.phases',
  origins: 'assistant.ideas.common.origins',
  terms: 'assistant.ideas.common.terms',
} as const

/**
 * What a selection shares: per kind, each value and how many of the ideas
 * carry it — all of them in the foreground, some of them quieter.
 */
function CommonCard({ common }: { common: NonNullable<Results['common']> }) {
  const { t } = useTranslation()
  const { resolve } = usePlatformCatalog()
  const n = common.ideas.length
  const name = (kind: string, value: string, label: string) => {
    if (kind === 'platforms') return resolve(value)?.name ?? label
    if (kind === 'origins')
      return value === 'asset_analysis'
        ? t('assistant.ideas.common.fromAnalysis')
        : value === 'manual'
          ? t('assistant.ideas.common.byHand')
          : label
    return label
  }
  return (
    <ResultBlock
      status={t('assistant.ideas.common.word')}
      title={
        common.shared.length === 0
          ? t('assistant.ideas.common.nothing', counted(n))
          : t('assistant.ideas.common.title', counted(n))
      }
    >
      {common.shared.map((s) => (
        <ResultRow key={s.kind} className="flex flex-col gap-0.5 text-sm">
          <span className="text-[12px] text-tertiary-foreground">
            {t(
              SHARED_LABEL[s.kind as keyof typeof SHARED_LABEL] ??
                'assistant.ideas.common.other',
            )}
          </span>
          <span className="flex flex-wrap gap-x-2">
            {s.values.map((v) => (
              <span
                key={v.value}
                className={
                  v.ideaIds.length >= n
                    ? 'text-foreground'
                    : 'text-secondary-foreground'
                }
              >
                {t('assistant.ideas.common.value', {
                  value: name(s.kind, v.value, v.label),
                  count: v.ideaIds.length,
                  of: n,
                })}
              </span>
            ))}
          </span>
        </ResultRow>
      ))}
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
          <ResultRow key={g.keepId} className="flex flex-col gap-0.5">
            <span className="flex items-baseline gap-3 text-sm">
              <span className="min-w-0 flex-1 truncate text-foreground">
                {keep.title || t('assistant.ideas.untitled')}
              </span>
              <span className="shrink-0 font-mono text-[12px] text-tertiary-foreground">
                {formatNumber(g.similarity, { maximumFractionDigits: 2 })}
              </span>
            </span>
            <span className="text-[12.5px] text-tertiary-foreground">
              {t('assistant.ideas.duplicates.with', {
                ideas: formatList(
                  others.map((i) => i.title || t('assistant.ideas.untitled')),
                ),
              })}
            </span>
          </ResultRow>
        )
      })}
    </ResultBlock>
  )
}
