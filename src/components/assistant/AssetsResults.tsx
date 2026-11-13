import { Fragment } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Button } from '@/components/ui/button'
import { applyScreenAction, useAssistantStore } from '@/stores/assistantStore'
import { formatDuration } from '@/lib/assetList'
import { counted, formatDate, formatList, formatNumber } from '@/lib/intl'
import { screenName } from '@/lib/assistantView'
import { subjectCampaignId } from '@/types/assistant'
import type {
  AnalysisLens,
  AnalysisRead,
  AssetComparison,
  AssetsAsk,
  AssetsBankState,
  AssetsResults as Results,
  CampaignFromAssets,
  ComparedClaim,
  SavedViewList,
  ThreadSubject,
  UndoState,
} from '@/types/assistant'
import { AssetTypeBadge } from './AssetTypeBadge'
import {
  ResultBlock,
  ResultRow,
  SourcesLine,
  TEXT_ACTION_CLASS,
  TextAction,
} from './blocks'
import { UndoAction, UndoNote, type ResultUndo } from './ResultCard'
import { useSavedViewText } from './useSavedViewText'

/**
 * The assets pack's results (CON-460, drawn as CON-476 has them), each in the
 * reply grammar: the bank's state, what a question searched, what an analysis
 * found, a comparison, a list's smart groups, a campaign set up from assets.
 * All are reads or done work, so none is boxed. A follow-up that only reads
 * (search wider, another lens) is sent on the click; one that writes
 * (analyse, retry) fills the composer instead.
 */
export function AssetsResults({
  threadId,
  turnId,
  subject,
  results,
  undoStates,
  disabled,
}: {
  threadId: string
  turnId: string
  subject: ThreadSubject
  results: Results
  undoStates: Record<string, UndoState>
  disabled: boolean
}) {
  const { t } = useTranslation()
  const send = useAssistantStore((s) => s.send)
  const askFor = useAssistantStore((s) => s.askFor)
  const undo = useAssistantStore((s) => s.undo)
  const ask = (text: string) => void send(threadId, text)
  const prefill = (text: string) => askFor(threadId, text)
  const undoFor: ResultUndo = {
    states: undoStates,
    onUndo: (undoId) => void undo(threadId, turnId, undoId),
  }
  const campaignId = subjectCampaignId(subject)

  const blocks = [
    results.state && (
      <StateCard
        t={t}
        state={results.state}
        campaignId={campaignId}
        onPrefill={prefill}
        disabled={disabled}
      />
    ),
    results.ask && (
      <AskScope t={t} ask={results.ask} onAsk={ask} disabled={disabled} />
    ),
    results.analysis && (
      <AnalysisCard
        t={t}
        read={results.analysis}
        onAsk={ask}
        onPrefill={prefill}
        disabled={disabled}
      />
    ),
    results.compare && (
      <CompareCard
        t={t}
        compare={results.compare}
        onAsk={ask}
        disabled={disabled}
      />
    ),
    results.savedViews && (
      <SavedViewsCard
        t={t}
        views={results.savedViews}
        inCampaign={campaignId !== undefined}
      />
    ),
    results.campaign && (
      <CampaignCard t={t} campaign={results.campaign} undo={undoFor} />
    ),
  ].filter(Boolean)

  if (blocks.length === 0) return null
  return (
    <div className="flex flex-col gap-5">
      {blocks.map((block, i) => (
        <Fragment key={i}>{block}</Fragment>
      ))}
    </div>
  )
}

/** "Founder interview, Wedding packages and 10 more" — the first few, then how many. */
function namesLine(
  t: TFunction,
  names: { title: string }[],
  total: number,
): string | null {
  const titles = names.map((n) => n.title).filter(Boolean)
  if (titles.length === 0) return null
  const more = total - titles.length
  return more > 0
    ? t('assistant.assets.state.namesAndMore', {
        names: titles.join(', '),
        ...counted(more),
      })
    : formatList(titles)
}

/**
 * The bank at a glance (`readAssetsState`): how many documents and how many
 * analysed, then one row for each thing waiting on someone — analyses not
 * run, analyses that failed, ideas undecided — each only when there are any.
 */
function StateCard({
  t,
  state,
  campaignId,
  onPrefill,
  disabled,
}: {
  t: TFunction
  state: AssetsBankState
  campaignId: string | undefined
  onPrefill: (text: string) => void
  disabled: boolean
}) {
  const undecided = state.undecided.reduce((sum, lens) => sum + lens.ideas, 0)
  const lenses = state.undecided
    .filter((lens) => lens.ideas > 0)
    .map((lens) =>
      t('assistant.assets.state.lensIdeas', {
        lens: lens.campaignId
          ? lens.campaignName || t('assistant.untitledCampaign')
          : t('assistant.assets.lens.workspace'),
        ideas: formatNumber(lens.ideas),
      }),
    )
  const waiting = namesLine(t, state.waitingAssets, state.waiting)
  const failed = namesLine(t, state.failedAssets, state.analysisFailed)
  return (
    <ResultBlock
      status={t('assistant.assets.state.word')}
      title={t('assistant.assets.state.title', counted(state.total))}
      meta={t('assistant.assets.state.analysed', counted(state.analysed))}
    >
      {state.waiting > 0 && (
        <StateRow
          label={t('assistant.assets.state.waiting', counted(state.waiting))}
          sub={waiting}
          action={
            <TextAction
              disabled={disabled}
              onClick={() =>
                onPrefill(t('assistant.starter.analyseWaiting.text'))
              }
            >
              {t('assistant.assets.state.analyse')}
            </TextAction>
          }
        />
      )}
      {state.analysisFailed > 0 && (
        <StateRow
          label={t(
            'assistant.assets.state.failed',
            counted(state.analysisFailed),
          )}
          sub={failed}
          action={
            <TextAction
              disabled={disabled}
              onClick={() => onPrefill(t('assistant.starter.retryFailed.text'))}
            >
              {t('assistant.assets.state.retry')}
            </TextAction>
          }
        />
      )}
      {undecided > 0 && (
        <StateRow
          label={t('assistant.assets.state.undecided', counted(undecided))}
          sub={lenses.length > 0 ? lenses.join(' · ') : null}
          action={
            <Link
              to={campaignId ? '/campaigns/$campaignId/ideas' : '/ideas'}
              params={campaignId ? { campaignId } : undefined}
              className={TEXT_ACTION_CLASS}
            >
              {t('assistant.assets.state.triage')}
            </Link>
          }
        />
      )}
    </ResultBlock>
  )
}

function StateRow({
  label,
  sub,
  action,
}: {
  label: string
  sub: string | null
  action: React.ReactNode
}) {
  return (
    <ResultRow className="flex items-baseline gap-3">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm text-foreground">{label}</span>
        {sub && (
          <span className="text-[12.5px] text-secondary-foreground">{sub}</span>
        )}
      </span>
      <span className="shrink-0">{action}</span>
    </ResultRow>
  )
}

/**
 * Where an answer came from: one chip per passage cited, each with its kind's
 * mark, and — when the turn searched only the asset on screen — a line saying
 * so, with the way wider.
 */
function AskScope({
  t,
  ask,
  onAsk,
  disabled,
}: {
  t: TFunction
  ask: AssetsAsk
  onAsk: (text: string) => void
  disabled: boolean
}) {
  const oneAsset = new Set(ask.excerpts.map((x) => x.assetId)).size === 1
  const chips = ask.excerpts.filter((x) => x.pages || !oneAsset)
  if (chips.length === 0 && ask.scope !== 'open_asset') return null
  return (
    <div className="flex flex-col gap-2.5">
      {chips.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {chips.map((x, i) => (
            <li
              key={i}
              title={x.title}
              className="flex items-center gap-1.5 rounded-full border border-border py-0.5 pr-2.5 pl-2 text-xs text-foreground"
            >
              <AssetTypeBadge type={x.type} />
              {oneAsset
                ? x.pages
                : x.pages
                  ? t('assistant.assets.ask.chip', {
                      title: x.title,
                      pages: x.pages,
                    })
                  : x.title}
            </li>
          ))}
        </ul>
      )}
      {ask.scope === 'open_asset' && (
        <p className="flex items-baseline gap-2.5 border-t border-border pt-2.5 text-[12.5px] text-secondary-foreground">
          {t('assistant.assets.ask.onlyThis')}
          <TextAction
            disabled={disabled}
            onClick={() => onAsk(t('assistant.assets.ask.searchAllPrompt'))}
          >
            {t('assistant.assets.ask.searchAll')}
          </TextAction>
        </p>
      )}
    </div>
  )
}

function lensName(t: TFunction, lens: AnalysisLens): string {
  return lens.campaignId
    ? t('assistant.assets.lens.campaign', {
        name: lens.campaignName || t('assistant.untitledCampaign'),
      })
    : t('assistant.assets.lens.workspace')
}

/** Who a lens reads for, as the analyse button names it: a campaign, or the workspace. */
function lensOwner(t: TFunction, lens: AnalysisLens): string {
  return lens.campaignId
    ? lens.campaignName || t('assistant.untitledCampaign')
    : t('assistant.assets.lens.theWorkspace')
}

function shortDate(value: string | undefined): string | null {
  return value ? formatDate(value, { day: 'numeric', month: 'short' }) : null
}

/** "18 min", "24 pages" — the asset's length, when the server knows it. */
function lengthOf(t: TFunction, read: AnalysisRead): string | null {
  if (read.durationMs) return formatDuration(t, read.durationMs)
  if (read.pageCount)
    return t('content.extent.pages', { count: read.pageCount })
  return null
}

const LENS_WORD: Record<string, string> = {
  ready: 'assistant.assets.analysis.word.ready',
  pending: 'assistant.assets.analysis.word.pending',
  running: 'assistant.assets.analysis.word.running',
  failed: 'assistant.assets.analysis.word.failed',
  skipped: 'assistant.assets.analysis.word.skipped',
  not_read: 'assistant.assets.analysis.word.notRead',
}

/** The ideas by pile, in the Ideas list's own words; empty piles are left out. */
function pilesLine(t: TFunction, ideas: AnalysisRead['ideas']): string {
  return [
    ideas.undecided > 0 &&
      t('assistant.assets.analysis.pile.waiting', counted(ideas.undecided)),
    ideas.yes > 0 &&
      t('assistant.assets.analysis.pile.yes', counted(ideas.yes)),
    ideas.later > 0 &&
      t('assistant.assets.analysis.pile.later', counted(ideas.later)),
    ideas.no > 0 && t('assistant.assets.analysis.pile.no', counted(ideas.no)),
  ]
    .filter(Boolean)
    .join(' · ')
}

/**
 * What one lens found, or why it found nothing. The lens is in the status
 * word; the asset's other lenses are offered one row each, never mixed into
 * this one's reading. A lens that hasn't read the asset says which have, and
 * offers the one action that would make it read — bordered, because it is
 * the next thing to do rather than a link on a row.
 */
function AnalysisCard({
  t,
  read,
  onAsk,
  onPrefill,
  disabled,
}: {
  t: TFunction
  read: AnalysisRead
  onAsk: (text: string) => void
  onPrefill: (text: string) => void
  disabled: boolean
}) {
  const status = read.lens.status
  const ready = status === 'ready'
  const word = t(
    (LENS_WORD[status] ??
      'assistant.assets.analysis.word.notRead') as 'assistant.assets.analysis.word.ready',
  )
  const total =
    read.ideas.undecided + read.ideas.yes + read.ideas.later + read.ideas.no
  const lens = lensName(t, read.lens)
  const meta =
    [lengthOf(t, read), ready ? shortDate(read.lens.readAt) : null]
      .filter(Boolean)
      .join(' · ') || undefined
  const canAnalyse = status !== 'running' && status !== 'pending'
  const showOther = (other: AnalysisLens) =>
    onAsk(
      t('assistant.assets.analysis.showPrompt', { lens: lensName(t, other) }),
    )

  return (
    <ResultBlock
      status={
        ready ? t('assistant.assets.analysis.wordLens', { word, lens }) : word
      }
      tone={ready ? 'neutral' : 'warning'}
      title={read.title}
      meta={meta}
    >
      {ready && (read.gist || read.summary) && (
        <ResultRow>
          <p className="text-sm text-foreground">{read.gist || read.summary}</p>
        </ResultRow>
      )}
      {ready && (
        <ResultRow className="flex items-baseline gap-3">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm text-foreground">
              {t('assistant.assets.analysis.ideas', counted(total))}
            </span>
            {total > 0 && (
              <span className="text-[12.5px] text-secondary-foreground">
                {pilesLine(t, read.ideas)}
              </span>
            )}
          </span>
          {total > 0 && (
            <Link
              to={
                read.lens.campaignId ? '/campaigns/$campaignId/ideas' : '/ideas'
              }
              params={
                read.lens.campaignId
                  ? { campaignId: read.lens.campaignId }
                  : undefined
              }
              search={{ source_asset: read.assetId } as never}
              className={`shrink-0 ${TEXT_ACTION_CLASS}`}
            >
              {t('assistant.assets.analysis.openIdeas')}
            </Link>
          )}
        </ResultRow>
      )}
      {ready &&
        read.otherLenses.map((other, i) => (
          <ResultRow key={i} className="flex items-baseline gap-3">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm text-foreground">
                {lensName(t, other)}
              </span>
              <span className="text-[12.5px] text-secondary-foreground">
                {[
                  t(
                    'assistant.assets.analysis.lensIdeas',
                    counted(other.ideaCount),
                  ),
                  other.readAt &&
                    t('assistant.assets.analysis.readOn', {
                      date: shortDate(other.readAt),
                    }),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </span>
            {other.status === 'ready' && (
              <TextAction disabled={disabled} onClick={() => showOther(other)}>
                {t('assistant.assets.analysis.show')}
              </TextAction>
            )}
          </ResultRow>
        ))}
      {!ready && (
        <NotReadRows
          t={t}
          read={read}
          lens={lens}
          disabled={disabled}
          onShow={showOther}
        />
      )}
      {!ready && canAnalyse && (
        <div className="pt-3">
          <Button
            variant="outline"
            size="sm"
            className="rounded-none font-semibold tracking-[0.06em]"
            disabled={disabled}
            onClick={() =>
              onPrefill(t('assistant.assets.analysis.analysePrompt', { lens }))
            }
          >
            {t('assistant.assets.analysis.analyseFor', {
              owner: lensOwner(t, read.lens),
            })}
          </Button>
        </div>
      )}
      {ready && (
        <SourcesLine
          label={t('assistant.assets.analysis.readFrom')}
          grounding={{
            mode: 'grounded',
            sources: [
              {
                id: read.assetId,
                title: t('assistant.assets.analysis.analysisOf', {
                  title: read.title,
                }),
              },
            ],
          }}
        />
      )}
    </ResultBlock>
  )
}

/**
 * Why a lens has nothing: where another lens has read the asset, that reading
 * is the row ("Read for the workspace on 2 Nov"), with this lens's absence
 * under it; otherwise the failure, or the absence alone.
 */
function NotReadRows({
  t,
  read,
  lens,
  disabled,
  onShow,
}: {
  t: TFunction
  read: AnalysisRead
  lens: string
  disabled: boolean
  onShow: (other: AnalysisLens) => void
}) {
  const absent =
    read.failureReason || t('assistant.assets.analysis.notReadFor', { lens })
  const others = read.otherLenses.filter((o) => o.status === 'ready')
  if (others.length === 0) {
    return (
      <ResultRow>
        <span className="text-sm text-secondary-foreground">{absent}</span>
      </ResultRow>
    )
  }
  return (
    <>
      {others.map((other, i) => {
        const date = shortDate(other.readAt)
        const owner = lensOwner(t, other)
        return (
          <ResultRow key={i} className="flex items-baseline gap-3">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm text-foreground">
                {date
                  ? t('assistant.assets.analysis.readForOn', { owner, date })
                  : t('assistant.assets.analysis.readFor', { owner })}
              </span>
              {i === 0 && (
                <span className="text-[12.5px] text-secondary-foreground">
                  {absent}
                </span>
              )}
            </span>
            <TextAction disabled={disabled} onClick={() => onShow(other)}>
              {t('assistant.assets.analysis.showThat')}
            </TextAction>
          </ResultRow>
        )
      })}
    </>
  )
}

function Letters({ letters }: { letters: string[] }) {
  return (
    <>
      {letters.map((letter) => (
        <span
          key={letter}
          className="ml-1 border border-accent/20 px-1 font-mono text-[10.5px] text-accent-ink"
        >
          {letter}
        </span>
      ))}
    </>
  )
}

/**
 * A comparison: what they all say, what only some say, where they disagree —
 * each claim lettered to its documents, and the letters tied to the names on
 * the sources line. A summary of one document carries no letters at all: there
 * is nothing to tell apart. The note under the claims says which were read
 * from passages, because no analysis existed for the lens.
 */
function CompareCard({
  t,
  compare,
  onAsk,
  disabled,
}: {
  t: TFunction
  compare: AssetComparison
  onAsk: (text: string) => void
  disabled: boolean
}) {
  const lettered = compare.assets.length > 1
  const fromPassages = compare.assets.filter((a) => a.from === 'passages')
  const label = (kind: 'shared' | 'partial', claim: ComparedClaim) =>
    kind === 'shared'
      ? t('assistant.assets.compare.shared', counted(claim.letters.length))
      : t('assistant.assets.compare.partial', counted(claim.letters.length))
  const groups: [string, ComparedClaim[], (c: ComparedClaim) => string][] = [
    ['shared', compare.shared, (c) => label('shared', c)],
    ['partial', compare.partial, (c) => label('partial', c)],
    [
      'conflicts',
      compare.conflicts,
      () => t('assistant.assets.compare.conflicts'),
    ],
  ]
  const letters = Object.fromEntries(
    compare.assets.map((a) => [a.id, a.letter]),
  )
  return (
    <ResultBlock
      status={
        compare.mode === 'summarise'
          ? t('assistant.assets.compare.wordSummarised')
          : t('assistant.assets.compare.wordCompared')
      }
      title={t(
        'assistant.assets.compare.title',
        counted(compare.assets.length),
      )}
    >
      {compare.summary && (
        <ResultRow>
          <p className="text-sm text-foreground">{compare.summary}</p>
        </ResultRow>
      )}
      {groups.map(([kind, list, labelOf]) =>
        list.map((claim, i) => (
          <ResultRow key={`${kind}-${i}`} className="flex items-baseline gap-3">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm text-foreground">
                {labelOf(claim)}
                {lettered && <Letters letters={claim.letters} />}
              </span>
              <span className="text-[12.5px] text-secondary-foreground">
                {claim.text}
              </span>
            </span>
            {kind === 'conflicts' && (
              <TextAction
                disabled={disabled}
                onClick={() =>
                  onAsk(
                    t('assistant.assets.compare.askWhichPrompt', {
                      claim: claim.text,
                    }),
                  )
                }
              >
                {t('assistant.assets.compare.askWhich')}
              </TextAction>
            )}
          </ResultRow>
        )),
      )}
      {fromPassages.length > 0 && (
        <p className="border-t border-border pt-2.5 pb-2.5 text-[12.5px] text-secondary-foreground">
          {t('assistant.assets.compare.fromPassages', {
            count: fromPassages.length,
            titles: formatList(fromPassages.map((a) => a.title)),
          })}
        </p>
      )}
      {compare.skipped.length > 0 && (
        <ResultRow>
          <p className="text-[12.5px] text-secondary-foreground">
            {t('assistant.assets.compare.skipped', {
              count: compare.skipped.length,
              titles: formatList(compare.skipped.map((a) => a.title)),
            })}
          </p>
        </ResultRow>
      )}
      {compare.missing > 0 && (
        <ResultRow>
          <p className="text-[12.5px] text-warning-ink">
            {t('assistant.assets.compare.missing', counted(compare.missing))}
          </p>
        </ResultRow>
      )}
      {compare.grounding && (
        <SourcesLine
          grounding={compare.grounding}
          letters={lettered ? letters : undefined}
        />
      )}
    </ResultBlock>
  )
}

/**
 * A list's smart groups, each named by the filter it stands for, with OPEN —
 * the same screen change a turn's `open_saved_view` makes. Smart groups live
 * on the workspace's lists only, so OPEN always goes there; inside a campaign
 * the card says it is leaving.
 */
function SavedViewsCard({
  t,
  views,
  inCampaign,
}: {
  t: TFunction
  views: SavedViewList
  inCampaign: boolean
}) {
  const sentence = useSavedViewText()
  const countKey =
    views.list === 'ideas'
      ? 'assistant.assets.views.countIdeas'
      : 'assistant.assets.views.countAssets'
  return (
    <ResultBlock
      status={t('assistant.assets.views.word')}
      title={
        views.views.length === 0
          ? t('assistant.assets.views.none', {
              list: screenName(t, views.list),
            })
          : t('assistant.assets.views.title', {
              ...counted(views.views.length),
              list: screenName(t, views.list),
            })
      }
    >
      {views.views.map((view) => {
        const sub =
          sentence(views.list, view.filter) ??
          (view.count !== undefined
            ? t(
                countKey as 'assistant.assets.views.countAssets',
                counted(view.count),
              )
            : null)
        return (
          <ResultRow key={view.id} className="flex items-baseline gap-3">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm text-foreground">{view.name}</span>
              {sub && (
                <span className="text-[12.5px] text-secondary-foreground">
                  {sub}
                </span>
              )}
            </span>
            <TextAction
              onClick={() =>
                void applyScreenAction({
                  type: 'open_saved_view',
                  screen: views.list,
                  savedViewId: view.id,
                  savedViewName: view.name,
                })
              }
            >
              {t('assistant.assets.views.open')}
            </TextAction>
          </ResultRow>
        )
      })}
      {inCampaign && views.views.length > 0 && (
        <p className="border-t border-border pt-2.5 text-[12.5px] text-secondary-foreground">
          {t('assistant.assets.views.workspaceOnly', {
            list: screenName(t, views.list),
          })}
        </p>
      )}
    </ResultBlock>
  )
}

/** The campaign set up from assets: what was made, its window, its sources, OPEN and UNDO. */
function CampaignCard({
  t,
  campaign,
  undo,
}: {
  t: TFunction
  campaign: CampaignFromAssets
  undo: ResultUndo
}) {
  const range = [campaign.startDate, campaign.endDate]
    .map((d) => shortDate(d))
    .filter(Boolean)
    .join(' – ')
  const undone = campaign.undoId && undo.states[campaign.undoId] === 'undone'
  return (
    <ResultBlock
      status={t('assistant.word.done')}
      title={campaign.name}
      meta={campaign.type || undefined}
      action={<UndoAction t={t} undoId={campaign.undoId} undo={undo} />}
    >
      {range && (
        <ResultRow>
          <span className="text-sm text-foreground">{range}</span>
        </ResultRow>
      )}
      <ResultRow className="flex items-baseline gap-3">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm text-foreground">
            {t(
              'assistant.assets.campaign.sources',
              counted(campaign.assetIds.length),
            )}
          </span>
          <span className="text-[12.5px] text-secondary-foreground">
            {t('assistant.assets.campaign.sourcesNote')}
          </span>
        </span>
        {!undone && (
          <Link
            to="/campaigns/$campaignId"
            params={{ campaignId: campaign.campaignId }}
            className={`shrink-0 ${TEXT_ACTION_CLASS}`}
          >
            {t('assistant.assets.campaign.open')}
          </Link>
        )}
      </ResultRow>
      <UndoNote t={t} undoId={campaign.undoId} undo={undo} />
    </ResultBlock>
  )
}
