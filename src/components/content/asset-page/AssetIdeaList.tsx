import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { useTranslation } from 'react-i18next'
import { LightbulbIcon } from '@phosphor-icons/react'
import { IdeaRow } from '@/components/ideas/IdeaRow'
import { CARD_LIST } from '@/components/page-primitives/listCards'
import { useAnswerIdea } from '@/hooks/useAssetAnalyses'
import { useIdeaDistill } from '@/hooks/useIdeaDistill'
import { useIdeaClock } from '@/hooks/useIdeaClock'
import { cn } from '@/lib'
import { VERDICT_ICON } from '@/components/content/verdictIcons'
import { VERDICT_ORDER, type VerdictKey } from '@/lib/assetList'
import { byFit } from '@/lib/ideaFit'
import { countIdeas, isWaiting, type Idea } from '@/lib/ideas'
import { ideaFromWire } from '@/services/api/ideas'
import type { AssetAnalysis } from '@/types/assetAnalysis'
import { DistillMoreIdeas } from './DistillMoreIdeas'

/**
 * The ideas one lens distilled (CON-364), as the Ideas list's cards
 * (`ideas/IdeaRow`, design/ideas-cards): best fit first, each its own card
 * with the fit ring, the title, the angle in two lines, the places it cites
 * and the three answers always on it — so an idea looks the same here as in
 * Ideas.
 *
 * A card opens in place to the whole of it: the angle, why it fits, why it
 * scores what it does (CON-385's breakdown), where in the source it comes
 * from — as chips that play or open in place — and the answer's record.
 * **Triage happens here as well as in Ideas**, on the same rules, so an idea
 * can be answered beside the source it came from. An idea someone said no to is left out unless the No
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
        // Under the new-ideas chip no pile shows as chosen, so a click on
        // the one the address still names chooses it rather than clearing it.
        verdict: next === pile && !onlyFresh ? undefined : next,
      }),
      replace: true,
    })
  }
  const forCampaign = lens.campaign_id !== null && lens.campaign_name

  return (
    <section className="flex flex-col gap-3">
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
        // Every idea, not the first five: this list is what the page is for,
        // and a fold only hid the ones a reader came to compare.
        <ul className={CARD_LIST}>
          {ideas.map((idea) => (
            <AssetIdeaCard
              key={idea.id}
              idea={idea}
              lens={lens}
              now={now}
              expanded={open === idea.id}
              fresh={isFresh(idea)}
              onToggle={() => setOpen(open === idea.id ? null : idea.id)}
            />
          ))}
        </ul>
      )}
      {ideas.length > 0 && (
        <p className="text-xs/4 text-secondary-foreground">
          {forCampaign
            ? t('assetInsights.ideas.waitingFor', {
                campaign: lens.campaign_name,
              })
            : t('assetInsights.ideas.waiting')}
          {spreadsheet && ` ${t('assetInsights.sheet.footnote')}`}
        </p>
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
            'flex h-7 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-control tabular-nums transition-colors',
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
        'flex h-7 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-control font-semibold tabular-nums text-accent transition-colors',
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
 * One idea, as the Ideas list draws it — answered here through the asset's
 * own cache (`useAnswerIdea`), so the piles above move with it.
 */
function AssetIdeaCard({
  idea,
  lens,
  now,
  expanded,
  fresh,
  onToggle,
}: {
  idea: Idea
  lens: AssetAnalysis
  now: Date
  expanded: boolean
  fresh: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const { answer } = useAnswerIdea(lens.asset_id, idea.id)
  return (
    <IdeaRow
      idea={idea}
      now={now}
      expanded={expanded}
      onToggle={onToggle}
      onDecide={(verdict, remindAt) => answer(verdict, remindAt)}
      onUndecide={() => answer(null)}
      // An analysed idea's words are the analysis's; it is filed from Ideas.
      onEdit={noop}
      onDelete={noop}
      showCampaign={false}
      fresh={fresh}
      atSource={{
        link: <InboxLink lens={lens} label={t('assetInsights.ideas.open')} />,
        reading: {
          campaignId: lens.campaign_id,
          campaignName: lens.campaign_name,
        },
      }}
    />
  )
}

const noop = () => {}

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
