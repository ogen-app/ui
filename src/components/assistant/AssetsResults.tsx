import { Fragment } from 'react'
import { Link } from '@tanstack/react-router'
import { FileTextIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { applyScreenAction, useAssistantStore } from '@/stores/assistantStore'
import { counted, formatDate, formatList, formatNumber } from '@/lib/intl'
import { screenName } from '@/lib/assistantView'
import { subjectCampaignId } from '@/types/assistant'
import type {
  AnalysisLens,
  AnalysisRead,
  AssetComparison,
  AssetsAsk,
  AssetsResults as Results,
  CampaignFromAssets,
  ComparedClaim,
  SavedViewList,
  ThreadSubject,
  UndoState,
} from '@/types/assistant'
import { ResultBlock, ResultRow, SourcesLine, TextAction } from './blocks'
import { UndoAction, UndoNote, type ResultUndo } from './ResultCard'

/**
 * The assets pack's results (CON-460), each in the reply grammar: what a
 * question searched, what an analysis found, a comparison, a list's smart
 * groups, a campaign set up from assets. All are reads or done work, so none
 * is boxed. A follow-up that only reads (search wider, another lens) is sent
 * on the click; one that writes (analyse) fills the composer instead.
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

  const blocks = [
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
        campaignId={subjectCampaignId(subject)}
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

/**
 * Where an answer came from: one chip per passage cited, and — when the turn
 * searched only the asset on screen — a line saying so, with the way wider.
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
              <FileTextIcon
                aria-hidden
                className="size-3.5 shrink-0 text-tertiary-foreground"
              />
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
        <p className="flex items-baseline gap-2.5 border-t border-border pt-2.5 text-[12.5px] text-tertiary-foreground">
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

/** "Workspace lens · 6 Nov", or the lens alone before it has been read. */
function lensMeta(t: TFunction, lens: AnalysisLens): string {
  const date = lens.readAt
    ? formatDate(lens.readAt, { day: 'numeric', month: 'short' })
    : null
  return date
    ? t('assistant.assets.lens.readOn', { lens: lensName(t, lens), date })
    : lensName(t, lens)
}

const LENS_WORD: Record<string, string> = {
  ready: 'assistant.assets.analysis.word.ready',
  pending: 'assistant.assets.analysis.word.pending',
  running: 'assistant.assets.analysis.word.running',
  failed: 'assistant.assets.analysis.word.failed',
  skipped: 'assistant.assets.analysis.word.skipped',
  not_read: 'assistant.assets.analysis.word.notRead',
}

/**
 * What one lens found, or why it found nothing. The asset's other lenses are
 * offered one row each, never mixed into this one's reading.
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
  const ready = read.lens.status === 'ready'
  const word = t(
    (LENS_WORD[read.lens.status] ??
      'assistant.assets.analysis.word.notRead') as 'assistant.assets.analysis.word.ready',
  )
  const total =
    read.ideas.undecided + read.ideas.yes + read.ideas.later + read.ideas.no
  const lens = lensName(t, read.lens)
  return (
    <ResultBlock
      status={word}
      tone={ready ? 'neutral' : 'warning'}
      title={read.title}
      meta={lensMeta(t, read.lens)}
    >
      {ready && (read.gist || read.summary) && (
        <ResultRow>
          <p className="text-sm text-foreground">{read.gist || read.summary}</p>
        </ResultRow>
      )}
      {ready && read.keyPoints.length > 0 && (
        <ResultRow>
          <ul className="flex list-disc flex-col gap-1 pl-4 text-sm text-foreground">
            {read.keyPoints.slice(0, 3).map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
        </ResultRow>
      )}
      {ready && (
        <ResultRow className="flex items-baseline gap-3">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm text-foreground">
              {t('assistant.assets.analysis.ideas', counted(total))}
            </span>
            {total > 0 && (
              <span className="text-[12.5px] text-tertiary-foreground">
                {t('assistant.assets.analysis.ideasByVerdict', {
                  undecided: formatNumber(read.ideas.undecided),
                  yes: formatNumber(read.ideas.yes),
                  later: formatNumber(read.ideas.later),
                })}
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
              className="shrink-0 text-xs font-medium tracking-[0.03em] text-secondary-foreground hover:text-foreground"
            >
              {t('assistant.assets.analysis.openIdeas')}
            </Link>
          )}
        </ResultRow>
      )}
      {!ready && (
        <ResultRow className="flex items-baseline gap-3">
          <span className="min-w-0 flex-1 text-sm text-tertiary-foreground">
            {read.failureReason ||
              t('assistant.assets.analysis.notReadFor', { lens })}
          </span>
          {read.lens.status !== 'running' && read.lens.status !== 'pending' && (
            <TextAction
              disabled={disabled}
              onClick={() =>
                onPrefill(
                  t('assistant.assets.analysis.analysePrompt', { lens }),
                )
              }
            >
              {t('assistant.assets.analysis.analyse')}
            </TextAction>
          )}
        </ResultRow>
      )}
      {read.otherLenses.map((other, i) => (
        <ResultRow key={i} className="flex items-baseline gap-3">
          <span className="min-w-0 flex-1 text-sm text-foreground">
            {lensMeta(t, other)}
          </span>
          {other.status === 'ready' && (
            <TextAction
              disabled={disabled}
              onClick={() =>
                onAsk(
                  t('assistant.assets.analysis.showPrompt', {
                    lens: lensName(t, other),
                  }),
                )
              }
            >
              {t('assistant.assets.analysis.show')}
            </TextAction>
          )}
        </ResultRow>
      ))}
      {ready && (
        <SourcesLine
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

function Letters({ letters }: { letters: string[] }) {
  return (
    <>
      {letters.map((letter) => (
        <span
          key={letter}
          className="ml-1 border border-accent/20 px-1 font-mono text-[10.5px] text-accent"
        >
          {letter}
        </span>
      ))}
    </>
  )
}

/**
 * A comparison: what they all say, what only some say, where they disagree —
 * each claim lettered to its documents. The last row says which were read
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
  const fromPassages = compare.assets.filter((a) => a.from === 'passages')
  const groups: [string, ComparedClaim[], boolean][] = [
    [t('assistant.assets.compare.shared'), compare.shared, false],
    [t('assistant.assets.compare.partial'), compare.partial, false],
    [t('assistant.assets.compare.conflicts'), compare.conflicts, true],
  ]
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
      <ResultRow>
        <ul className="flex flex-col gap-0.5 text-[12.5px] text-tertiary-foreground">
          {compare.assets.map((a) => (
            <li key={a.id} className="flex items-baseline gap-1.5">
              <Letters letters={[a.letter]} />
              <span className="text-foreground">{a.title}</span>
            </li>
          ))}
        </ul>
      </ResultRow>
      {compare.summary && (
        <ResultRow>
          <p className="text-sm text-foreground">{compare.summary}</p>
        </ResultRow>
      )}
      {groups.map(([label, list, conflict]) =>
        list.map((claim, i) => (
          <ResultRow
            key={`${label}-${i}`}
            className="flex items-baseline gap-3"
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-medium text-foreground">
                {label}
                <Letters letters={claim.letters} />
              </span>
              <span className="text-[12.5px] text-tertiary-foreground">
                {claim.text}
              </span>
            </span>
            {conflict && (
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
        <ResultRow>
          <p className="text-[12.5px] text-tertiary-foreground">
            {t('assistant.assets.compare.fromPassages', {
              count: fromPassages.length,
              titles: formatList(fromPassages.map((a) => a.title)),
            })}
          </p>
        </ResultRow>
      )}
      {compare.skipped.length > 0 && (
        <ResultRow>
          <p className="text-[12.5px] text-tertiary-foreground">
            {t('assistant.assets.compare.skipped', {
              count: compare.skipped.length,
              titles: formatList(compare.skipped.map((a) => a.title)),
            })}
          </p>
        </ResultRow>
      )}
      {compare.grounding && <SourcesLine grounding={compare.grounding} />}
    </ResultBlock>
  )
}

/**
 * A list's smart groups, each with OPEN — the same screen change a turn's
 * `open_saved_view` makes. Inside a campaign it opens the campaign's list.
 */
function SavedViewsCard({
  t,
  views,
  campaignId,
}: {
  t: TFunction
  views: SavedViewList
  campaignId: string | undefined
}) {
  const screen =
    views.list === 'ideas'
      ? campaignId
        ? 'campaign.ideas'
        : 'ideas'
      : campaignId
        ? 'campaign.assets'
        : 'assets'
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
      {views.views.map((view) => (
        <ResultRow key={view.id} className="flex items-baseline gap-3">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm text-foreground">{view.name}</span>
            {(view.count !== undefined || view.shared) && (
              <span className="text-[12.5px] text-tertiary-foreground">
                {[
                  view.count !== undefined
                    ? t(
                        countKey as 'assistant.assets.views.countAssets',
                        counted(view.count),
                      )
                    : null,
                  view.shared ? t('assistant.assets.views.shared') : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            )}
          </span>
          <TextAction
            onClick={() =>
              void applyScreenAction({
                type: 'open_saved_view',
                screen,
                ...(campaignId ? { campaignId } : {}),
                savedViewId: view.id,
              })
            }
          >
            {t('assistant.assets.views.open')}
          </TextAction>
        </ResultRow>
      ))}
    </ResultBlock>
  )
}

/** The campaign set up from assets: what was made, OPEN, and UNDO. */
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
    .map((d) => (d ? formatDate(d, { day: 'numeric', month: 'short' }) : null))
    .filter(Boolean)
    .join(' – ')
  const undone = campaign.undoId && undo.states[campaign.undoId] === 'undone'
  return (
    <ResultBlock
      status={t('assistant.word.done')}
      title={campaign.name}
      meta={[campaign.type, range].filter(Boolean).join(' · ') || undefined}
      action={<UndoAction t={t} undoId={campaign.undoId} undo={undo} />}
    >
      <ResultRow className="flex items-baseline gap-3">
        <span className="min-w-0 flex-1 text-sm text-foreground">
          {t(
            'assistant.assets.campaign.sources',
            counted(campaign.assetIds.length),
          )}
        </span>
        {!undone && (
          <Link
            to="/campaigns/$campaignId"
            params={{ campaignId: campaign.campaignId }}
            className="shrink-0 text-xs font-medium tracking-[0.03em] text-foreground hover:text-secondary-foreground"
          >
            {t('assistant.assets.campaign.open')}
          </Link>
        )}
      </ResultRow>
      <UndoNote t={t} undoId={campaign.undoId} undo={undo} />
    </ResultBlock>
  )
}
