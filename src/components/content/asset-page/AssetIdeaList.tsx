import { useMemo, useState } from 'react'
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
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FitTrack } from '@/components/content/FitTrack'
import { VERDICT_ICON } from '@/components/content/verdictIcons'
import { HORIZON_KEYS, VERDICTS } from '@/components/ideas/verdicts'
import { useAnswerIdea } from '@/hooks/useAssetAnalyses'
import { useIdeaClock } from '@/hooks/useIdeaClock'
import { cn } from '@/lib'
import { mergePageRefs, pageSpan, parseIdeaNote } from '@/lib/assetAnalysis'
import { VERDICT_ORDER, type VerdictKey } from '@/lib/assetList'
import {
  FIT_CRITERIA,
  byFit,
  fitLevelStrength,
  fitRows,
  type FitBreakdown,
} from '@/lib/ideaFit'
import {
  POSTPONE_HORIZONS,
  countIdeas,
  isWaiting,
  postponeUntil,
  type Idea,
  type IdeaVerdict,
} from '@/lib/ideas'
import { formatDate } from '@/lib/intl'
import { ideaFromWire } from '@/services/api/ideas'
import type { AssetAnalysis } from '@/types/assetAnalysis'
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
  const ideas = useMemo(() => {
    // The opened idea stays where it is whatever it has just been answered —
    // it leaves the pile when it is closed, not from under the pointer.
    const inPile = (idea: Idea) => {
      if (!pile) return idea.verdict !== 'no'
      return pile === 'waiting'
        ? isWaiting(idea, now)
        : idea.verdict === pile && !isWaiting(idea, now)
    }
    return all.filter((idea) => idea.id === open || inPile(idea))
  }, [all, pile, now, open])
  const choosePile = (next: VerdictKey) =>
    void navigate({
      to: '.',
      search: (prev) => ({
        ...prev,
        verdict: next === pile ? undefined : next,
      }),
      replace: true,
    })
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
          <Piles counts={counts} active={pile} onChoose={choosePile} />
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
}: {
  counts: Record<VerdictKey, number>
  active: VerdictKey | undefined
  onChoose: (pile: VerdictKey) => void
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
    </div>
  )
}

/** Which pile an idea sits in today: a postponed one whose day has come is a question again. */
function pileOf(idea: Idea, now: Date): VerdictKey {
  return isWaiting(idea, now) ? 'waiting' : (idea.verdict ?? 'waiting')
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
  onToggle,
}: {
  /** Its place in the list — rows arrive one after another, not at once. */
  index: number
  idea: Idea
  lens: AssetAnalysis
  now: Date
  expanded: boolean
  onToggle: () => void
}) {
  const { angle, rationale, sources: cited } = parseIdeaNote(idea.note)
  // Pages sorted and merged ("pp. 55–59", not "pp. 57–59, pp. 55–57").
  const sources = mergePageRefs(cited)
  const Caret = expanded ? CaretDownIcon : CaretRightIcon
  return (
    <li
      data-open={expanded || undefined}
      style={{ animationDelay: `${Math.min(index, 9) * 40}ms` }}
      className={cn(
        'relative rounded-md transition-colors motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:fill-mode-both',
        "before:absolute before:inset-x-3 before:top-0 before:border-t before:border-quaternary before:content-[''] first:before:hidden",
        'hover:bg-secondary hover:before:opacity-0 [li:hover+&]:before:opacity-0',
        'data-[open]:bg-secondary data-[open]:before:opacity-0 [li[data-open]+&]:before:opacity-0',
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
            expanded && 'font-semibold',
          )}
        >
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
          <FitSection idea={idea} lens={lens} />
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
 * The verdict as its mark alone, in the pill's colours — undecided teal too,
 * which used to have no mark. The word is the mark's name and its tooltip.
 */
function VerdictMark({ verdict }: { verdict: VerdictKey }) {
  const { t } = useTranslation()
  const label = t(`assetInsights.ideas.pile.${verdict}`)
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        'flex h-6 items-center',
        verdict === 'waiting' && 'text-accent',
        verdict === 'yes' && 'text-positive',
        (verdict === 'later' || verdict === 'no') &&
          'text-secondary-foreground',
      )}
    >
      <HugeiconsIcon
        icon={VERDICT_ICON[verdict]}
        size={16}
        strokeWidth={1.8}
        aria-hidden
      />
    </span>
  )
}

/** A section of the opened row: a pale rule, then a small heading. */
function Part({
  heading,
  aside,
  children,
}: {
  heading: string
  aside?: string | null
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-quaternary pt-3">
      <h4 className="text-xs font-semibold text-foreground">
        {heading}
        {aside && (
          <span className="font-normal text-secondary-foreground">
            {' · '}
            {aside}
          </span>
        )}
      </h4>
      {children}
    </div>
  )
}

type CriterionKey = (typeof FIT_CRITERIA)[keyof typeof FIT_CRITERIA][number]
const KNOWN_CRITERIA = new Set<string>([
  ...FIT_CRITERIA.campaign,
  ...FIT_CRITERIA.workspace,
])
const KNOWN_CAPS = ['guardrail_breach', 'off_brief', 'unsupported'] as const
type CapKey = (typeof KNOWN_CAPS)[number]

/** "zeitgeist_fit" → "Zeitgeist fit", for a criterion this build predates. */
function humanise(key: string): string {
  const words = key.replace(/_/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/**
 * Why the idea scores what it does (CON-385): each criterion, heaviest first,
 * with its rating — a figure in a disc and five segments, both in the fit
 * track's own colour at that rating — and the model's reason. A cap overrides
 * every rating, so it is said above them. An unscored idea has nothing to
 * explain and no section.
 */
function FitSection({ idea, lens }: { idea: Idea; lens: AssetAnalysis }) {
  const { t } = useTranslation()
  const breakdown = idea.fitBreakdown
  if (idea.fitScore == null || !breakdown) return null
  const rows = fitRows(breakdown)
  if (rows.length === 0) return null
  const caps = (breakdown.caps ?? []).filter((cap): cap is CapKey =>
    (KNOWN_CAPS as readonly string[]).includes(cap),
  )
  return (
    <Part
      heading={t('assetInsights.ideaFit.heading', { score: idea.fitScore })}
      aside={scoredFor(t, breakdown, lens)}
    >
      {caps.map((cap) => (
        <p key={cap} className="text-xs text-foreground">
          {t(`assetInsights.ideaFit.cap.${cap}`)}
        </p>
      ))}
      <ul className="flex flex-col gap-1.5">
        {rows.map((row) => {
          const name = KNOWN_CRITERIA.has(row.key)
            ? t(`assetInsights.ideaFit.criterion.${row.key as CriterionKey}`)
            : humanise(row.key)
          const tone = `color-mix(in oklab, var(--fit-high) ${fitLevelStrength(row.level)}%, var(--fit-low))`
          return (
            <li
              key={row.key}
              className="grid grid-cols-[8.5rem_auto_minmax(0,1fr)] items-start gap-x-3 text-[12.5px]/[18px]"
            >
              <span className="text-foreground">{name}</span>
              <span
                role="img"
                aria-label={t('assetInsights.ideaFit.rating', {
                  criterion: name,
                  level: row.level,
                })}
                className="flex items-center gap-3"
              >
                <span
                  aria-hidden
                  className="-mt-px flex size-5 items-center justify-center rounded-full font-mono text-[11px] font-semibold text-secondary-foreground"
                  style={{ background: tone }}
                >
                  {row.level}
                </span>
                <span aria-hidden className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((step) => (
                    <span
                      key={step}
                      className={cn(
                        'h-1.5 w-2.5 rounded-[2px]',
                        step > row.level && 'bg-quaternary',
                      )}
                      style={
                        step <= row.level ? { background: tone } : undefined
                      }
                    />
                  ))}
                </span>
              </span>
              <span className="text-secondary-foreground">
                {row.hint && (
                  <span className="mr-1 inline-block rounded-full bg-border px-1.5 text-[11.5px]/[18px] font-medium text-foreground">
                    {row.hint}
                  </span>
                )}
                {row.why}
              </span>
            </li>
          )
        })}
      </ul>
    </Part>
  )
}

/**
 * Which reading the score is for. Usually the one on screen; an idea filed
 * into another campaign keeps the score it was given, and says so rather than
 * passing it off as this reading's.
 */
function scoredFor(
  t: TFunction,
  breakdown: FitBreakdown,
  lens: AssetAnalysis,
): string {
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

/**
 * The answer, last — after everything that informs it. Yes / Not now / No as
 * one joined button group on the inbox's own rules (`VerdictControls`): Yes
 * and No are one click and no confirmation, both being reversible; Not now
 * asks when, because a postponement that names no day is an archive. Choosing
 * another button changes the answer; the line under the group says when it
 * was given and offers the way back.
 */
function Answer({
  idea,
  lens,
  now,
}: {
  idea: Idea
  lens: AssetAnalysis
  now: Date
}) {
  const { t, i18n } = useTranslation()
  // While an answer is on its way the controls hold still: a second one
  // racing it could land first (see `useAnswerIdea`).
  const { answer, pending } = useAnswerIdea(lens.asset_id, idea.id)
  // A woken postponement is a question again, so nothing is held.
  const current = isWaiting(idea, now) ? null : idea.verdict
  const decide = (verdict: IdeaVerdict, remindAt: string | null = null) =>
    answer(verdict, remindAt)
  const day = (iso: string | null) =>
    iso
      ? (formatDate(iso, { day: 'numeric', month: 'short' }, i18n.language) ??
        '')
      : ''

  const record =
    current === 'later'
      ? t('ideas.record.returns', { at: day(idea.remindAt) })
      : current
        ? t('ideas.record.decided', {
            verdict: t(VERDICTS[current].labelKey),
            at: day(idea.decidedAt),
          })
        : null

  const YesIcon = VERDICTS.yes.icon
  const LaterIcon = VERDICTS.later.icon
  const NoIcon = VERDICTS.no.icon

  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-t border-quaternary pt-3">
      <div
        role="group"
        aria-label={t('assetInsights.ideas.answer')}
        aria-busy={pending || undefined}
        className="flex [&>*:disabled]:opacity-60 [&>*]:rounded-none [&>*+*]:-ml-px [&>*:first-child]:rounded-l-md [&>*:last-child]:rounded-r-md [&>[data-active=true]]:z-10"
      >
        <Button
          variant="outline"
          size="sm"
          active={current === 'yes'}
          aria-pressed={current === 'yes'}
          disabled={pending}
          onClick={() => decide('yes')}
        >
          <YesIcon className={VERDICTS.yes.tone} />
          {t(VERDICTS.yes.actionKey)}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              active={current === 'later'}
              aria-pressed={current === 'later'}
              disabled={pending}
            >
              <LaterIcon className={VERDICTS.later.tone} />
              {t(VERDICTS.later.actionKey)}
              <CaretDownIcon className="size-3 text-secondary-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={4}>
            {POSTPONE_HORIZONS.map((horizon) => (
              <DropdownMenuItem
                key={horizon}
                onSelect={() =>
                  decide('later', postponeUntil(new Date(), horizon))
                }
              >
                {t(HORIZON_KEYS[horizon])}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="outline"
          size="sm"
          active={current === 'no'}
          aria-pressed={current === 'no'}
          disabled={pending}
          onClick={() => decide('no')}
        >
          <NoIcon className={VERDICTS.no.tone} />
          {t(VERDICTS.no.actionKey)}
        </Button>
      </div>
      <span className="ml-auto">
        <InboxLink lens={lens} label={t('assetInsights.ideas.open')} />
      </span>
      {record && (
        <p className="order-last basis-full text-xs text-secondary-foreground">
          {record}
          {' · '}
          <button
            type="button"
            disabled={pending}
            onClick={() => answer(null)}
            className="cursor-pointer underline disabled:cursor-default disabled:opacity-60 decoration-quinary underline-offset-3 hover:decoration-foreground"
          >
            {t('ideas.action.undecide')}
          </button>
        </p>
      )}
    </div>
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
