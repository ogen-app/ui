import { useMemo, useState, type ReactNode } from 'react'
import type { TFunction } from 'i18next'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { AiIdeaIcon } from '@hugeicons/core-free-icons'
import { useTranslation } from 'react-i18next'
import {
  CaretDownIcon,
  CaretRightIcon,
  LightbulbIcon,
} from '@phosphor-icons/react'
import { FitTrack } from '@/components/content/FitTrack'
import {
  AnswerGroup,
  FitSection,
  Part,
  VerdictMark,
} from '@/components/ideas/card/IdeaCardParts'
import { IDEA_ROW, pileOf } from '@/components/ideas/card/ideaRow'
import { useAnswerIdea } from '@/hooks/useAssetAnalyses'
import { useIdeaDistill } from '@/hooks/useIdeaDistill'
import { useIdeaClock } from '@/hooks/useIdeaClock'
import { cn } from '@/lib'
import { mergePageRefs, pageSpan, parseIdeaNote } from '@/lib/assetAnalysis'
import { VERDICT_ICON } from '@/components/content/verdictIcons'
import { VERDICT_ORDER, type VerdictKey } from '@/lib/assetList'
import { byFit } from '@/lib/ideaFit'
import { countIdeas, isWaiting, type Idea } from '@/lib/ideas'
import { ideaFromWire } from '@/services/api/ideas'
import type { AssetAnalysis } from '@/types/assetAnalysis'
import { DistillMoreIdeas } from './DistillMoreIdeas'
import { SourceChip } from './SourceChip'

/** How many ideas show before "Show N more". */
const FIRST_IDEAS = 5

/**
 * The ideas one lens distilled (CON-364), in the Assets list card's language
 * (CON-387): best fit first, each with its score on a track, its title, its
 * verdict as a mark and its note — so an idea looks the same here as on the
 * row that led to it.
 *
 * A row opens in place to the whole of it: the angle, why it fits, why it
 * scores what it does (CON-385's breakdown), where in the source it comes
 * from — and then the answer. **Triage happens here too now**: the opened row
 * ends in Yes / Not now / No, the inbox's three verdicts on the inbox's rules,
 * so an idea can be answered beside the source it came from instead of in a
 * list that has lost it. An idea someone said no to is left out unless the No
 * pile is chosen — it was answered, and this list is what is worth making.
 *
 * The piles above the list (CON-370) narrow it to one verdict. `?verdict=`
 * picks one, which is where the Assets list's verdict pill sends a click;
 * choosing it again shows everything still worth making.
 *
 * The list ends in a way to ask for more (CON-398):
 * ideas that land while the page is open carry a teal dot, and a chip beside
 * the piles narrows the list to them until the page is left.
 */
export function AssetIdeaList({
  lens,
  spreadsheet = false,
}: {
  lens: AssetAnalysis
  /**
   * A spreadsheet's ideas quote its figures, and a workbook is usually
   * internal data — so the footnote says to check before posting.
   */
  spreadsheet?: boolean
}) {
  const { t } = useTranslation()
  const [showAll, setShowAll] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const distill = useIdeaDistill(lens.asset_id, lens.campaign_id)
  const [freshOnly, setFreshOnly] = useState(false)
  const { verdict: asked } = useSearch({ strict: false })
  const navigate = useNavigate()
  // Best fit first, as the Assets list card and the server's `next_idea` order
  // them, so the first idea here is the one the list named.
  const all = useMemo(
    () => [...lens.ideas].sort(byFit).map(ideaFromWire),
    [lens.ideas],
  )
  // One clock for the counts and the filter, moved on when a postponed idea
  // comes due — so the two never disagree about which pile it is in.
  const now = useIdeaClock(all)
  const counts = useMemo(() => countIdeas(all, now), [all, now])
  // A pile this reading has none of (a link from another lens) shows them all.
  const pile = asked && counts[asked] > 0 ? asked : undefined
  // The ideas this visit watched arrive: the dot on their rows, and the chip.
  const { fresh: freshRuns } = distill
  const isFresh = (idea: Idea) =>
    !!idea.distillRunId && freshRuns.has(idea.distillRunId)
  const freshCount = all.filter(
    (idea) => isFresh(idea) && idea.verdict !== 'no',
  ).length
  const onlyFresh = freshOnly && freshCount > 0
  const ideas = useMemo(() => {
    // The opened idea stays where it is whatever it has just been answered —
    // it leaves the pile when it is closed, not from under the pointer.
    const inPile = (idea: Idea) => {
      if (onlyFresh) return isFresh(idea) && idea.verdict !== 'no'
      if (!pile) return idea.verdict !== 'no'
      return pile === 'waiting'
        ? isWaiting(idea, now)
        : idea.verdict === pile && !isWaiting(idea, now)
    }
    return all.filter((idea) => idea.id === open || inPile(idea))
    // `isFresh` reads `freshRuns`, which is listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, pile, now, open, onlyFresh, freshRuns])
  const choosePile = (next: VerdictKey) => {
    setFreshOnly(false)
    void navigate({
      to: '.',
      search: (prev) => ({
        ...prev,
        verdict: next === pile ? undefined : next,
      }),
      replace: true,
    })
  }
  const shown = showAll ? ideas : ideas.slice(0, FIRST_IDEAS)
  const hidden = ideas.length - shown.length
  const forCampaign = lens.campaign_id !== null && lens.campaign_name

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-4">
          {/* The count alone: the line under it names the campaign. Regular
              weight — the size carries it, and the list's titles are the
              heaviest type in the column. */}
          <h3 className="flex items-center gap-2.5 text-[22px] leading-8 font-normal text-foreground">
            <HugeiconsIcon
              icon={AiIdeaIcon}
              size={26}
              strokeWidth={1.5}
              aria-hidden
              className="shrink-0 text-accent"
            />
            {ideas.length === 0
              ? t('assetInsights.ideas.heading')
              : t('assetInsights.ideas.count', { count: ideas.length })}
          </h3>
          {ideas.length > 0 && (
            <InboxLink lens={lens} label={t('assetInsights.ideas.viewAll')} />
          )}
        </div>
        {ideas.length > 0 && (
          <p className="text-sm text-secondary-foreground">
            {forCampaign
              ? t('assetInsights.ideas.waitingFor', {
                  campaign: lens.campaign_name,
                })
              : t('assetInsights.ideas.waiting')}
            {spreadsheet && ` ${t('assetInsights.sheet.footnote')}`}
          </p>
        )}
        {all.length > 0 && (
          <Piles
            counts={counts}
            active={onlyFresh ? undefined : pile}
            onChoose={choosePile}
            trailing={
              freshCount > 0 && (
                <FreshChip
                  count={freshCount}
                  active={onlyFresh}
                  onToggle={() => setFreshOnly(!onlyFresh)}
                />
              )
            }
          />
        )}
      </header>

      {ideas.length === 0 ? (
        <div className="flex items-start gap-3 py-2">
          <LightbulbIcon
            className="mt-0.5 size-5 shrink-0 text-tertiary-foreground"
            aria-hidden
          />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">
              {t('assetInsights.ideas.emptyTitle')}
            </p>
            <p className="text-sm text-secondary-foreground">
              {t('assetInsights.ideas.emptyBody')}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Hung out by the rows' own padding, so the score tracks line up
              with the heading rather than sitting a step inside it. */}
          <ul className="-mx-3 flex flex-col">
            {shown.map((idea, index) => (
              <IdeaRow
                key={idea.id}
                index={index}
                idea={idea}
                lens={lens}
                now={now}
                expanded={open === idea.id}
                fresh={isFresh(idea)}
                onToggle={() => setOpen(open === idea.id ? null : idea.id)}
              />
            ))}
          </ul>
          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="cursor-pointer self-start text-sm font-medium text-accent hover:underline"
            >
              {t('assetInsights.ideas.showMore', { count: hidden })}
            </button>
          )}
        </>
      )}
      <DistillMoreIdeas lens={lens} distill={distill} />
    </section>
  )
}

/**
 * The ideas by verdict, labelled — the Assets list's pill with room for the
 * words (CON-370). A verdict with none is left out.
 */
function Piles({
  counts,
  active,
  onChoose,
  trailing,
}: {
  counts: Record<VerdictKey, number>
  active: VerdictKey | undefined
  onChoose: (pile: VerdictKey) => void
  /** After the piles, on their line — the new ideas' chip (CON-398). */
  trailing?: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {VERDICT_ORDER.filter((v) => counts[v] > 0).map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={active === v}
          aria-label={`${counts[v]} ${t(`assetInsights.ideas.pile.${v}`)}`}
          onClick={() => onChoose(v)}
          className={cn(
            'flex h-7 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs tabular-nums transition-colors',
            active === v
              ? 'border-accent bg-accent/10 text-foreground'
              : 'border-quaternary text-secondary-foreground hover:border-tertiary-foreground hover:text-foreground',
          )}
        >
          <HugeiconsIcon
            icon={VERDICT_ICON[v]}
            size={14}
            strokeWidth={1.8}
            aria-hidden
            className={cn(
              v === 'waiting' && 'text-accent',
              v === 'yes' && 'text-positive',
            )}
          />
          <span
            className={cn(
              'font-semibold',
              v === 'waiting' ? 'text-accent' : 'text-foreground',
            )}
          >
            {counts[v]}
          </span>
          {t(`assetInsights.ideas.pile.${v}`)}
        </button>
      ))}
      {trailing}
    </div>
  )
}

/**
 * The ideas that landed while the page was open (CON-398), as a pile of their
 * own: the piles' shape, in the accent the row's dot is drawn in. It narrows
 * the list the way a pile does and gives way when a pile is chosen.
 */
function FreshChip({
  count,
  active,
  onToggle,
}: {
  count: number
  active: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={t('assetInsights.distill.freshLabel', { count })}
      onClick={onToggle}
      className={cn(
        'flex h-7 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-semibold tabular-nums text-accent transition-colors',
        active
          ? 'border-accent bg-accent/10'
          : 'border-transparent bg-accent/10 hover:border-accent',
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-accent" />
      {t('assetInsights.distill.fresh', { count })}
    </button>
  )
}

/**
 * One idea. No box: a pale rule between rows, inset by the row's padding, and
 * stepping aside for a row that is hovered or open, which take one pale fill.
 * What tells the opened row from a hovered one is its title turning semibold
 * — with the turned caret and everything under it.
 */
function IdeaRow({
  index,
  idea,
  lens,
  now,
  expanded,
  fresh = false,
  onToggle,
}: {
  /** Its place in the list — rows arrive one after another, not at once. */
  index: number
  idea: Idea
  lens: AssetAnalysis
  now: Date
  expanded: boolean
  /** It landed from a request for more ideas while this page was open. */
  fresh?: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const { angle, rationale, sources: cited } = parseIdeaNote(idea.note)
  // Pages sorted and merged ("pp. 55–59", not "pp. 57–59, pp. 55–57").
  const sources = mergePageRefs(cited)
  const Caret = expanded ? CaretDownIcon : CaretRightIcon
  return (
    <li
      data-open={expanded || undefined}
      style={{ animationDelay: `${Math.min(index, 9) * 40}ms` }}
      className={cn(
        IDEA_ROW,
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:fill-mode-both',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="grid w-full cursor-pointer grid-cols-[4rem_minmax(0,1fr)_16px_16px] gap-x-3 px-3 py-3.5 text-left"
      >
        <span className="flex h-6 items-center">
          <FitTrack score={idea.fitScore} />
        </span>
        <span
          className={cn(
            'text-sm/6 text-foreground',
            (expanded || fresh) && 'font-semibold',
          )}
        >
          {fresh && (
            // Before the title, inside its column, so the titles keep their line.
            <span
              role="img"
              aria-label={t('assetInsights.distill.freshMark')}
              className="mr-2 inline-block size-1.5 -translate-y-0.5 rounded-full bg-accent align-middle"
            />
          )}
          {idea.title}
        </span>
        <VerdictMark verdict={pileOf(idea, now)} />
        <Caret className="mt-1 size-4 shrink-0 text-secondary-foreground" />
        {angle && !expanded && (
          <span className="col-span-2 col-start-2 mt-0.5 line-clamp-2 text-[13px]/[19px] text-secondary-foreground">
            {angle}
          </span>
        )}
      </button>
      {expanded && (
        // In the title's column: the row's padding, the track and its gap.
        <div className="flex flex-col gap-3 pr-3 pb-4 pl-[88px]">
          {angle && (
            <p className="text-sm leading-6 text-foreground">{angle}</p>
          )}
          {rationale && (
            <p className="whitespace-pre-line text-sm leading-6 text-secondary-foreground">
              {rationale}
            </p>
          )}
          <FitSection idea={idea} scoredFor={scoredFor(t, idea, lens)} />
          {sources.length > 0 && (
            <Reference sources={sources} citedBy={idea.title} />
          )}
          <Answer idea={idea} lens={lens} now={now} />
        </div>
      )}
    </li>
  )
}

/**
 * Which reading the score is for. Usually the one on screen; an idea filed
 * into another campaign keeps the score it was given, and says so rather than
 * passing it off as this reading's.
 */
function scoredFor(
  t: TFunction,
  idea: Idea,
  lens: AssetAnalysis,
): string | null {
  const breakdown = idea.fitBreakdown
  if (!breakdown) return null
  if (breakdown.lens === 'workspace')
    return lens.campaign_id === null
      ? t('assetInsights.ideaFit.forWorkspace')
      : t('assetInsights.ideaFit.scoredWorkspace')
  if (breakdown.campaign_id === lens.campaign_id && lens.campaign_name)
    return t('assetInsights.ideaFit.forCampaign', {
      campaign: lens.campaign_name,
    })
  return t('assetInsights.ideaFit.scoredOther')
}

/** Where in the source the idea comes from, as chips that cite or play. */
function Reference({
  sources,
  citedBy,
}: {
  sources: string[]
  citedBy: string
}) {
  const { t } = useTranslation()
  const span = pageSpan(sources)
  const aside = !span
    ? null
    : span.from === span.to
      ? t('assetInsights.reference.page', { from: span.from })
      : t('assetInsights.reference.pages', { from: span.from, to: span.to })
  return (
    <Part heading={t('assetInsights.reference.heading')} aside={aside}>
      <span className="flex flex-wrap gap-1.5">
        {sources.map((s) => (
          <SourceChip key={s} label={s} citedBy={citedBy} />
        ))}
      </span>
    </Part>
  )
}

/** The answer group, ending in the way to this reading's Ideas page. */
function Answer({
  idea,
  lens,
  now,
}: {
  idea: Idea
  lens: AssetAnalysis
  now: Date
}) {
  const { t } = useTranslation()
  // While an answer is on its way the controls hold still: a second one
  // racing it could land first (see `useAnswerIdea`).
  const { answer, pending } = useAnswerIdea(lens.asset_id, idea.id)
  return (
    <AnswerGroup
      idea={idea}
      now={now}
      onAnswer={answer}
      pending={pending}
      trailing={<InboxLink lens={lens} label={t('assetInsights.ideas.open')} />}
    />
  )
}

/**
 * The Ideas page these rows live on: the campaign's for a campaign lens, whose
 * ideas are filed to it, and the workspace's otherwise.
 */
function InboxLink({ lens, label }: { lens: AssetAnalysis; label: string }) {
  const className = 'text-accent hover:underline'
  return lens.campaign_id ? (
    <Link
      to="/campaigns/$campaignId/ideas"
      params={{ campaignId: lens.campaign_id }}
      className={cn(className, 'text-sm font-medium')}
    >
      {label}
    </Link>
  ) : (
    <Link to="/ideas" className={cn(className, 'text-sm font-medium')}>
      {label}
    </Link>
  )
}
