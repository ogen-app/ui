import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { useTranslation } from 'react-i18next'
import {
  CaretDownIcon,
  CaretRightIcon,
  CheckIcon,
  ClockIcon,
  LightbulbIcon,
} from '@phosphor-icons/react'
import { VERDICT_ICON } from '@/components/content/verdictIcons'
import { cn } from '@/lib'
import { mergePageRefs, parseIdeaNote, refLabel } from '@/lib/assetAnalysis'
import { VERDICT_ORDER, type VerdictKey } from '@/lib/assetList'
import { countIdeas, isWaiting, type Idea } from '@/lib/ideas'
import { ideaFromWire } from '@/services/api/ideas'
import type { AssetAnalysis } from '@/types/assetAnalysis'
import { SourceChip } from './SourceChip'

/** How many ideas show before "Show N more". */
const FIRST_IDEAS = 5

/**
 * The ideas one lens distilled (CON-364), as the Ideas inbox holds them.
 *
 * Read-only on purpose: triage lives in the inbox, and turning an idea into a
 * post is its own piece of work (CON-365). A row opens in place to show the
 * angle in full, why it fits and where in the source it comes from, with the
 * way to the inbox under it. An idea someone has already said no to is left
 * out — it was answered, and this list is what is still worth making.
 *
 * The piles above the list (CON-370) narrow it to one verdict — "No"
 * included, the one way to see those again. `?verdict=` picks one, which is
 * where the Assets list's verdict pill sends a click; choosing it again shows
 * everything still worth making.
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
  const all = useMemo(() => lens.ideas.map(ideaFromWire), [lens.ideas])
  const counts = useMemo(() => countIdeas(all, new Date()), [all])
  // A pile this reading has none of (a link from another lens) shows them all.
  const pile = asked && counts[asked] > 0 ? asked : undefined
  const ideas = useMemo(() => {
    const now = new Date()
    if (!pile) return all.filter((idea) => idea.verdict !== 'no')
    return all.filter((idea) =>
      pile === 'waiting'
        ? isWaiting(idea, now)
        : idea.verdict === pile && !isWaiting(idea, now),
    )
  }, [all, pile])
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

  // The heading says what the ideas are and how many, in the page's
  // second-largest type: they are what the page is for (CON-369).
  const forCampaign = lens.campaign_id !== null && lens.campaign_name
  const heading =
    ideas.length === 0
      ? t('assetInsights.ideas.heading')
      : forCampaign
        ? t('assetInsights.ideas.countFor', {
            count: ideas.length,
            campaign: lens.campaign_name,
          })
        : t('assetInsights.ideas.count', { count: ideas.length })

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-[22px] leading-8 font-semibold text-foreground">
            {heading}
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
          <ul className="flex flex-col gap-3">
            {shown.map((idea, index) => (
              <IdeaRow
                key={idea.id}
                index={index}
                idea={idea}
                lens={lens}
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

function IdeaRow({
  index,
  idea,
  lens,
  expanded,
  onToggle,
}: {
  /** Its place in the list — rows arrive one after another, not at once. */
  index: number
  idea: Idea
  lens: AssetAnalysis
  expanded: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const { angle, rationale, sources: cited } = parseIdeaNote(idea.note)
  // Pages sorted and merged ("pp. 55–59", not "pp. 57–59, pp. 55–57").
  const sources = mergePageRefs(cited)
  const Caret = expanded ? CaretDownIcon : CaretRightIcon
  return (
    <li
      style={{ animationDelay: `${Math.min(index, 9) * 40}ms` }}
      className={cn(
        'rounded-md border border-quaternary transition-colors motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:fill-mode-both',
        expanded ? 'bg-secondary' : 'hover:bg-secondary',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left"
      >
        <VerdictMark idea={idea} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">
            {idea.title}
          </span>
          {angle && !expanded && (
            <span className="line-clamp-2 text-sm text-secondary-foreground">
              {angle}
            </span>
          )}
        </span>
        {/* Where it comes from, as plain text — not chips that look like
            controls inside a control. The playable and citable chips are in
            the opened row. */}
        {sources.length > 0 && (
          <span
            title={cited.join(', ')}
            className="hidden max-w-[40%] shrink-0 truncate pt-0.5 text-xs tabular-nums text-secondary-foreground sm:block"
          >
            {sources.slice(0, 2).map(refLabel).join(' · ')}
          </span>
        )}
        <Caret className="mt-0.5 size-4 shrink-0 text-secondary-foreground" />
      </button>
      {expanded && (
        <div className="flex flex-col gap-3 px-4 pb-4 pl-11">
          {angle && (
            <p className="text-sm leading-6 text-foreground">{angle}</p>
          )}
          {rationale && (
            <p className="whitespace-pre-line text-sm leading-6 text-secondary-foreground">
              {rationale}
            </p>
          )}
          {sources.length > 0 && (
            <span className="flex flex-wrap gap-1.5">
              {sources.map((s) => (
                <SourceChip key={s} label={s} citedBy={idea.title} />
              ))}
            </span>
          )}
          <p className="border-t border-quaternary pt-3 text-xs text-secondary-foreground">
            {t(`assetInsights.ideas.where.${idea.verdict ?? 'inbox'}`)} ·{' '}
            <InboxLink lens={lens} label={t('assetInsights.ideas.open')} />
          </p>
        </div>
      )}
    </li>
  )
}

function VerdictMark({ idea }: { idea: Idea }) {
  const { t } = useTranslation()
  const label = t(`assetInsights.ideas.verdict.${idea.verdict ?? 'inbox'}`)
  const className = 'mt-0.5 size-4 shrink-0'
  switch (idea.verdict) {
    case 'yes':
      return (
        <CheckIcon
          weight="bold"
          className={cn(className, 'text-accent')}
          aria-label={label}
        />
      )
    case 'later':
      return (
        <ClockIcon
          className={cn(className, 'text-warning')}
          aria-label={label}
        />
      )
    default:
      // Untriaged is the normal state of a fresh idea, not something to
      // tick: no mark, only the name for screen readers. The space stays so
      // titles line up with the marked rows.
      return (
        <span className={className}>
          <span className="sr-only">{label}</span>
        </span>
      )
  }
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
